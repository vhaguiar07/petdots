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
}
