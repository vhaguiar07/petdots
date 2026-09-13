import { DomainError } from '@petdots/domain';

/**
 * The order does not exist **for this tutor**.
 *
 * One error for both "no such id" and "someone else's order", on purpose: the
 * ownership is imposed in the `where` of the query, so the two are literally
 * the same empty result. `403` would confirm that the id is real and has an
 * owner — the one fact a stranger must not be able to probe for (ERROR_MODEL,
 * the rule pd-14 fixed for pets).
 */
export class OrderNotFoundError extends DomainError {
  constructor(readonly orderId: string) {
    super(`no order ${orderId} for this tutor`);
  }
}

/** The store exists and is listable, but is not taking orders (DOMAIN_MODEL). */
export class StoreNotActiveError extends DomainError {
  constructor(readonly storeId: string) {
    super(`store ${storeId} is not ACTIVE`);
  }
}

/** One or more offers are off the shelf. Different from not existing. */
export class OfferUnavailableError extends DomainError {
  constructor(readonly offerIds: readonly string[]) {
    super(`offers are unavailable: ${offerIds.join(', ')}`);
  }
}

/** What is wrong with one line of the cart, and where. */
export interface InvalidOrderItem {
  index: number;
  offerId: string;
  reason: 'UNKNOWN_OFFER' | 'OTHER_STORE' | 'DUPLICATED' | 'INACTIVE_PRODUCT';
}

/**
 * The cart names something that cannot be ordered — an offer that does not
 * exist, belongs to another store, is repeated, or points at a product the
 * catalogue has withdrawn.
 *
 * `422` and not `409`: the request is well formed and the caller is allowed,
 * but a business rule about the **data sent** fails — the same criterion that
 * puts a Zod failure at `422` (ERROR_MODEL). An unavailable offer is `409`
 * instead, because that is a conflict of **state**.
 */
export class OrderItemsInvalidError extends DomainError {
  constructor(readonly items: readonly InvalidOrderItem[]) {
    super(`invalid order items: ${items.map((item) => item.offerId).join(', ')}`);
  }
}

/** The tutor's address is outside every active area of this store. */
export class AddressOutOfDeliveryAreaError extends DomainError {
  constructor(readonly storeId: string) {
    super(`the address is outside every active delivery area of store ${storeId}`);
  }
}

/**
 * There is no tutor profile behind this account yet.
 *
 * `409` rather than `404`: the account is fine, the request is fine, and what
 * is missing is a step the person has not taken — the app turns this into
 * "Complete seu endereço", not into "não encontrado".
 */
export class TutorProfileRequiredError extends DomainError {
  constructor() {
    super('an order needs a tutor profile with a phone and an address');
  }
}

/** The generated code collided with an existing one. Retried once, then raised. */
export class OrderCodeCollisionError extends DomainError {
  constructor(readonly code: string) {
    super(`order code ${code} is already taken`);
  }
}

/** Two requests raced on the same idempotency key. The caller re-reads. */
export class DuplicateIdempotencyKeyError extends DomainError {
  constructor(readonly idempotencyKey: string) {
    super(`idempotency key ${idempotencyKey} is already used by this tutor`);
  }
}
