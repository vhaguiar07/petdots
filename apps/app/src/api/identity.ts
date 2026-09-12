import { authenticatedUserSchema, authTokensSchema } from '@petdots/contracts';

import type { StoredSession } from '../session/session-state';
import { type HttpClient, toSession } from './http';

/**
 * The four calls the session is made of. Each one parses with the schema
 * published in `@petdots/contracts` — the client never trusts the body it got,
 * the same rule the landing's HTTP client follows.
 */
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
