/* eslint-disable @typescript-eslint/unbound-method --
   Este arquivo referencia handlers de controller SEM chamá-los: eles são o alvo
   do metadado que o Reflector lê, não funções a executar. A regra protege
   contra `this` desgovernado num método destacado e depois invocado, que é
   precisamente o que aqui nunca acontece. */
import { Reflector } from '@nestjs/core';

import { RATE_LIMIT_KEY, type RateLimitPolicy } from '../src/common/guards/rate-limit.decorator.js';
import { RATE_LIMITS } from '../src/common/guards/rate-limits.js';
import { IdentityController } from '../src/modules/identity/identity.controller.js';
import { PostalCodesController } from '../src/modules/postal-codes/postal-codes.controller.js';
import { WaitlistController } from '../src/modules/waitlist/waitlist.controller.js';

/**
 * 🔴 The sentinel for the one thing the guard's own suite cannot see.
 *
 * `rate-limit.routes.e2e-spec.ts` proves two of these four routes for real, at
 * the price of a Postgres container. This file proves **all** of them in
 * milliseconds, by reading the metadata straight off the controller classes —
 * so a `@RateLimit` dropped in a merge, renamed along with its handler, or
 * never applied to a route added later fails loudly without anyone having to
 * remember to extend the expensive suite.
 *
 * **Adding a throttled route means adding a line here.** That is the point: the
 * list below is the API's throttling policy written down twice, on purpose, so
 * that changing it is deliberate — the same bargain the OpenAPI snapshot makes.
 */
describe('Throttled routes', () => {
  const reflector = new Reflector();

  const policyOf = (handler: unknown): RateLimitPolicy | undefined =>
    reflector.get<RateLimitPolicy | undefined>(RATE_LIMIT_KEY, handler as () => unknown);

  it.each([
    ['POST /waitlist-entries', WaitlistController.prototype.create, RATE_LIMITS.WAITLIST_JOIN],
    ['POST /auth/register', IdentityController.prototype.register, RATE_LIMITS.AUTH_REGISTER],
    ['POST /auth/login', IdentityController.prototype.signIn, RATE_LIMITS.AUTH_LOGIN],
    [
      'GET /postal-codes/{cep}',
      PostalCodesController.prototype.find,
      RATE_LIMITS.POSTAL_CODE_LOOKUP,
    ],
  ])('%s carries its policy', (_route, handler, expected) => {
    expect(policyOf(handler)).toEqual(expected);
  });

  it.each([
    ['POST /auth/refresh', IdentityController.prototype.refresh],
    ['POST /auth/logout', IdentityController.prototype.signOut],
    ['GET /auth/me', IdentityController.prototype.me],
  ])('%s is deliberately not throttled', (_route, handler) => {
    // Refresh and logout are driven by the client on a timer of its own
    // (ADR-0012): throttling them would sign people out of a working session.
    // `/auth/me` is one cheap read per screen.
    expect(policyOf(handler)).toBeUndefined();
  });

  it('every declared policy is in use', () => {
    const applied = [
      policyOf(WaitlistController.prototype.create),
      policyOf(IdentityController.prototype.register),
      policyOf(IdentityController.prototype.signIn),
      policyOf(PostalCodesController.prototype.find),
    ];

    // A policy nobody applies is a number that looks like a rule and enforces
    // nothing — the kind of thing a reader trusts.
    for (const declared of Object.values(RATE_LIMITS)) {
      expect(applied).toContainEqual(declared);
    }
  });
});
