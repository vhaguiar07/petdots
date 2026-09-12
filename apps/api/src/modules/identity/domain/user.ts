import type { UserRole } from '@petdots/contracts';

/**
 * A stored identity. `passwordHash` lives on this type because the login use
 * case has to verify it — and nowhere else: the controller answers with
 * `AuthenticatedUser` from the contracts, which has no such field (ADR-0011,
 * C6).
 */
export interface User {
  id: string;
  /** Normalised: trimmed and lowercased, which is also what the unique index guards. */
  email: string;
  phone: string | null;
  passwordHash: string;
  /** Never empty — the database refuses it (`users_roles_not_empty_check`). */
  roles: UserRole[];
  createdAt: Date;
}

/** What the use case hands the repository: everything but what the database owns. */
export type NewUser = Omit<User, 'id' | 'createdAt'>;
