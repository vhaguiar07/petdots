import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'petdots:isPublic';

/**
 * Marks a route — or a whole controller — as open.
 *
 * 🔴 Since pd-13 the guards are **global** (`IdentityModule`), so this decorator
 * is what the open half of the API runs on: `health`, `waitlist`, `catalog`,
 * `stores`, `offers`, and the four action handlers of `IdentityController`.
 * Everything else is closed, including anything added tomorrow.
 *
 * The inversion is the whole point (ADR-0011 R3, ADR-0012): a route that
 * *should* be closed and is not marked is now safe by default, and a route that
 * should be open and was forgotten fails loudly in the `public-routes` e2e.
 * Prefer it on the class when every route of the controller is public — one
 * decorator cannot be half-applied — and on the handler only where the
 * controller is mixed, as `IdentityController` is.
 */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);
