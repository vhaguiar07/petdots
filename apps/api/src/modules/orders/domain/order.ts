import type {
  AcquisitionChannel,
  ItemFulfillment,
  OrderRejectionReason,
  OrderStatus,
  ProductCategory,
  RefundReason,
} from '@petdots/contracts';
import { lineTotalCents, orderTotals } from '@petdots/domain';

import { InvalidOrderTransitionError } from './invalid-order-transition.error.js';

/** The address frozen onto the order (SECURITY §LGPD: the minimum to deliver). */
export interface DeliveryAddressSnapshot {
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  postalCode: string;
  reference: string | null;
}

/** One line, with everything about it frozen at the moment of the purchase. */
export interface OrderItem {
  id: string;
  productId: string;
  offerId: string;
  productNameSnapshot: string;
  productVariantSnapshot: string;
  categorySnapshot: ProductCategory;
  unitPriceCents: number;
  quantity: number;
  commissionRateBpsSnapshot: number;
  commissionAmountCents: number;
  fulfillment: ItemFulfillment;
  substitutedByProductId: string | null;
}

export interface Order {
  id: string;
  code: string;
  tutorId: string;
  storeId: string;
  status: OrderStatus;
  acquisitionChannel: AcquisitionChannel;
  contactName: string;
  contactPhone: string;
  deliveryAddress: DeliveryAddressSnapshot;
  items: OrderItem[];
  itemsTotalCents: number;
  deliveryFeeCents: number;
  serviceFeeCents: number;
  totalCents: number;
  commissionTotalCents: number;
  placedAt: Date;
  acceptanceDeadlineAt: Date;
  acceptedAt: Date | null;
  dispatchedAt: Date | null;
  deliveredAt: Date | null;
  cancelledAt: Date | null;
  rejectedAt: Date | null;
  rejectionReason: OrderRejectionReason | null;
  cancellationReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** The money one exit sends back, alongside the order it left behind. */
export interface OrderRefund {
  reason: RefundReason;
  amountCents: number;
  /** Null on a total refund; the line, on a partial one. */
  orderItemId: string | null;
}

/**
 * What a transition produces: the new order, and the refund the exit owes.
 *
 * 🔴 Returning them **together** is what makes "toda saída que não é entrega
 * termina em `Refund`" (ADR-0014) a property of the function that decides the
 * exit, rather than a convention the caller has to remember. There is no way to
 * get the new order without also being handed the money it owes.
 */
export interface OrderExit {
  order: Order;
  refund: OrderRefund | null;
}

/**
 * 🔴 The state machine, as **data** rather than as a chain of `if`s.
 *
 * Written this way for three reasons. A unit test can walk the whole table and
 * assert that everything outside it raises, which no set of scattered
 * conditionals allows. The pd-17 adds the pre-payment state with one entry and
 * one enum value instead of hunting for the checks. And "which moves exist" is
 * answerable by reading six lines.
 *
 * `DELIVERED`, `REJECTED` and `CANCELLED` have no outgoing move: **terminal is
 * immutable** (DOMAIN_MODEL §Raiz `Order`). The model named only the first and
 * the last; a refused order is terminal for the same reason — ADR-0014 gives
 * every exit a refund, not a way back.
 */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PLACED: ['ACCEPTED', 'REJECTED', 'CANCELLED'],
  ACCEPTED: ['DISPATCHED', 'CANCELLED'],
  DISPATCHED: ['DELIVERED'],
  DELIVERED: [],
  REJECTED: [],
  CANCELLED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransition(from, to)) {
    throw new InvalidOrderTransitionError(from, to);
  }
}

export interface BuildOrderInput {
  id: string;
  code: string;
  tutorId: string;
  storeId: string;
  acquisitionChannel: AcquisitionChannel;
  contactName: string;
  contactPhone: string;
  deliveryAddress: DeliveryAddressSnapshot;
  items: OrderItem[];
  deliveryFeeCents: number;
  serviceFeeCents: number;
  placedAt: Date;
  acceptanceDeadlineAt: Date;
}

/**
 * Builds an order that satisfies every construction invariant, or raises.
 *
 * The totals are **computed here**, never taken from the caller: a total that
 * arrives as input is a total somebody can get wrong, and the database `CHECK`
 * would then reject the write with an error nobody can read. Commission is
 * zeroed on `STORE_REFERRAL` a second time even though the rate resolution
 * already returns zero — the invariant belongs to the aggregate root
 * (DOMAIN_MODEL), and one of the two places is the one that will still be there
 * when the channel finally gets a producer.
 */
