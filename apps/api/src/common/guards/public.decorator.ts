import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'petdots:isPublic';

/**
 * Marks a route as open, for the day `AuthGuard` becomes global.
 *
 * It exists now, unused, on purpose: the guards in this delivery are applied
 * per route (`@UseGuards`), because every endpoint that exists today —
 * `catalog`, `stores`, `offers`, `waitlist`, `health` — is public by design and
 * making the guard global would mean marking all of them and risking the
 * comparator (ADR-0011, passo 11 / R3). `AuthGuard` already honours this
 * decorator, so the inversion is a one-line change in `app.module.ts` when the
 * first authenticated endpoint arrives.
 */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);
