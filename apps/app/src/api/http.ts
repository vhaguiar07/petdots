import { authTokensSchema } from '@petdots/contracts';

import type { StoredSession } from '../session/session-state';
import { type ErrorDetail, parseErrorEnvelope } from './error-envelope';

/**
 * The one place the API base URL is read. Every other module asks this file.
 */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

const API_PREFIX = '/api/v1';

/**
 * How early a renewal happens. Thirty seconds is enough for a slow request to
 * finish on a token that was still valid when it left.
 */
export const REFRESH_WINDOW_MS = 30_000;

/** The API answered, and said no. `code` is the one thing worth branching on. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: ErrorDetail[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * The API did not answer at all — no network, DNS, CORS, or a body that is not
 * JSON.
 *
 * 🔴 Kept apart from `ApiError` because the difference decides whether a
 * session survives: only the API saying "this token does not work" may sign
 * someone out (ADR-0012, A6).
 */
export class ApiUnavailableError extends Error {
  constructor(message = 'Não conseguimos falar com o servidor. Tente de novo.') {
    super(message);
    this.name = 'ApiUnavailableError';
  }
}

/**
 * The session, as the HTTP client is allowed to touch it.
 *
 * Passed in rather than imported so the whole renewal machinery can be tested
 * against a fake `fetch` and a plain object, with no React in the way.
 */
export interface SessionPort {
  get(): StoredSession | null;
  /** A renewal landed: persist it and tell the UI. */
  onRefreshed(session: StoredSession): void | Promise<void>;
  /** The API refused the refresh token. The session is gone. */
  onExpired(): void | Promise<void>;
}

export interface RequestOptions {
  /** Send `Authorization: Bearer` and renew around it. Default: `false`. */
  auth?: boolean;
  signal?: AbortSignal;
}

export type Query = Record<string, string | number | undefined>;

export interface HttpClient {
  getJson(path: string, query?: Query, options?: RequestOptions): Promise<unknown>;
  postJson(path: string, body: unknown, options?: RequestOptions): Promise<unknown>;
}

/**
 * Builds the client. One instance per app, created next to the session.
 *
 * The renewal is here and nowhere else (ADR-0012, A5), in two moments:
 *
 * - **proactive** — before an authenticated call, if the token expires within
 *   `REFRESH_WINDOW_MS`, renew first;
 * - **reactive** — a `401` from a route that is not `/auth/*` triggers **one**
 *   renewal and **one** retry.
 *
 * 🔴 And it is **single-flight**: concurrent callers share one Promise. Without
 * that, two screens renewing at the same time present the same refresh token;
 * rotation makes the second one lose, and the app signs itself out.
 */