export function buildOrder(input: BuildOrderInput): Order {
  if (input.items.length === 0) {
    throw new InvalidOrderTransitionError('PLACED', 'PLACED');
  }

  const isReferral = input.acquisitionChannel === 'STORE_REFERRAL';
  const items = input.items.map((item) => ({
    ...item,
    commissionRateBpsSnapshot: isReferral ? 0 : item.commissionRateBpsSnapshot,
    commissionAmountCents: isReferral ? 0 : item.commissionAmountCents,
  }));

  const totals = orderTotals({
    lines: items.map((item) => ({
      unitPriceCents: item.unitPriceCents,
      quantity: item.quantity,
      commissionAmountCents: item.commissionAmountCents,
    })),
    deliveryFeeCents: input.deliveryFeeCents,
    serviceFeeCents: input.serviceFeeCents,
  });

  return {
    id: input.id,
    code: input.code,
    tutorId: input.tutorId,
    storeId: input.storeId,
    status: 'PLACED',
    acquisitionChannel: input.acquisitionChannel,
    contactName: input.contactName,
    contactPhone: input.contactPhone,
    deliveryAddress: input.deliveryAddress,
    items,
    itemsTotalCents: totals.itemsTotalCents,
    deliveryFeeCents: input.deliveryFeeCents,
    serviceFeeCents: input.serviceFeeCents,
    totalCents: totals.totalCents,
    commissionTotalCents: totals.commissionTotalCents,
    placedAt: input.placedAt,
    acceptanceDeadlineAt: input.acceptanceDeadlineAt,
    acceptedAt: null,
    dispatchedAt: null,
    deliveredAt: null,
    cancelledAt: null,
    rejectedAt: null,
    rejectionReason: null,
    cancellationReason: null,
    createdAt: input.placedAt,
    updatedAt: input.placedAt,
  };
}

/** The store takes the order. No money moves. */
export function acceptOrder(order: Order, now: Date): OrderExit {
  assertTransition(order.status, 'ACCEPTED');

  return { order: { ...order, status: 'ACCEPTED', acceptedAt: now, updatedAt: now }, refund: null };
}

/** The store says no. Everything goes back, fees included (ADR-0014 C6). */
export function rejectOrder(order: Order, now: Date): OrderExit {
  assertTransition(order.status, 'REJECTED');

  return {
    order: {
      ...order,
      status: 'REJECTED',
      rejectedAt: now,
      rejectionReason: 'STORE_REJECTED',
      updatedAt: now,
    },
    refund: { reason: 'STORE_REJECTED', amountCents: order.totalCents, orderItemId: null },
  };
}

/**
 * 🔴 Nobody answered in time.
 *
 * The reason is `ACCEPTANCE_EXPIRED` and not `STORE_REJECTED` because ADR-0014
 * C2 requires telling them apart: a shop that said no and a shop that never
 * looked are different facts, for the tutor reading the screen and for us
 * reading the pilot.
 *
 * It refuses to run before the deadline. The sweeper already filters on it in
 * SQL, so this is the second lock on the same door — and the one that holds if
 * somebody ever calls the use case with the wrong clock.
 */
export function expireAcceptance(order: Order, now: Date): OrderExit {
  assertTransition(order.status, 'REJECTED');

  if (now.getTime() < order.acceptanceDeadlineAt.getTime()) {
    throw new InvalidOrderTransitionError(order.status, 'REJECTED');
  }

  return {
    order: {
      ...order,
      status: 'REJECTED',
      rejectedAt: now,
      rejectionReason: 'ACCEPTANCE_EXPIRED',
      updatedAt: now,
    },
    refund: { reason: 'ACCEPTANCE_EXPIRED', amountCents: order.totalCents, orderItemId: null },
  };
}

/** It left the shop. */
export function dispatchOrder(order: Order, now: Date): OrderExit {
  assertTransition(order.status, 'DISPATCHED');

  return {
    order: { ...order, status: 'DISPATCHED', dispatchedAt: now, updatedAt: now },
    refund: null,
  };
}

/** It arrived — the only exit that owes nothing back. */
export function deliverOrder(order: Order, now: Date): OrderExit {
  assertTransition(order.status, 'DELIVERED');

  return {
    order: { ...order, status: 'DELIVERED', deliveredAt: now, updatedAt: now },
    refund: null,
  };
}

