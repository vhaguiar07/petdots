import type { OrderStatus } from '@petdots/contracts';
import { SERVICE_FEE_CENTS } from '@petdots/domain';

import { InvalidOrderTransitionError } from './invalid-order-transition.error.js';
import {
  acceptOrder,
  ALLOWED_TRANSITIONS,
  buildOrder,
  type BuildOrderInput,
  canTransition,
  cancelOrderByStore,
  cancelOrderByTutor,
  deliverOrder,
  dispatchOrder,
  expireAcceptance,
  markItemUnavailable,
  type Order,
  type OrderItem,
  rejectOrder,
} from './order.js';

const PLACED_AT = new Date('2026-09-14T13:00:00.000Z');
const DEADLINE = new Date('2026-09-14T13:15:00.000Z');
const NOW = new Date('2026-09-14T13:20:00.000Z');

const ALL_STATUSES: OrderStatus[] = [
  'PLACED',
  'ACCEPTED',
  'DISPATCHED',
  'DELIVERED',
  'REJECTED',
  'CANCELLED',
];

const item = (overrides: Partial<OrderItem> = {}): OrderItem => ({
  id: 'item-1',
  productId: 'product-1',
  offerId: 'offer-1',
  productNameSnapshot: 'Golden Ração Cães Adultos',
  productVariantSnapshot: '15 kg',
  categorySnapshot: 'FOOD_PREMIUM',
  unitPriceCents: 3790,
  quantity: 2,
  commissionRateBpsSnapshot: 500,
  commissionAmountCents: 379,
  fulfillment: 'FULFILLED',
  substitutedByProductId: null,
  ...overrides,
});

const input = (overrides: Partial<BuildOrderInput> = {}): BuildOrderInput => ({
  id: 'order-1',
  code: 'AB2C34',
  tutorId: 'tutor-1',
  storeId: 'store-b',
  acquisitionChannel: 'PLATFORM',
  contactName: 'Victor',
  contactPhone: '+5521999990001',
  deliveryAddress: {
    street: 'Rua Dias da Cruz',
    number: '100',
    complement: null,
    neighborhood: 'Méier',
    postalCode: '20720000',
    reference: null,
  },
  items: [item()],
  deliveryFeeCents: 490,
  serviceFeeCents: SERVICE_FEE_CENTS,
  placedAt: PLACED_AT,
  acceptanceDeadlineAt: DEADLINE,
  ...overrides,
});

/** An order forced into a state, for walking the transition table. */
const inStatus = (status: OrderStatus): Order => ({ ...buildOrder(input()), status });

describe('ALLOWED_TRANSITIONS', () => {
  it('names every status exactly once', () => {
    expect(Object.keys(ALLOWED_TRANSITIONS).sort()).toEqual([...ALL_STATUSES].sort());
  });

  it('🔴 leaves the three terminal states with no way out', () => {
    expect(ALLOWED_TRANSITIONS.DELIVERED).toEqual([]);
    expect(ALLOWED_TRANSITIONS.REJECTED).toEqual([]);
    expect(ALLOWED_TRANSITIONS.CANCELLED).toEqual([]);
  });

  it('does not name the pre-payment state yet — that is pd-17 (ADR-0017, P3)', () => {
    expect(Object.keys(ALLOWED_TRANSITIONS)).not.toContain('PENDING_PAYMENT');
  });

  it('🔴 walks the whole table: every pair outside it is refused', () => {
    for (const from of ALL_STATUSES) {
      for (const to of ALL_STATUSES) {
        const allowed = ALLOWED_TRANSITIONS[from].includes(to);

        expect({ from, to, allowed: canTransition(from, to) }).toEqual({ from, to, allowed });
      }
    }
  });
});

