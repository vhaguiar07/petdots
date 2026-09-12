import type { StoredSession } from '../session/session-state';
import {
  ApiError,
  ApiUnavailableError,
  createHttpClient,
  REFRESH_WINDOW_MS,
  type SessionPort,
} from './http';

const USER = {
  id: '7c9d1a3b-4d5e-4f60-9b0c-1d2e3f4a5b6c',
  email: 'lojista@dev.petdots.local',
  roles: ['STORE_MEMBER', 'TUTOR'] as const,
};

const sessionAt = (expiresAt: number, suffix = '1'): StoredSession => ({
  accessToken: `access-${suffix}`,
  refreshToken: `refresh-${suffix}`,
  expiresAt,
  user: { ...USER, roles: [...USER.roles] },
});

const FRESH = (): StoredSession => sessionAt(Date.now() + 15 * 60_000);
const NEARLY_DEAD = (): StoredSession => sessionAt(Date.now() + REFRESH_WINDOW_MS - 1_000);

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const envelope = (code: string, status: number): Response =>
  json({ error: { code, message: 'mensagem da api', details: [], requestId: 'r1' } }, status);

/** A renewed pair, as `POST /auth/refresh` answers it. */
const TOKENS = {
  accessToken: 'access-2',
  refreshToken: 'refresh-2',
  expiresIn: 900,
  user: { ...USER, roles: [...USER.roles] },
};

/**
 * A `SessionPort` that records what the client did to the session — the two
 * transitions that matter are `onRefreshed` and `onExpired`.
 */
function fakeSession(initial: StoredSession | null) {
  let current = initial;
  const events: string[] = [];

  const port: SessionPort = {
    get: () => current,
    onRefreshed: (session) => {
      current = session;
      events.push('refreshed');
    },
    onExpired: () => {
      current = null;
      events.push('expired');
    },
  };

  return {
    port,
    events,
    get current() {
      return current;
    },
  };
}

/** Counts calls per path, so "exactly one refresh" is an assertion and not a guess. */
function recordingFetch(handler: (path: string, init?: RequestInit) => Promise<Response>) {
  const calls: { path: string; authorization: string | null }[] = [];

  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const headers = new Headers(init?.headers);

    calls.push({ path: url.pathname, authorization: headers.get('Authorization') });

    return handler(url.pathname, init);
  }) as unknown as typeof fetch;

  const countOf = (path: string): number => calls.filter((call) => call.path === path).length;

  return { impl, calls, countOf };
}

const ME = '/api/v1/auth/me';
const REFRESH = '/api/v1/auth/refresh';

