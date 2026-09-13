import { DomainError } from '@petdots/domain';

/**
 * No offer answers under this id **in this store**.
 *
 * One error for "no such offer" and "another store's offer", on purpose: the
 * `storeId` is imposed in the `where`, so the two are literally the same empty
 * result. A store's *prices* are public — that is the product — but which ids
 * belong to whom is not something a member of another shop needs to probe.
 */
export class OfferNotFoundError extends DomainError {
  constructor(readonly offerId: string) {
    super(`no offer ${offerId} in this store`);
  }
}

/**
 * The store already sells this product.
 *
 * `409` and not `422`: the request is well formed and the product is real, and
 * what fails is a conflict of **state** — the unique pair `(store, product)` is
 * the invariant "one price per store per product" (DOMAIN_MODEL §Oferta). The
 * panel turns it into "você já tem este produto na prateleira".
 */
export class OfferAlreadyExistsError extends DomainError {
  constructor(
    readonly storeId: string,
    readonly productId: string,
  ) {
    super(`store ${storeId} already offers product ${productId}`);
  }
}
