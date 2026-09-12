import { type CanActivate, type ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { userRoleSchema } from '@petdots/contracts';
import { z } from 'zod';

import type { AuthenticatedRequest } from './authenticated-request.js';
import { IS_PUBLIC_KEY } from './public.decorator.js';

/**
 * The claims the guard is willing to believe (AUTHENTICATION §Claims).
 *
 * Parsed, not cast. A JWT verifies as authentic long before anyone checks that
 * it says what this application expects — a token signed with the right key but
 * carrying `roles: "ADMIN"` as a string, or no `sub` at all, would otherwise
 * flow into `request.user` and be trusted by every guard downstream.
 */
const claimsSchema = z.object({
  sub: z.uuid(),
  roles: z.array(userRoleSchema).min(1),
});

/** The scheme is fixed; anything else is not a Bearer token (AUTHENTICATION). */
const BEARER = /^Bearer (.+)$/;

/**
 * Proves **who** the caller is. What they may do is `RolesGuard`'s question.
 *
 * Registered **globally** as `APP_GUARD` in `IdentityModule` since pd-13, and
 * it runs before `RolesGuard`: every route is closed unless it carries
 * `@Public()`. Applying it by hand with `@UseGuards` is no longer needed and is
 * now only done by the guards e2e, over a throwaway controller.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [, token] = BEARER.exec(request.headers.authorization ?? '') ?? [];

    if (!token) {
      throw unauthenticated();
    }

    let payload: unknown;

    try {
      payload = await this.jwt.verifyAsync<Record<string, unknown>>(token);
    } catch {
      // Expired, tampered with, signed by someone else — one answer. The token
      // is never logged: it is a live credential until it expires (SECURITY).
      this.logger.warn('access denied: token did not verify');
      throw unauthenticated();
    }

    const claims = claimsSchema.safeParse(payload);

    if (!claims.success) {
      this.logger.warn('access denied: token verified but its claims are not ours');
      throw unauthenticated();
    }

    request.user = { id: claims.data.sub, roles: claims.data.roles };

    return true;
  }
}

/**
 * The generic `401` of the ERROR_MODEL. Deliberately the same body the login
 * failure produces in shape and in silence: it says the request is not
 * authenticated, never which part of the token was wrong.
 */
function unauthenticated(): UnauthorizedException {
  return new UnauthorizedException({
    code: 'UNAUTHENTICATED',
    message: 'Autenticação necessária.',
  });
}