describe('the HTTP client', () => {
  it('sends no Authorization header on a public call', async () => {
    const session = fakeSession(FRESH());
    const fetcher = recordingFetch(() => Promise.resolve(json({ items: [] })));
    const http = createHttpClient(session.port, fetcher.impl);

    await http.getJson('/products', { q: 'golden' });

    expect(fetcher.calls[0]?.path).toBe('/api/v1/products');
    expect(fetcher.calls[0]?.authorization).toBeNull();
  });

  it('puts the query string together, dropping empty values', async () => {
    const session = fakeSession(null);
    const urls: string[] = [];
    const impl = (async (input: RequestInfo | URL) => {
      urls.push(String(input));
      return json({ items: [] });
    }) as unknown as typeof fetch;

    await createHttpClient(session.port, impl).getJson('/offers', {
      productId: 'p1',
      neighborhood: '',
      postalCode: undefined,
    });

    expect(urls[0]).toContain('/offers?productId=p1');
    expect(urls[0]).not.toContain('neighborhood');
    expect(urls[0]).not.toContain('postalCode');
  });

  it('sends the Bearer token when the token still has life in it', async () => {
    const session = fakeSession(FRESH());
    const fetcher = recordingFetch(() => Promise.resolve(json(USER)));
    const http = createHttpClient(session.port, fetcher.impl);

    await http.getJson('/auth/me', undefined, { auth: true });

    expect(fetcher.countOf(REFRESH)).toBe(0);
    expect(fetcher.calls[0]?.authorization).toBe('Bearer access-1');
  });

  it('🔴 renews proactively when less than the window is left, before the call', async () => {
    const session = fakeSession(NEARLY_DEAD());
    const fetcher = recordingFetch((path) =>
      Promise.resolve(path === REFRESH ? json(TOKENS) : json(USER)),
    );
    const http = createHttpClient(session.port, fetcher.impl);

    await http.getJson('/auth/me', undefined, { auth: true });

    // The refresh went first, and `/auth/me` carried the *new* token.
    expect(fetcher.calls.map((call) => call.path)).toEqual([REFRESH, ME]);
    expect(fetcher.calls[1]?.authorization).toBe('Bearer access-2');
    expect(session.current?.refreshToken).toBe('refresh-2');
    expect(session.events).toEqual(['refreshed']);
  });

  it('🔴 renews reactively on a 401, and retries exactly once', async () => {
    const session = fakeSession(FRESH());
    let meCalls = 0;

    const fetcher = recordingFetch((path) => {
      if (path === REFRESH) {
        return Promise.resolve(json(TOKENS));
      }

      meCalls += 1;

      // The first attempt is refused even though the token looked fresh — the
      // server restarted with another secret, say.
      return Promise.resolve(meCalls === 1 ? envelope('UNAUTHENTICATED', 401) : json(USER));
    });

    await createHttpClient(session.port, fetcher.impl).getJson('/auth/me', undefined, {
      auth: true,
    });

    expect(fetcher.countOf(REFRESH)).toBe(1);
    expect(fetcher.countOf(ME)).toBe(2);
    expect(fetcher.calls[2]?.authorization).toBe('Bearer access-2');
  });

  it('🔴 does not retry a second time when the fresh token is refused too', async () => {
    // Otherwise a genuinely forbidden route would loop, renewing forever.
    const session = fakeSession(FRESH());
    const fetcher = recordingFetch((path) =>
      Promise.resolve(path === REFRESH ? json(TOKENS) : envelope('UNAUTHENTICATED', 401)),
    );

    const http = createHttpClient(session.port, fetcher.impl);

    await expect(http.getJson('/auth/me', undefined, { auth: true })).rejects.toBeInstanceOf(
      ApiError,
    );

    expect(fetcher.countOf(REFRESH)).toBe(1);
    expect(fetcher.countOf(ME)).toBe(2);
  });

  it('🔴 is single-flight: three concurrent calls produce one refresh', async () => {
    // Without this, three screens renewing together present the same refresh
    // token; rotation burns it, two of them get a 401, and the app signs
    // itself out for no reason (ADR-0012, A5).
    const session = fakeSession(NEARLY_DEAD());
    const fetcher = recordingFetch((path) =>
      Promise.resolve(path === REFRESH ? json(TOKENS) : json(USER)),
    );
    const http = createHttpClient(session.port, fetcher.impl);

    await Promise.all([
      http.getJson('/auth/me', undefined, { auth: true }),
      http.getJson('/auth/me', undefined, { auth: true }),
      http.getJson('/auth/me', undefined, { auth: true }),
    ]);

    expect(fetcher.countOf(REFRESH)).toBe(1);
    expect(fetcher.countOf(ME)).toBe(3);
    expect(session.events).toEqual(['refreshed']);
  });

  it('allows a later renewal after an earlier one finished', async () => {
    const session = fakeSession(NEARLY_DEAD());
    const fetcher = recordingFetch((path) =>
      Promise.resolve(
        path === REFRESH
          ? // Answers a pair that is already inside the window again, so the
            // next call has to renew afresh rather than reuse a settled flight.
            json({ ...TOKENS, expiresIn: 10 })
          : json(USER),
      ),
    );
    const http = createHttpClient(session.port, fetcher.impl);

    await http.getJson('/auth/me', undefined, { auth: true });
    await http.getJson('/auth/me', undefined, { auth: true });

    expect(fetcher.countOf(REFRESH)).toBe(2);
  });

  it('🔴 a refresh refused with 401 ends the session and empties it', async () => {
    const session = fakeSession(NEARLY_DEAD());
    const fetcher = recordingFetch((path) =>
      Promise.resolve(path === REFRESH ? envelope('UNAUTHENTICATED', 401) : json(USER)),
    );
    const http = createHttpClient(session.port, fetcher.impl);

    await expect(http.getJson('/auth/me', undefined, { auth: true })).rejects.toBeInstanceOf(
      ApiError,
    );

    expect(session.events).toEqual(['expired']);
    expect(session.current).toBeNull();
    expect(fetcher.countOf(ME)).toBe(0);
  });

  it('🔴 a refresh that fails on the network KEEPS the session', async () => {
    // The classic mobile bug this test exists to prevent: someone goes into a
    // tunnel and comes out signed out. Only the API saying "this token does
    // not work" may discard a session (ADR-0012, A6).
    const before = NEARLY_DEAD();
    const session = fakeSession(before);
    const impl = (() =>
      Promise.reject(new TypeError('Failed to fetch'))) as unknown as typeof fetch;
    const http = createHttpClient(session.port, impl);

    await expect(http.getJson('/auth/me', undefined, { auth: true })).rejects.toBeInstanceOf(
      ApiUnavailableError,
    );

    expect(session.events).toEqual([]);
    expect(session.current).toBe(before);
  });

  it('🔴 a 401 on a public route never triggers a renewal', async () => {
    // `/auth/login` answering 401 means "wrong password", and renewing over it
    // would both fail and hide the real message.
    const session = fakeSession(FRESH());
    const fetcher = recordingFetch(() => Promise.resolve(envelope('UNAUTHENTICATED', 401)));
    const http = createHttpClient(session.port, fetcher.impl);

    await expect(
      http.postJson('/auth/login', { email: 'x@y.z', password: 'errada' }),
    ).rejects.toBeInstanceOf(ApiError);

    expect(fetcher.countOf(REFRESH)).toBe(0);
    expect(session.events).toEqual([]);
  });

  it('keeps the API message and code out of a failed call', async () => {
    const session = fakeSession(null);
    const impl = (() =>
      Promise.resolve(
        json(
          {
            error: {
              code: 'VALIDATION_FAILED',
              message: 'Falha de validação.',
              details: [{ field: 'email', message: 'Informe um e-mail válido.' }],
              requestId: 'r1',
            },
          },
          422,
        ),
      )) as unknown as typeof fetch;

    const error: unknown = await createHttpClient(session.port, impl)
      .postJson('/auth/login', {})
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    const api = error as ApiError;
    expect(api.status).toBe(422);
    expect(api.code).toBe('VALIDATION_FAILED');
    expect(api.message).toBe('Falha de validação.');
    expect(api.details).toEqual([{ field: 'email', message: 'Informe um e-mail válido.' }]);
  });

  it('still produces an ApiError when the body is not the envelope', async () => {
    // A proxy's HTML 502 is an answer, not an unreachable API.
    const session = fakeSession(null);
    const impl = (() =>
      Promise.resolve(
        new Response('<html>502</html>', { status: 502 }),
      )) as unknown as typeof fetch;

    const error: unknown = await createHttpClient(session.port, impl)
      .getJson('/products')
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(502);
  });

  it('answers null to a 204 instead of trying to parse it', async () => {
    const session = fakeSession(null);
    const impl = (() =>
      Promise.resolve(new Response(null, { status: 204 }))) as unknown as typeof fetch;

    await expect(
      createHttpClient(session.port, impl).postJson('/auth/logout', { refreshToken: 'x' }),
    ).resolves.toBeNull();
  });

  it('refuses an authenticated call with no session at all', async () => {
    const session = fakeSession(null);
    const fetcher = recordingFetch(() => Promise.resolve(json(USER)));

    await expect(
      createHttpClient(session.port, fetcher.impl).getJson('/auth/me', undefined, { auth: true }),
    ).rejects.toBeInstanceOf(ApiError);

    expect(fetcher.calls).toEqual([]);
  });
});