describe('buildOrder', () => {
  it('🔴 total is items plus delivery plus service', () => {
    const order = buildOrder(input());

    expect(order.itemsTotalCents).toBe(7580);
    expect(order.totalCents).toBe(7580 + 490 + 199);
    expect(order.commissionTotalCents).toBe(379);
  });

  it('sums the commission of every line', () => {
    const order = buildOrder(
      input({
        items: [
          item(),
          item({ id: 'item-2', unitPriceCents: 1690, quantity: 1, commissionAmountCents: 135 }),
        ],
      }),
    );

    expect(order.commissionTotalCents).toBe(514);
    expect(order.itemsTotalCents).toBe(7580 + 1690);
  });

  it('is born PLACED, with no timestamp of anything that has not happened', () => {
    const order = buildOrder(input());

    expect(order.status).toBe('PLACED');
    expect(order.placedAt).toEqual(PLACED_AT);
    expect(order.acceptanceDeadlineAt).toEqual(DEADLINE);
    expect(order.acceptedAt).toBeNull();
    expect(order.rejectedAt).toBeNull();
    expect(order.cancelledAt).toBeNull();
    expect(order.rejectionReason).toBeNull();
  });

  it('refuses an order with no item', () => {
    expect(() => buildOrder(input({ items: [] }))).toThrow(InvalidOrderTransitionError);
  });

  it('refuses a line of zero units', () => {
    expect(() => buildOrder(input({ items: [item({ quantity: 0 })] }))).toThrow();
  });

  it('refuses a line priced at zero', () => {
    expect(() => buildOrder(input({ items: [item({ unitPriceCents: 0 })] }))).toThrow();
  });

  it('🔴 a store-referred customer pays zero commission, whatever the snapshot said', () => {
    const order = buildOrder(input({ acquisitionChannel: 'STORE_REFERRAL' }));

    expect(order.commissionTotalCents).toBe(0);
    expect(order.items[0]?.commissionAmountCents).toBe(0);
    expect(order.items[0]?.commissionRateBpsSnapshot).toBe(0);
    // And the customer still pays the same: the commission is ours, not theirs.
    expect(order.totalCents).toBe(7580 + 490 + 199);
  });

  it('keeps the snapshot of what was bought', () => {
    const order = buildOrder(input());

    expect(order.items[0]?.productNameSnapshot).toBe('Golden Ração Cães Adultos');
    expect(order.items[0]?.productVariantSnapshot).toBe('15 kg');
    expect(order.items[0]?.categorySnapshot).toBe('FOOD_PREMIUM');
  });
});

describe('acceptOrder', () => {
  it('moves PLACED to ACCEPTED and owes nothing back', () => {
    const exit = acceptOrder(inStatus('PLACED'), NOW);

    expect(exit.order.status).toBe('ACCEPTED');
    expect(exit.order.acceptedAt).toEqual(NOW);
    expect(exit.refund).toBeNull();
  });

  it('refuses from every other state', () => {
    for (const status of ALL_STATUSES.filter((it) => it !== 'PLACED')) {
      expect(() => acceptOrder(inStatus(status), NOW)).toThrow(InvalidOrderTransitionError);
    }
  });
});

describe('rejectOrder', () => {
  it('🔴 refunds everything, fees included, and says the store refused', () => {
    const order = inStatus('PLACED');
    const exit = rejectOrder(order, NOW);

    expect(exit.order.status).toBe('REJECTED');
    expect(exit.order.rejectionReason).toBe('STORE_REJECTED');
    expect(exit.refund).toEqual({
      reason: 'STORE_REJECTED',
      amountCents: order.totalCents,
      orderItemId: null,
    });
  });

  it('refuses from every other state', () => {
    for (const status of ALL_STATUSES.filter((it) => it !== 'PLACED')) {
      expect(() => rejectOrder(inStatus(status), NOW)).toThrow(InvalidOrderTransitionError);
    }
  });
});

