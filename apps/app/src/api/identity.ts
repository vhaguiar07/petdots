import { authenticatedUserSchema, authTokensSchema } from '@petdots/contracts';

import type { StoredSession } from '../session/session-state';
import { type HttpClient, toSession } from './http';

/**
 * The calls the session is made of. Each one parses with the schema published
 * in `@petdots/contracts` — the client never trusts the body it got, the same
 * rule the landing's HTTP client follows.
 */

/**
 * Creates the account and signs the person straight in: `POST /auth/register`
 * answers the same token pair `login` does, so there is no reason to ask for
 * the password a second time.
 *
 * It creates a `User` and nothing else (ADR-0011, A10) — the tutor profile is
 * the next step of the onboarding, not part of this call.
 */
export function register(
  http: HttpClient,
  credentials: { email: string; password: string },
): Promise<StoredSession> {
  return http
    .postJson('/auth/register', credentials)
    .then((body) => toSession(authTokensSchema.parse(body)));
}

export function login(
  http: HttpClient,
  credentials: { email: string; password: string },
): Promise<StoredSession> {
  return http
    .postJson('/auth/login', credentials)
    .then((body) => toSession(authTokensSchema.parse(body)));
}

export function logout(http: HttpClient, refreshToken: string): Promise<unknown> {
  return http.postJson('/auth/logout', { refreshToken });
}

/**
 * The current session as the server sees it — and the call that exercises the
 * whole Bearer path, renewal included.
 */
export function me(http: HttpClient, signal?: AbortSignal) {
  return http
    .getJson('/auth/me', undefined, { auth: true, signal })
    .then((body) => authenticatedUserSchema.parse(body));
}
