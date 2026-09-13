import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'petdots:rateLimit';

/** How many requests one caller may make to one route inside `windowMs`. */
export interface RateLimitPolicy {
  readonly limit: number;
  readonly windowMs: number;
}

/**
 * Declares that a route is throttled per caller IP.
 *
 * 🔴 **Opt-in, unlike the other two guards.** `AuthGuard` and `RolesGuard` are
 * inverted — everything is closed unless marked — because forgetting them leaks
 * data. Forgetting this one costs nothing but the abuse it would have blocked,
 * while a global default would throttle the store's own queue polling (every
 * 20 s, ADR-0018 A8) and the comparator's page loads, which are the traffic we
 * are publishing *for*. So the rule is named where it applies, and the policies
 * live together in `rate-limits.ts`.
 */
export const RateLimit = (policy: RateLimitPolicy): MethodDecorator & ClassDecorator =>
  SetMetadata(RATE_LIMIT_KEY, policy);