describe('expireAcceptance', () => {
  it('🔴 tells the expiry apart from a refusal, and refunds the whole order', () => {
    const order = inStatus('PLACED');
    const exit = expireAcceptance(order, NOW);

    expect(exit.order.status).toBe('REJECTED');
    expect(exit.order.rejectionReason).toBe('ACCEPTANCE_EXPIRED');
    expect(exit.refund).toEqual({
      reason: 'ACCEPTANCE_EXPIRED',
      amountCents: order.totalCents,
      orderItemId: null,
    });
  });

  it('🔴 refuses to run before the deadline', () => {
    const beforeDeadline = new Date(DEADLINE.getTime() - 1);

    expect(() => expireAcceptance(inStatus('PLACED'), beforeDeadline)).toThrow(
      InvalidOrderTransitionError,
    );
  });

  it('runs exactly at the deadline', () => {
    expect(expireAcceptance(inStatus('PLACED'), DEADLINE).order.status).toBe('REJECTED');
  });

  it('refuses an order that already moved on', () => {
    for (const status of ALL_STATUSES.filter((it) => it !== 'PLACED')) {
      expect(() => expireAcceptance(inStatus(status), NOW)).toThrow(InvalidOrderTransitionError);
    }
  });
});

describe('dispatchOrder and deliverOrder', () => {
  it('walk ACCEPTED → DISPATCHED → DELIVERED, owing nothing', () => {
    const dispatched = dispatchOrder(inStatus('ACCEPTED'), NOW);
    expect(dispatched.order.status).toBe('DISPATCHED');
    expect(dispatched.refund).toBeNull();

    const delivered = deliverOrder(dispatched.order, NOW);
    expect(delivered.order.status).toBe('DELIVERED');
    expect(delivered.order.deliveredAt).toEqual(NOW);
    expect(delivered.refund).toBeNull();
  });

  it('cannot skip the dispatch', () => {
    expect(() => deliverOrder(inStatus('ACCEPTED'), NOW)).toThrow(InvalidOrderTransitionError);
  });

  it('cannot dispatch what was not accepted', () => {
    expect(() => dispatchOrder(inStatus('PLACED'), NOW)).toThrow(InvalidOrderTransitionError);
  });
});

describe('cancelOrderByTutor', () => {
  it('🔴 refunds the whole order, fees included', () => {
    const order = inStatus('PLACED');
    const exit = cancelOrderByTutor(order, NOW);

    expect(exit.order.status).toBe('CANCELLED');
    expect(exit.order.cancelledAt).toEqual(NOW);
    expect(exit.refund).toEqual({
      reason: 'TUTOR_CANCELLED',
      amountCents: order.totalCents,
      orderItemId: null,
    });
  });

  it('🔴 refuses after the store accepted — from there it is the store that cancels', () => {
    expect(() => cancelOrderByTutor(inStatus('ACCEPTED'), NOW)).toThrow(
      InvalidOrderTransitionError,
    );
  });

  it('refuses on a terminal order — cancelling twice is not idempotent, it is wrong', () => {
    for (const status of ['DELIVERED', 'REJECTED', 'CANCELLED', 'DISPATCHED'] as OrderStatus[]) {
      expect(() => cancelOrderByTutor(inStatus(status), NOW)).toThrow(InvalidOrderTransitionError);
    }
  });
});

describe('cancelOrderByStore', () => {
  it('cancels an accepted order with a reason, refunding everything', () => {
    const order = inStatus('ACCEPTED');
    const exit = cancelOrderByStore(order, NOW, 'produto avariado');

    expect(exit.order.status).toBe('CANCELLED');
    expect(exit.order.cancellationReason).toBe('produto avariado');
    expect(exit.refund?.reason).toBe('STORE_CANCELLED');
    expect(exit.refund?.amountCents).toBe(order.totalCents);
  });

  it('requires a reason — this is the side that has something to explain', () => {
    expect(() => cancelOrderByStore(inStatus('ACCEPTED'), NOW, '   ')).toThrow(
      InvalidOrderTransitionError,
    );
  });

  it('truncates an over-long reason to what the column holds', () => {
    const exit = cancelOrderByStore(inStatus('ACCEPTED'), NOW, 'x'.repeat(500));

    expect(exit.order.cancellationReason).toHaveLength(200);
  });

  it('refuses before the acceptance — there the tutor cancels', () => {
    expect(() => cancelOrderByStore(inStatus('PLACED'), NOW, 'motivo')).toThrow(
      InvalidOrderTransitionError,
    );
  });

  it('refuses after the dispatch — ADR-0014 C4 says nobody cancels', () => {
    expect(() => cancelOrderByStore(inStatus('DISPATCHED'), NOW, 'motivo')).toThrow(
      InvalidOrderTransitionError,
    );
  });
});

