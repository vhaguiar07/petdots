import { DomainError } from '@petdots/domain';

/** The directory answered, and said this CEP does not exist. */
export class PostalCodeNotFoundError extends DomainError {
  constructor(postalCode: string) {
    super(`postal code ${postalCode} not found`);
  }
}
