import { type ISessionStorage, parseStoredSession, SESSION_KEY } from './session-storage.types';

/**
 * The web half of the session storage: `localStorage`.
 *
 * `expo-secure-store` does not exist in the browser — the SDK ships an empty
 * module for it — so there is no secure enclave to use and the choice is
 * between `localStorage`, `sessionStorage` and memory. `localStorage` is the
 * decision (ADR-0012, P4): memory means signing in again on every reload and
 * every fifteen minutes, and `sessionStorage` means a new tab is a signed-out
 * tab.
 *
 * 🔴 The accepted risk is **XSS**: a script running on this origin can read the
 * session. What limits it: React Native Web escapes every piece of text it
 * renders (no `dangerouslySetInnerHTML` carries user data), and refresh
 * rotation makes a stolen copy die at the legitimate client's next renewal. A
 * CSP on the deployed app is the remaining mitigation, and it is on the
 * backlog's watch list with `deploy` as its trigger (ADR-0012, A4).
 *
 * Every access is wrapped: a private window, a browser configured to block site
 * data, or the static export running this on a server all make `localStorage`
 * absent or throwing, and none of those is an error — they simply mean no
 * stored session.
 */
export const sessionStorage: ISessionStorage = {
  load() {
    try {
      const raw = globalThis.localStorage?.getItem(SESSION_KEY);

      return Promise.resolve(raw ? parseStoredSession(raw) : null);
    } catch {
      return Promise.resolve(null);
    }
  },

  save(session) {
    try {
      globalThis.localStorage?.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
      // Best effort. The session still works for this page; it just will not
      // survive a reload.
    }

    return Promise.resolve();
  },

  clear() {
    try {
      globalThis.localStorage?.removeItem(SESSION_KEY);
    } catch {
      // Nothing to remove, or nowhere to remove it from.
    }

    return Promise.resolve();
  },
};
