import type { StoreRole } from '@petdots/contracts';

import type { StoreSummary } from './store.js';

/** One row of `store_members` (DOMAIN_MODEL §Membro da Loja, ADR-0013). */
export interface StoreMember {
  id: string;
  storeId: string;
  userId: string;
  role: StoreRole;
  createdAt: Date;
}

/**
 * 🔴 What `StoreScopeGuard` publishes on the request, and the **only** thing a
 * scoped handler may believe about which store it is acting on.
 *
 * The `storeId` here came from the path *and* was found in `store_members` for
 * this caller. A controller that read `params.storeId` directly would get the
 * first half without the second, which is the whole hole the guard exists to
 * close — so the handlers take the store from here and never from the params.
 */
export interface StoreMembership {
  storeId: string;
  role: StoreRole;
}

/** One store the caller operates, with enough of it to draw a card. */
export interface StoreMembershipOfUser extends StoreMembership {
  store: StoreSummary;
}

/**
 * Whether this role satisfies what a route asks for.
 *
 * Empty `required` means "any member", which is the default: most of the panel
 * is open to both roles, and only price, schedule and the shelf's "tenho" are
 * the owner's (ADR-0013 §permissões).
 */
export function hasStoreRole(role: StoreRole, required: readonly StoreRole[]): boolean {
  return required.length === 0 || required.includes(role);
}
