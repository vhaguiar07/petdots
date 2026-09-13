import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type StoreRole, findStoreParamsSchema } from '@petdots/contracts';
import { ZodValidationException } from 'nestjs-zod';
import { z } from 'zod';

import { FindStoreMembershipUseCase } from '../../modules/stores/application/find-store-membership.use-case.js';
import { hasStoreRole } from '../../modules/stores/domain/store-member.js';
import type { AuthenticatedRequest } from './authenticated-request.js';
import { STORE_ROLES_KEY } from './store-roles.decorator.js';

/**
 * 🔴 The fine half of authorisation: **which** store is this person operating,
 * and in what capacity (ADR-0013, ADR-0018 A3).
 *
 * `AuthGuard` proves who the caller is and `RolesGuard` that they are a
 * `STORE_MEMBER` at all. Neither can answer "may this account touch *this*
 * shop's orders", because `StoreRole` is not in the token (ADR-0013, B7) — one
 * human owns one shop and works the counter of another, so the answer depends
 * on the store in the URL.
 *
 * **Applied per controller, not globally.** Every scoped request pays exactly
 * one lookup on the unique index `(store_id, user_id)`; the tutor's queue, the
 * comparator and `/auth/me` pay nothing, because they never reach this class. A
 * global guard reading route metadata would cost the same at the database and
 * carry the same failure mode — "I forgot the decorator" — with the query
 * hidden. Two things make the forgotten `@UseGuards` survivable anyway: the
 * handler takes its `storeId` from `membershipOf(request)`, which raises when
 * this guard has not run, and every store-scoped repository carries `storeId`
 * in its `where` (the ownership pattern pd-14 fixed for pets, pd-15 for orders).
 *
 * **`storeId` comes from the path** and never from "the store of this user"
 * (ADR-0013, B8): a person may operate more than one, so there is no single
 * answer to infer.
 *
 * **`ADMIN` does not pass through** (ADR-0018, A13). There is no console and no
 * administrative use case, so granting a bypass now would settle the back-office
 * privilege model without the ADR that owes that decision. The trigger is the
 * administration console itself.
 *
 * ⚠️ **Guards run before pipes**, so `params.storeId` arrives raw — a malformed
 * id would otherwise reach Prisma and come back as a `500`. It is parsed here,
 * with the same schema the DTO uses, and fails as the ordinary `422` naming
 * `storeId` (the shape `parseIdempotencyKey` produces for a bad header).
 *
 * ⚠️ It assumes `request.user`, which the **global** `AuthGuard` put there:
 * `APP_GUARD` guards run before controller-level ones. The guard clause below
 * keeps that assumption from becoming a `500` the day the order changes or the
 * route is marked `@Public()` by mistake.
 */
@Injectable()
export class StoreScopeGuard implements CanActivate {
  private readonly logger = new Logger(StoreScopeGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly findMembership: FindStoreMembershipUseCase,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const { user } = request;

    if (!user) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Autenticação necessária.',
      });
    }

    const storeId = parseStoreId(request.params);
    const membership = await this.findMembership.execute(storeId, user.id);

    if (!membership) {
      this.logger.warn(`store scope denied: no membership (storeId=${storeId}, userId=${user.id})`);
      throw denied();
    }

    const required = this.reflector.getAllAndOverride<StoreRole[] | undefined>(STORE_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!hasStoreRole(membership.role, required ?? [])) {
      this.logger.warn(
        `store scope denied: role ${membership.role} insufficient ` +
          `(storeId=${storeId}, userId=${user.id})`,
      );
      throw denied();
    }

    // The only thing a scoped handler may believe about the store it acts on.
    request.storeMembership = { storeId: membership.storeId, role: membership.role };

    return true;
  }
}

/**
 * One `403` for both refusals, on purpose.
 *
 * Saying "you are a member, but you would need to be the OWNER" hands a caller a
 * map of the privilege model for free — the same reason `RolesGuard` never
 * names the role that would have worked. The store's *existence* is public (the
 * comparator lists every listable shop), so `403` here leaks nothing; an order's
 * existence is not, which is why a foreign order answers `404` instead.
 */
function denied(): ForbiddenException {
  return new ForbiddenException({
    code: 'STORE_SCOPE_DENIED',
    message: 'Você não opera esta loja.',
  });
}

/**
 * Validates the raw path parameter, as a `422` that names `storeId` as the
 * field — the envelope a bad body already produces (ERROR_MODEL).
 */
function parseStoreId(params: unknown): string {
  const parsed = findStoreParamsSchema.safeParse(params);

  if (parsed.success) {
    return parsed.data.storeId;
  }

  // `findStoreParamsSchema` names only `storeId`, and an object schema ignores
  // the other params the route carries — so every issue here is about that one
  // field, and the envelope says so.
  throw new ZodValidationException(new z.ZodError(parsed.error.issues));
}
