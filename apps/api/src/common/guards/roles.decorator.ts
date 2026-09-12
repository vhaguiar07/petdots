import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '@petdots/contracts';

export const ROLES_KEY = 'petdots:roles';

/**
 * Declares which roles may reach a route. Holding **any** of them is enough —
 * see `RolesGuard` for why the check is an intersection.
 */
export const Roles = (...roles: UserRole[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
