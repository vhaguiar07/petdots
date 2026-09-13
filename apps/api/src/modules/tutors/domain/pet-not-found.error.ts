import { DomainError } from '@petdots/domain';

/**
 * No pet answers under this id **for this tutor**.
 *
 * 🔴 The two cases are one error on purpose: a pet that never existed and a pet
 * that belongs to somebody else get the same answer. A `403` would confirm that
 * the id is real and has an owner, which is precisely the fact a stranger must
 * not be able to probe for — ownership "não vive no token: deriva em tempo de
 * requisição" (AUTHENTICATION), and the honest thing to tell someone about
 * another person's pet is that there is nothing there.
 */
export class PetNotFoundError extends DomainError {
  constructor(petId: string) {
    super(`pet ${petId} not found`);
  }
}