export function createHttpClient(
  session: SessionPort,
  fetchImpl: typeof fetch = fetch,
): HttpClient {
  let pendingRefresh: Promise<StoredSession> | null = null;

  async function send(
    path: string,
    init: RequestInit,
    options: RequestOptions,
    accessToken: string | null,
  ): Promise<Response> {
    const headers = new Headers(init.headers);

    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }

    if (init.body !== undefined) {
      headers.set('Content-Type', 'application/json');
    }

    try {
      return await fetchImpl(`${API_BASE_URL}${API_PREFIX}${path}`, {
        ...init,
        headers,
        signal: options.signal,
      });
    } catch (error) {
      // `fetch` only rejects when the request never completed: offline, DNS,
      // CORS, an aborted signal. Never because of the status.
      throw error instanceof Error && error.name === 'AbortError'
        ? error
        : new ApiUnavailableError();
    }
  }

  /**
   * Exchanges the refresh token for a new pair, at most once at a time.
   *
   * A `401` here means the token is dead and the session with it. Anything
   * else — a network failure above all — leaves the session exactly where it
   * was and propagates, so the screen shows "unavailable" instead of a login
   * form.
   */
  async function refresh(): Promise<StoredSession> {
    pendingRefresh ??= (async (): Promise<StoredSession> => {
      const current = session.get();

      if (!current) {
        throw new ApiError(401, 'UNAUTHENTICATED', 'Autenticação necessária.');
      }

      const response = await send(
        '/auth/refresh',
        { method: 'POST', body: JSON.stringify({ refreshToken: current.refreshToken }) },
        {},
        null,
      );

      if (!response.ok) {
        const error = await toApiError(response);

        if (error.status === 401) {
          await session.onExpired();
        }

        throw error;
      }

      const renewed = toSession(authTokensSchema.parse(await readJson(response)));
      await session.onRefreshed(renewed);

      return renewed;
    })().finally(() => {
      pendingRefresh = null;
    });

    return pendingRefresh;
  }

  /** The token to send, renewing first when it is about to die. */
  async function accessTokenFor(options: RequestOptions): Promise<string | null> {
    if (!options.auth) {
      return null;
    }

    const current = session.get();

    if (!current) {
      throw new ApiError(401, 'UNAUTHENTICATED', 'Autenticação necessária.');
    }

    if (current.expiresAt - REFRESH_WINDOW_MS <= Date.now()) {
      return (await refresh()).accessToken;
    }

    return current.accessToken;
  }

  async function request(path: string, init: RequestInit, options: RequestOptions) {
    const response = await send(path, init, options, await accessTokenFor(options));

    // One retry, and only one: a second 401 after a fresh token is a real
    // refusal, not a stale credential.
    //
    // 🔴 The condition is `options.auth`, not the path. Only a call that
    // actually sent a Bearer token can have been refused for a stale one —
    // which excludes `login`, `refresh` and `logout`, whose 401 means "wrong
    // password" and which renewing could never fix. Excluding `/auth/*` by
    // prefix instead would also exclude `/auth/me`, the one authenticated
    // route there is, and silently disable reactive renewal altogether.
    if (response.status === 401 && options.auth) {
      const renewed = await refresh();
      const retried = await send(path, init, options, renewed.accessToken);

      return finish(retried);
    }

    return finish(response);
  }

  async function finish(response: Response): Promise<unknown> {
    if (!response.ok) {
      throw await toApiError(response);
    }

    return response.status === 204 ? null : readJson(response);
  }

  return {
    getJson: (path, query, options = {}) => request(toUrl(path, query), { method: 'GET' }, options),
    postJson: (path, body, options = {}) =>
      request(path, { method: 'POST', body: JSON.stringify(body) }, options),
  };
}

/** `expiresIn` is a duration; everything downstream wants an instant. */
export function toSession(tokens: {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: StoredSession['user'];
}): StoredSession {
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: Date.now() + tokens.expiresIn * 1000,
    user: tokens.user,
  };
}

function toUrl(path: string, query?: Query): string {
  const entries = Object.entries(query ?? {}).filter(
    (entry): entry is [string, string | number] => entry[1] !== undefined && entry[1] !== '',
  );

  if (entries.length === 0) {
    return path;
  }

  const search = new URLSearchParams(entries.map(([key, value]) => [key, String(value)]));

  return `${path}?${search.toString()}`;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return (await response.json()) as unknown;
  } catch {
    // A 200 whose body is not JSON is a broken server or a captive portal —
    // indistinguishable from unreachable, as far as a screen is concerned.
    throw new ApiUnavailableError();
  }
}

/**
 * Turns a failed response into `ApiError`, keeping the API's own message.
 *
 * A body that is not the envelope still produces an `ApiError`: the API did
 * answer, and the status is real information. Only a request that never
 * completed is `ApiUnavailableError`.
 */
async function toApiError(response: Response): Promise<ApiError> {
  let body: unknown = null;

  try {
    body = (await response.json()) as unknown;
  } catch {
    body = null;
  }

  const envelope = parseErrorEnvelope(body);

  return envelope
    ? new ApiError(
        response.status,
        envelope.error.code,
        envelope.error.message,
        envelope.error.details,
      )
    : new ApiError(response.status, 'HTTP_ERROR', 'Não foi possível completar a operação.');
}
