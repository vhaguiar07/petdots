import type { Order as OrderContract, OrderQuote } from '@petdots/contracts';

import type { Order } from '../domain/order.js';
import type { PricedOrder } from './price-order.use-case.js';

/** The store summary the order and the quote both carry. */
export interface StoreSummaryOfOrder {
  id: string;
  slug: string;
  name: string;
  neighborhood: string;
}

/**
 * Domain order → the contract the tutor receives, **field by field**.
 *
 * 🔴 Never a spread, for the reason the session issuer and the tutor profile
 * give (ADR-0011, C6): a spread would carry `tutorId`, `commissionTotalCents`
 * and every line's `commissionRateBpsSnapshot` into the response the first time
 * the shape changed. The take rate is between the platform and the store
 * (`SECURITY`), and the tutor's own order has no business naming the identity
 * behind it.
 */
export function toOrderContract(order: Order, store: StoreSummaryOfOrder): OrderContract {
  return {
    id: order.id,
    code: order.code,
    status: order.status,
    store: {
      id: store.id,
      slug: store.slug,
      name: store.name,
      neighborhood: store.neighborhood,
    },
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productNameSnapshot,
      productVariant: item.productVariantSnapshot,
      unitPriceCents: item.unitPriceCents,
      quantity: item.quantity,
      lineTotalCents: item.unitPriceCents * item.quantity,
      fulfillment: item.fulfillment,
    })),
    itemsTotalCents: order.itemsTotalCents,
    deliveryFeeCents: order.deliveryFeeCents,
    serviceFeeCents: order.serviceFeeCents,
    totalCents: order.totalCents,
    deliveryAddress: {
      street: order.deliveryAddress.street,
      number: order.deliveryAddress.number,
      complement: order.deliveryAddress.complement,
      neighborhood: order.deliveryAddress.neighborhood,
      postalCode: order.deliveryAddress.postalCode,
      reference: order.deliveryAddress.reference,
    },
    contactName: order.contactName,
    contactPhone: order.contactPhone,
    placedAt: order.placedAt.toISOString(),
    acceptanceDeadlineAt: order.acceptanceDeadlineAt.toISOString(),
    acceptedAt: order.acceptedAt?.toISOString() ?? null,
    dispatchedAt: order.dispatchedAt?.toISOString() ?? null,
    deliveredAt: order.deliveredAt?.toISOString() ?? null,
    cancelledAt: order.cancelledAt?.toISOString() ?? null,
    rejectedAt: order.rejectedAt?.toISOString() ?? null,
    rejectionReason: order.rejectionReason,
    cancellationReason: order.cancellationReason,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

/** Priced cart → the quote. Same rule: the commission never crosses this line. */
export function toOrderQuoteContract(priced: PricedOrder): OrderQuote {
  return {
    store: {
      id: priced.store.id,
      slug: priced.store.slug,
      name: priced.store.name,
      neighborhood: priced.store.neighborhood,
    },
    items: priced.lines.map((line) => ({
      offerId: line.offerId,
      productId: line.productId,
      productName: line.productName,
      productVariant: line.productVariant,
      unitPriceCents: line.unitPriceCents,
      quantity: line.quantity,
      lineTotalCents: line.lineTotalCents,
    })),
    itemsTotalCents: priced.itemsTotalCents,
    deliveryFeeCents: priced.deliveryFeeCents,
    serviceFeeCents: priced.serviceFeeCents,
    totalCents: priced.totalCents,
    deliveryArea: {
      label: priced.deliveryArea.label,
      estimatedMinutes: priced.deliveryArea.estimatedMinutes,
    },
    deliveryAddress: {
      street: priced.deliveryAddress.street,
      number: priced.deliveryAddress.number,
      complement: priced.deliveryAddress.complement,
      neighborhood: priced.deliveryAddress.neighborhood,
      postalCode: priced.deliveryAddress.postalCode,
      reference: priced.deliveryAddress.reference,
    },
    contactName: priced.contactName,
    contactPhone: priced.contactPhone,
    storeOpenNow: priced.storeOpenNow,
    nextOpeningAt: priced.nextOpeningAt?.toISOString() ?? null,
    acceptanceWindowMinutes: priced.acceptanceWindowMinutes,
  };
}
