import { DomainError } from '@petdots/domain';

/**
 * Raised when a product id reaches a use case and matches nothing.
 *
 * The comparator answers 404 rather than an empty list: an empty list means
 * "nobody delivers this here", which is a different — and useful — answer
 * (ERROR_MODEL, ADR-0010 A19).
 */
export class ProductNotFoundError extends DomainError {
  constructor() {
    super('product not found');
  }
}
