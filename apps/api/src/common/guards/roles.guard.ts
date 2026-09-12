import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserRole } from '@petdots/contracts';

import type { AuthenticatedRequest } from './authenticated-request.js';
import { ROLES_KEY } from './roles.decorator.js';

/**
 * The coarse half of authorisation: which **kind** of user may call this route.
 *
 * The fine half — which stores this person operates, which orders are theirs —
 * is `StoreScopeGuard`, and it is deliberately absent: `StoreMember` does not
 * exist in the schema yet, and `SECURITY` requires the `OWNER` × `OPERATOR`
 * distinction to be settled before fine-grained authorisation is designed
 * (ADR-0011, A2).
 *
 * Runs **after** `AuthGuard` and depends on it: `@UseGuards(AuthGuard,
 * RolesGuard)`, in that order. On its own it denies everything, because there
 * is no `request.user` to compare against — which is the safe way round.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();

    // 🔴 Intersection, not equality. `roles` is a list because one human
    // accumulates them — the shop owner who also has a pet is `['TUTOR',
    // 'STORE_MEMBER']` — so comparing the whole list, or only its first entry,
    // would lock that person out of both halves of the product (DOMAIN_MODEL
    // §Usuário; ADR-0011, R4).
    if (!user || !user.roles.some((role) => required.includes(role))) {
      this.logger.warn(`access denied: role not allowed (userId=${user?.id ?? 'anonymous'})`);

      // The generic `FORBIDDEN` of the ERROR_MODEL, and no list of the roles
      // that would have worked: that is a map of the API's privilege model.
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Você não tem permissão para esta operação.',
      });
    }

    return true;
  }
}
