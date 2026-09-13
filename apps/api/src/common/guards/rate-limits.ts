import type { RateLimitPolicy } from './rate-limit.decorator.js';

const MINUTE = 60_000;

/**
 * Every throttled route of the API, with its budget per caller IP.
 *
 * They live here rather than inline at each `@RateLimit(...)` so that tuning
 * them after the first week of real traffic is one file and one diff — the
 * numbers below are **conservative guesses**, not measurements, and the
 * `BACKLOG` says so.
 *
 * What each one is defending, and why the shape differs:
 *
 * - **`WAITLIST_JOIN`** — the campaign's front door, open and unauthenticated
 *   (pd-09). Until now the only defences were a honeypot the landing checks
 *   and the uniqueness of the phone number; a robot posting straight at the API
 *   walked past both. Five in ten minutes is far above a household with three
 *   pets and far below a flood.
 * - **`AUTH_LOGIN`** — credential stuffing is the likeliest abuse of a public
 *   API with a password, and every attempt costs an argon2 hash (ADR-0011),
 *   which makes the CPU the second victim. Ten a minute leaves room for a
 *   person who mistypes and retries.
 * - **`AUTH_REGISTER`** — account creation is free and writes a row; the same
 *   budget as the waitlist, for the same reason.
 * - **`POSTAL_CODE_LOOKUP`** — authenticated, so the abuser needs an account,
 *   but one account can still sweep the CEP range through our IP and our
 *   reputation at a free third-party directory with no SLA (ADR-0016). Thirty
 *   a minute is an address form used hard; a sweep is orders of magnitude more.
 */
export const RATE_LIMITS = {
  WAITLIST_JOIN: { limit: 5, windowMs: 10 * MINUTE },
  AUTH_LOGIN: { limit: 10, windowMs: MINUTE },
  AUTH_REGISTER: { limit: 5, windowMs: 10 * MINUTE },
  POSTAL_CODE_LOOKUP: { limit: 30, windowMs: MINUTE },
} as const satisfies Record<string, RateLimitPolicy>;
