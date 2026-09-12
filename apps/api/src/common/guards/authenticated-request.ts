import type { UserRole } from '@petdots/contracts';
import type { Request } from 'express';

/**
 * What `AuthGuard` puts on the request, and the only thing downstream code may
 * assume about the caller.
 *
 * Id and roles, nothing else — no e-mail, no hash, no raw token. A handler that
 * needs more reads the row; carrying a snapshot of the user on every request
 * would let stale data spread from a token minted fifteen minutes ago.
 */
export interface AuthenticatedUser {
  id: string;
  roles: UserRole[];
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}
