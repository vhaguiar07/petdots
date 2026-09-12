import { DomainError } from '@petdots/domain';

/**
 * Somebody already registered under this e-mail. Raised by the repository from
 * the unique constraint rather than from a prior read: only the database can
 * decide this without a race between two people submitting at the same instant.
 *
 * ⚠️ This *is* an existence oracle — a `409` on registration tells the caller
 * the address is taken. It is accepted here and refused at login (see
 * `InvalidCredentialsError`): registration has no usable alternative, since
 * pretending to succeed would leave the person with an account they cannot use,
 * while login loses nothing by answering identically every time.
 */
export class EmailAlreadyRegisteredError extends DomainError {
  constructor() {
    // No e-mail in the message: it is personal data and this travels to logs
    // (SECURITY, LGPD).
    super('this e-mail is already registered');
  }
}
