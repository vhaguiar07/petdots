import type { PersistenceContext } from '../../../prisma/persistence-context.js';
import type { Offer } from './offer.js';

/** Injection token for the port — the domain never names its adapter. */
export const OFFER_REPOSITORY = Symbol('IOfferRepository');

/**
 * What the caller wants done inside a write's transaction — the audit line.
 *
 * The same shape `IOrderRepository.transition` uses, and for the same reason:
 * the mutation and its trail must land together or not at all. Writing the
 * audit row afterwards would leave a price change nobody can attribute the
 * moment the second write fails.
 */
export type OfferSideEffects = (context: PersistenceContext) => Promise<void>;

/** The same, for a write whose subject does not exist until the write happens. */
export type NewOfferSideEffects = (offer: Offer, context: PersistenceContext) => Promise<void>;

/** A new shelf line, before the database gives it an id. */
export interface NewOffer {
  storeId: string;
  productId: string;
  priceCents: number;
  available: boolean;
  priceUpdatedAt: Date;
}

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

  /**
   * **Every** offer of one store, switched-off rows included — what the panel
   * lists, and what the shopfront deliberately does not.
   */
  findAllByStore(storeId: string): Promise<Offer[]>;

  /**
   * One offer **of this store**, or `null`.
   *
   * 🔴 `storeId` is in the `where`, never a check afterwards — the ownership
   * pattern pd-14 fixed for pets and pd-15 for orders. A member of store D
   * naming an offer of store B gets an empty result, not somebody else's price.
   */
  findByIdForStore(offerId: string, storeId: string): Promise<Offer | null>;

  /**
   * Rewrites the price and stamps `price_updated_at`, with the audit line in
   * the same transaction. `null` when the offer is not this store's.
   *
   * The timestamp is not decoration: the comparator shows it, so a price that
   * moved without it would present a stale "atualizado em" to every visitor.
   */
  changePrice(
    offerId: string,
    storeId: string,
    priceCents: number,
    now: Date,
    sideEffects: OfferSideEffects,
  ): Promise<Offer | null>;

  /**
   * Switches one line on or off. `price_updated_at` is **not** touched: having
   * something in stock again is not a new price, and stamping it would tell the
   * comparator the shop repriced when it did not.
   */
  changeAvailability(
    offerId: string,
    storeId: string,
    available: boolean,
    sideEffects: OfferSideEffects,
  ): Promise<Offer | null>;

  /**
   * Puts a catalogue product on the shelf.
   *
   * Raises `OfferAlreadyExistsError` on the unique pair `(store, product)`:
   * that constraint **is** the invariant "one price per store per product", so
   * the refusal comes from the database rather than from a read-then-write that
   * two requests could both pass.
   */
  create(offer: NewOffer, sideEffects: NewOfferSideEffects): Promise<Offer>;
}
