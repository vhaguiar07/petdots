import { DomainError } from '@petdots/domain';

/**
 * The phone is already on the list. Raised by the repository from the unique
 * constraint rather than from a prior read: only the database can decide this
 * without a race between two visitors submitting at the same instant.
 */
export class WaitlistEntryAlreadyExistsError extends DomainError {
  constructor() {
    // No phone in the message: it is personal data and this travels to logs
    // (SECURITY, LGPD).
    super('this phone is already on the waitlist');
  }
}
