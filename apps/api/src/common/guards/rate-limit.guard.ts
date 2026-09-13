import {
  type CanActivate,
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';

import { requestIdOf } from '../request-context.js';
import { RATE_LIMIT_KEY, type RateLimitPolicy } from './rate-limit.decorator.js';
import { RateLimitStore } from './rate-limit.store.js';

/**
 * Whether the throttle actually refuses anything.
 *
 * A token rather than a `ConfigService` read inside the guard, so the one place
 * that decides is the `AppModule` — and so a suite can hand this class a `true`
 * without standing up configuration (`rate-limit.guard.e2e-spec.ts`).
 */
export const RATE_LIMIT_ENABLED = 'petdots:rateLimitEnabled';

/**
 * Turns away a caller who is asking too often, before anything expensive runs.
 *
 * 🔴 **Registered first among the global guards** (`AppModule`, ahead of the
 * `APP_GUARD`s that `IdentityModule` contributes), because the order is the
 * point: a flood of logins is refused *before* `AuthGuard` verifies a token and
 * before the use case hashes a password with argon2. A throttle that runs after
 * the work it protects protects nothing.
 *
 * Routes opt in with `@RateLimit(...)` — see the decorator for why this guard
 * is not inverted like the other two.
 *
 * **The identity of a route is the handler, not the URL.** Keying on the path
 * would give `/postal-codes/20720-000` and `/postal-codes/20721-000` a budget
 * each, which is precisely the sweep the limit exists to stop.
 *
 * ⚠️ **Depends on `trust proxy` being right.** `req.ip` is the socket peer
 * unless Express is told how many proxies sit in front, and in production that
 * peer is Railway's edge for every request on earth — one bucket for the whole
 * internet. `TRUST_PROXY_HOPS` is what makes it the real caller; `main.ts`
 * explains why it is a number and never `true`.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly store: RateLimitStore,
    @Inject(RATE_LIMIT_ENABLED) private readonly enabled: boolean,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    if (!this.enabled) {
      return true;
    }

    const policy = this.reflector.getAllAndOverride<RateLimitPolicy | undefined>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!policy) {
      return true;
    }

    // Non-HTTP contexts have no caller to throttle. Nothing reaches here that
    // way today — the expiry job runs without a request at all — and the guard
    // clause keeps it from becoming a 500 if something ever does.
    if (context.getType() !== 'http') {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const route = `${context.getClass().name}.${context.getHandler().name}`;
    const verdict = this.store.hit(`${request.ip ?? 'unknown'}|${route}`, policy, Date.now());

    if (verdict.allowed) {
      return true;
    }

    const retryAfterSeconds = Math.max(1, Math.ceil(verdict.retryAfterMs / 1000));

    context.switchToHttp().getResponse<Response>().setHeader('Retry-After', retryAfterSeconds);

    // The IP is the whole point of the line; the body never is. A throttled
    // login carries an e-mail and a password attempt, and a log is the last
    // place either belongs (SECURITY, DIRETRIZES_FLUXO_IA §9).
    this.logger.warn(
      `rate limit exceeded on ${route} (ip=${request.ip ?? 'unknown'}, ` +
        `requestId=${requestIdOf(request) ?? 'none'})`,
    );

    throw new HttpException(
      {
        code: 'RATE_LIMITED',
        message: 'Muitas tentativas. Tente de novo em instantes.',
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
