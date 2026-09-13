import { SetMetadata } from '@nestjs/common';
import type { StoreRole } from '@petdots/contracts';

export const STORE_ROLES_KEY = 'petdots:storeRoles';

/**
 * Restricts a scoped route to some roles **inside** the store (ADR-0013).
 *
 * Without it, any member of the store in the path passes — which is the common
 * case: the queue, the order and every transition on it belong to both roles,
 * because the person at the counter is who accepts the order. `@StoreRoles('OWNER')`
 * marks the three things that are the owner's alone: the weekly schedule, the
 * price of an offer, and putting a new product on the shelf.
 *
 * ⚠️ It is meaningless without `@UseGuards(StoreScopeGuard)` — nothing reads
 * this metadata but that guard. It is not a second `@Roles`: `UserRole` says
 * which half of the product you are in, `StoreRole` says what you may do in one
 * particular shop.
 */
export const StoreRoles = (...roles: StoreRole[]): MethodDecorator & ClassDecorator =>
  SetMetadata(STORE_ROLES_KEY, roles);
