import { DomainError } from './domain-error.js';

export class ProductNotOfferableError extends DomainError {}

export interface Offerability {
  requiresPrescription: boolean;
  active: boolean;
}

/**
 * Guards the DOMAIN_MODEL invariant "a product that requires a prescription has
 * no offer in the MVP" (IDEACAO §24), plus the obvious one: an inactive product
 * is not for sale.
 *
 * It is a function and not a database constraint on purpose. The rule spans two
 * tables, which Postgres cannot express without a trigger, and a trigger is the
 * kind of invisible behaviour CODING_STANDARDS rules out. Every path that
 * writes an offer goes through here — today the seed, tomorrow the store
 * panel's endpoint (ADR-0010, A17).
 */
export function assertProductCanBeOffered(product: Offerability): void {
  if (product.requiresPrescription) {
    throw new ProductNotOfferableError(
      'a product that requires a prescription cannot be offered in the MVP',
    );
  }

  if (!product.active) {
    throw new ProductNotOfferableError('an inactive product cannot be offered');
  }
}
