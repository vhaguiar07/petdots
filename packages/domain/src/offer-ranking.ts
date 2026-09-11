import { InvalidMoneyOperationError } from './money.js';

/** An offer ranked with the visitor's address known. */
export interface LandedOffer {
  landedCents: number;
  estimatedMinutes: number;
  storeName: string;
}

/** An offer ranked without an address: only the item price is comparable. */
export interface ItemPricedOffer {
  priceCents: number;
  storeName: string;
}

/**
 * What the visitor actually pays: the item plus the delivery of the area that
 * covers them.
 *
 * Comparing `priceCents` alone would rank a store that charges R$ 2 less for
 * the bag and R$ 10 more for the trip as the cheapest, which is the single
 * mistake the comparator exists to avoid.
 */
export function landedPriceCents(priceCents: number, deliveryFeeCents: number): number {
  assertNonNegativeInteger(priceCents, 'priceCents');
  assertNonNegativeInteger(deliveryFeeCents, 'deliveryFeeCents');

  return priceCents + deliveryFeeCents;
}

/**
 * The ranking of the comparator when the address is known (ADR-0010, A11):
 * landed price ascending, then the faster delivery, then the store name.
 *
 * The tie-breaks are not decoration — they make the order total. Two stores
 * with the same landed price would otherwise swap places between two requests,
 * and a list that reorders itself on refresh reads as broken. Reputation and
 * lead time as a *primary* criterion is a revenue allocation policy and stays
 * an open decision.
 */
export function compareByLandedPrice(a: LandedOffer, b: LandedOffer): number {
  return (
    a.landedCents - b.landedCents ||
    a.estimatedMinutes - b.estimatedMinutes ||
    a.storeName.localeCompare(b.storeName, 'pt-BR')
  );
}

/**
 * The ranking without an address: the delivery fee is unknown, so only the item
 * price can be compared, and the page says so instead of implying a total.
 */
export function compareByItemPrice(a: ItemPricedOffer, b: ItemPricedOffer): number {
  return a.priceCents - b.priceCents || a.storeName.localeCompare(b.storeName, 'pt-BR');
}

function assertNonNegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new InvalidMoneyOperationError(
      `${label} must be a non-negative integer of cents, got ${value}`,
    );
  }
}
