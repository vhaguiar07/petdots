import type { Offer } from './offer.js';

/** Injection token for the port — the domain never names its adapter. */
export const OFFER_REPOSITORY = Symbol('IOfferRepository');

export interface IOfferRepository {
  /**
   * Available offers of one product, restricted to the stores that deliver to
   * the visitor. The store ids come from `stores`, never from a JOIN here.
   */
  findAvailableByProduct(productId: string, storeIds: readonly string[]): Promise<Offer[]>;
  /**
   * Everything one store currently has on the shelf.
   *
   * Whether that store may be seen at all is `stores`' question, answered
   * before this is called — the repository does not know about `PAUSED`.
   */
  findAvailableByStore(storeId: string): Promise<Offer[]>;
  /**
   * The offers of one store named by id — **including the unavailable ones**.
   *
   * 🔴 The inclusion is the whole point. At checkout "this offer does not
   * exist" and "this offer is out of stock" are different answers to the tutor
   * (`422 ORDER_ITEMS_INVALID` against `409 OFFER_UNAVAILABLE`, ERROR_MODEL),
   * and a query that filtered `available` here would collapse them into one.
   * The use case decides; the repository reports.
   *
   * Restricted to the store so an offer of another store comes back empty and
   * is refused as invalid, rather than being priced into someone else's order.
   */
  findByIdsForStore(storeId: string, offerIds: readonly string[]): Promise<Offer[]>;
}
