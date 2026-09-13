import { UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

import type { AuthenticatedRequest } from './guards/authenticated-request.js';

/**
 * The caller's id.
 *
 * `AuthGuard` is global and a closed controller is not `@Public()`, so a caller
 * is always present — answering `401` rather than trusting the optional keeps
 * the day somebody unmarks a route from becoming a `500`.
 *
 * ⚠️ It lived in `tutors.controller.ts` until pd-16, where `orders` already
 * imported it across a module boundary. `stores` needed it too, and a
 * foundational module reaching into `tutors` for a request helper would have
 * become a real import cycle the first time `tutors` needed `stores`. Nothing
 * about "who is calling" belongs to any one aggregate.
 */
export function callerOf(request: AuthenticatedRequest): string {
  if (!request.user) {
    throw new UnauthorizedException({
      code: 'UNAUTHENTICATED',
      message: 'Autenticação necessária.',
    });
  }

  return request.user.id;
}

/**
 * The correlation id `nestjs-pino` put on the request, for the audit line.
 *
 * `null` when there is none, which is honest: an audit row with a made-up
 * request id would be worse than one admitting it has no request behind it —
 * the job's rows carry `null` for exactly that reason.
 */
export function requestIdOf(request: Request): string | null {
  const id: unknown = (request as { id?: unknown }).id;

  return typeof id === 'string' || typeof id === 'number' ? String(id) : null;
}