describe('markItemUnavailable', () => {
  const twoLines = (): Order => ({
    ...buildOrder(
      input({
        items: [
          item(),
          item({ id: 'item-2', unitPriceCents: 1690, quantity: 1, commissionAmountCents: 135 }),
        ],
      }),
    ),
    status: 'ACCEPTED',
  });

  it('🔴 refunds only that line — the delivery still happens and the service was rendered', () => {
    const exit = markItemUnavailable(twoLines(), 'item-2', NOW);

    expect(exit.order.status).toBe('ACCEPTED');
    expect(exit.refund).toEqual({
      reason: 'ITEM_UNAVAILABLE',
      amountCents: 1690,
      orderItemId: 'item-2',
    });
    // Fees are untouched, which is ADR-0014 C6 — the rule it records as its
    // most contestable, reversible on the first real complaint of proportion.
    expect(exit.refund?.amountCents).toBeLessThan(exit.order.totalCents);
  });

  it('🔴 never edits the snapshot — only the fulfillment of the line moves', () => {
    const before = twoLines();
    const exit = markItemUnavailable(before, 'item-2', NOW);
    const line = exit.order.items.find((it) => it.id === 'item-2');

    expect(line?.fulfillment).toBe('UNAVAILABLE');
    expect(line?.unitPriceCents).toBe(1690);
    expect(line?.productNameSnapshot).toBe(before.items[1]?.productNameSnapshot);
    expect(exit.order.itemsTotalCents).toBe(before.itemsTotalCents);
    expect(exit.order.totalCents).toBe(before.totalCents);
  });

  it('leaves the other lines alone', () => {
    const exit = markItemUnavailable(twoLines(), 'item-2', NOW);

    expect(exit.order.items.find((it) => it.id === 'item-1')?.fulfillment).toBe('FULFILLED');
  });

  it('🔴 when the last line goes, the order is cancelled with a total refund', () => {
    const order = twoLines();
    const first = markItemUnavailable(order, 'item-2', NOW);
    const second = markItemUnavailable(first.order, 'item-1', NOW);

    expect(second.order.status).toBe('CANCELLED');
    expect(second.order.cancellationReason).toBe('all items unavailable');
    // Everything back now, fees included: there is no delivery left to pay for.
    expect(second.refund).toEqual({
      reason: 'ITEM_UNAVAILABLE',
      amountCents: order.totalCents,
      orderItemId: null,
    });
  });

  it('a single-line order cancels on the first mark', () => {
    const exit = markItemUnavailable({ ...buildOrder(input()), status: 'ACCEPTED' }, 'item-1', NOW);

    expect(exit.order.status).toBe('CANCELLED');
    expect(exit.refund?.amountCents).toBe(exit.order.totalCents);
  });

  it('refuses a line that is already unavailable — no second refund for the same item', () => {
    const first = markItemUnavailable(twoLines(), 'item-2', NOW);

    expect(() => markItemUnavailable(first.order, 'item-2', NOW)).toThrow(
      InvalidOrderTransitionError,
    );
  });

  it('refuses a line that is not in the order', () => {
    expect(() => markItemUnavailable(twoLines(), 'item-999', NOW)).toThrow(
      InvalidOrderTransitionError,
    );
  });

  it('🔴 is allowed only from ACCEPTED — in PLACED the store accepts or refuses', () => {
    for (const status of ALL_STATUSES.filter((it) => it !== 'ACCEPTED')) {
      expect(() => markItemUnavailable({ ...twoLines(), status }, 'item-2', NOW)).toThrow(
        InvalidOrderTransitionError,
      );
    }
  });
});

describe('immutability', () => {
  it('🔴 a transition never mutates the order it was given', () => {
    const order = inStatus('PLACED');
    const snapshot = JSON.stringify(order);

    acceptOrder(order, NOW);
    rejectOrder(order, NOW);
    cancelOrderByTutor(order, NOW);

    expect(JSON.stringify(order)).toBe(snapshot);
  });
});
