import { ForbiddenException } from '@nestjs/common';

import type { StoreMembership } from '../../modules/stores/domain/store-member.js';
import type { AuthenticatedRequest } from './authenticated-request.js';

/**
 * 🔴 The store a scoped handler is acting on — **the only place it may come
 * from**.
 *
 * Reading `params.storeId` directly would give a handler an id the caller typed,
 * with nothing proving they operate that shop. This one exists only after
 * `StoreScopeGuard` matched the pair in `store_members`, so taking the store
 * from here is what makes "I forgot the `@UseGuards`" a `403` for everybody
 * instead of a silent hole (ADR-0018, A3).
 *
 * It fails closed, and with the same body the guard produces: a route missing
 * the guard is refused, not served.
 */
export function membershipOf(request: AuthenticatedRequest): StoreMembership {
  if (!request.storeMembership) {
    throw new ForbiddenException({
      code: 'STORE_SCOPE_DENIED',
      message: 'Você não opera esta loja.',
    });
  }

  return request.storeMembership;
}
