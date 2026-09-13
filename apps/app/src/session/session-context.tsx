import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';

import { createHttpClient, type HttpClient, type SessionPort } from '../api/http';
import {
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
} from '../api/identity';
import { sessionStorage } from './session-storage';
import {
  expired,
  refreshed,
  RESTORING,
  restored,
  sessionOf,
  type SessionState,
  signedIn,
  signedOut,
  type StoredSession,
} from './session-state';

interface SessionApi {
  readonly state: SessionState;
  /** Raises `ApiError` (401 wrong credentials, 422 validation) — the screen shows it. */
  readonly signIn: (email: string, password: string) => Promise<void>;
  /** Raises `ApiError` (409 e-mail taken, 422 validation) — the screen shows it. */
  readonly signUp: (email: string, password: string) => Promise<void>;
  readonly signOut: () => Promise<void>;
  /** The HTTP client every screen calls the API through. */
  readonly http: HttpClient;
}

const SessionContext = createContext<SessionApi | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>(RESTORING);

  /**
   * The session the HTTP client reads, kept in a ref as well as in state.
   *
   * `http` must be stable — recreating it on every renewal would restart every
   * in-flight request — and a closure over `state` would go stale between
   * renders. The ref is the current value; the state is what renders.
   */
  const current = useRef<StoredSession | null>(null);

  const apply = useCallback((next: SessionState) => {
    current.current = sessionOf(next);
    setState(next);
  }, []);

  const http = useMemo(() => {
    const port: SessionPort = {
      get: () => current.current,
      onRefreshed: async (session) => {
        await sessionStorage.save(session);
        apply(refreshed(session));
      },
      // 🔴 Only reached when the API refused the refresh token. A network
      // failure never lands here, so a tunnel does not sign anyone out
      // (ADR-0012, A6).
      onExpired: async () => {
        await sessionStorage.clear();
        apply(expired());
      },
    };

    // The rule flags handing a ref to a function because a function *could*
    // read it while rendering. This one cannot: `port.get` is only ever
    // called from inside `fetch` handling, and that is the whole point — the
    // client has to be stable across renders (recreating it would restart
    // in-flight requests) while still seeing the session as it is *now*,
    // which a closure over `state` would not.
    // eslint-disable-next-line react-hooks/refs -- read asynchronously, never during render
    return createHttpClient(port);
  }, [apply]);

  // Read the storage **after** mounting, never during render: the static export
  // runs this module where there is no `localStorage`, and a value read during
  // render would not match the hydrated client. It is also what keeps
  // `conta.html` generated with its placeholder (ADR-0012, A7).
  useEffect(() => {
    let alive = true;

    void sessionStorage.load().then((stored) => {
      if (alive) {
        apply(restored(stored));
      }
    });

    return () => {
      alive = false;
    };
  }, [apply]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const session = await loginRequest(http, { email, password });

      await sessionStorage.save(session);
      apply(signedIn(session));
    },
    [http, apply],
  );

  /**
   * Creating an account leaves the person signed in — `register` answers the
   * same token pair `login` does, so asking for the password again would be
   * ceremony. Identical to `signIn` from here on: the same storage write and
   * the same state transition.
   */
  const signUp = useCallback(
    async (email: string, password: string) => {
      const session = await registerRequest(http, { email, password });

      await sessionStorage.save(session);
      apply(signedIn(session));
    },
    [http, apply],
  );

  /**
   * Signing out is local first. The API call revokes the refresh token, and
   * `POST /auth/logout` answers 204 for anything — but what the person asked
   * for was to be off this device, and that cannot depend on the network
   * (ADR-0012, A18).
   */
  const signOut = useCallback(async () => {
    const session = current.current;

    await sessionStorage.clear();
    apply(signedOut());

    if (session) {
      try {
        await logoutRequest(http, session.refreshToken);
      } catch {
        // The token expires on the server in thirty days on its own.
      }
    }
  }, [http, apply]);

  const value = useMemo<SessionApi>(
    () => ({ state, signIn, signUp, signOut, http }),
    [state, signIn, signUp, signOut, http],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionApi {
  const api = useContext(SessionContext);

  if (!api) {
    throw new Error('useSession precisa estar dentro de SessionProvider');
  }

  return api;
}
