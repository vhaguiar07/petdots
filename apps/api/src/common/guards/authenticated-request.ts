import type { UserRole } from '@petdots/contracts';
import type { Request } from 'express';

import type { StoreMembership } from '../../modules/stores/domain/store-member.js';

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
  /**
   * The store this request is scoped to, put here by `StoreScopeGuard` and read
   * only through `membershipOf`.
   *
   * Optional because most routes are not scoped to a store at all. Its absence
   * on one that should be is a refusal, never a default — see `membershipOf`.
   */
  storeMembership?: StoreMembership;
}