/**
 * The tutor changed their mind, before anyone separated anything.
 *
 * Only from `PLACED` — after the acceptance the shop has already spent work,
 * and a unilateral button would hand that cost to the side the pilot cannot
 * afford to lose (ADR-0014, C4). No reason is required: nobody owes an
 * explanation for cancelling something nobody has touched.
 */
export function cancelOrderByTutor(order: Order, now: Date): OrderExit {
  assertTransition(order.status, 'CANCELLED');

  if (order.status !== 'PLACED') {
    throw new InvalidOrderTransitionError(order.status, 'CANCELLED');
  }

  return {
    order: { ...order, status: 'CANCELLED', cancelledAt: now, updatedAt: now },
    refund: { reason: 'TUTOR_CANCELLED', amountCents: order.totalCents, orderItemId: null },
  };
}

/**
 * The store cancels after accepting — at the tutor's request, by telephone,
 * because there is no channel inside the order (ADR-0014, C4).
 *
 * A reason is required here and not for the tutor: this is the side that has
 * something to explain, and the text is what the support conversation will hang
 * off when it happens.
 */
export function cancelOrderByStore(order: Order, now: Date, reason: string): OrderExit {
  assertTransition(order.status, 'CANCELLED');

  if (order.status !== 'ACCEPTED') {
    throw new InvalidOrderTransitionError(order.status, 'CANCELLED');
  }

  if (!reason.trim()) {
    throw new InvalidOrderTransitionError(order.status, 'CANCELLED');
  }

  return {
    order: {
      ...order,
      status: 'CANCELLED',
      cancelledAt: now,
      cancellationReason: reason.trim().slice(0, 200),
      updatedAt: now,
    },
    refund: { reason: 'STORE_CANCELLED', amountCents: order.totalCents, orderItemId: null },
  };
}

/** When nothing is left to deliver, the order is cancelled (ADR-0014 C3). */
const ALL_ITEMS_UNAVAILABLE = 'all items unavailable';

/**
 * 🔴 One item is not on the shelf after all (ADR-0014, C3).
 *
 * Three things happen and the third is the subtle one:
 *
 * 1. the line's `fulfillment` becomes `UNAVAILABLE` — **the snapshot is never
 *    edited**, because the order is an accounting record of what was bought;
 * 2. a refund is born for that line only. Delivery and service fees stay: the
 *    delivery still happens and the service was rendered (C6). ⚠️ This is the
 *    most contestable rule of ADR-0014, reversible, with "primeira reclamação
 *    real de proporção" as its named trigger;
 * 3. if **nothing** is left, the order goes to `CANCELLED` with a **total**
 *    refund — fees included, because now there is no delivery to pay for.
 *
 * The reason on that total refund stays `ITEM_UNAVAILABLE` rather than becoming
 * `STORE_CANCELLED`: it says why the money is going back, and the cause is the
 * missing stock, not a decision to cancel.
 *
 * Allowed only from `ACCEPTED` — the shop accepts first and separates after,
 * which is the order of flow 1 and of journey J4. From `PLACED` the answer is
 * to accept or refuse, not to edit. Reversible in pd-16 with a real case.
 */
export function markItemUnavailable(order: Order, orderItemId: string, now: Date): OrderExit {
  if (order.status !== 'ACCEPTED') {
    throw new InvalidOrderTransitionError(order.status, 'ACCEPTED');
  }

  const target = order.items.find((item) => item.id === orderItemId);

  if (!target || target.fulfillment !== 'FULFILLED') {
    throw new InvalidOrderTransitionError(order.status, order.status);
  }

  const items: OrderItem[] = order.items.map((item) =>
    item.id === orderItemId ? { ...item, fulfillment: 'UNAVAILABLE' } : item,
  );

  const nothingLeft = !items.some((item) => item.fulfillment === 'FULFILLED');

  if (nothingLeft) {
    return {
      order: {
        ...order,
        items,
        status: 'CANCELLED',
        cancelledAt: now,
        cancellationReason: ALL_ITEMS_UNAVAILABLE,
        updatedAt: now,
      },
      refund: { reason: 'ITEM_UNAVAILABLE', amountCents: order.totalCents, orderItemId: null },
    };
  }

  return {
    order: { ...order, items, updatedAt: now },
    refund: {
      reason: 'ITEM_UNAVAILABLE',
      amountCents: lineTotalCents(target.unitPriceCents, target.quantity),
      orderItemId,
    },
  };
}
