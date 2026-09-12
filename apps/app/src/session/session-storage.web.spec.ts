import { SESSION_KEY } from './session-storage.types';
import type { StoredSession } from './session-state';
import { sessionStorage } from './session-storage.web';

const SESSION: StoredSession = {
  accessToken: 'header.payload.signature',
  refreshToken: 'a'.repeat(43),
  expiresAt: 1_800_000_000_000,
  user: {
    id: '7c9d1a3b-4d5e-4f60-9b0c-1d2e3f4a5b6c',
    email: 'tutor@dev.petdots.local',
    roles: ['TUTOR'],
  },
};

/** The smallest `localStorage` that behaves like one. */
function fakeLocalStorage() {
  const entries = new Map<string, string>();

  return {
    entries,
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => void entries.set(key, value),
    removeItem: (key: string) => void entries.delete(key),
  };
}

function install(storage: unknown): void {
  Object.defineProperty(globalThis, 'localStorage', {
    value: storage,
    configurable: true,
    writable: true,
  });
}

describe('sessionStorage on the web', () => {
  afterEach(() => {
    install(undefined);
  });

  it('round-trips a session through localStorage, under the agreed key', async () => {
    const store = fakeLocalStorage();
    install(store);

    await sessionStorage.save(SESSION);

    // The key is part of the manual test script — Victor looks for it in
    // DevTools — so it is asserted, not incidental.
    expect(store.entries.has(SESSION_KEY)).toBe(true);
    expect(await sessionStorage.load()).toEqual(SESSION);
  });

  it('clears the key, leaving nothing behind', async () => {
    const store = fakeLocalStorage();
    install(store);

    await sessionStorage.save(SESSION);
    await sessionStorage.clear();

    expect(store.entries.has(SESSION_KEY)).toBe(false);
    expect(await sessionStorage.load()).toBeNull();
  });

  it('🔴 discards a stored value of the wrong shape instead of trusting it', async () => {
    const store = fakeLocalStorage();
    install(store);

    // What a previous version of the app might have written, and what a bored
    // person might type into DevTools.
    store.entries.set(SESSION_KEY, JSON.stringify({ token: 'formato-antigo' }));
    expect(await sessionStorage.load()).toBeNull();

    store.entries.set(SESSION_KEY, 'nem-e-json');
    expect(await sessionStorage.load()).toBeNull();
  });

  it('answers null when there is no localStorage at all', async () => {
    // A private window, a browser blocking site data, or the static export
    // running this on a server. None of them is an error.
    install(undefined);

    expect(await sessionStorage.load()).toBeNull();
  });

  it('does not throw when localStorage itself refuses', async () => {
    install({
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => {
        throw new Error('SecurityError');
      },
    });

    await expect(sessionStorage.load()).resolves.toBeNull();
    await expect(sessionStorage.save(SESSION)).resolves.toBeUndefined();
    await expect(sessionStorage.clear()).resolves.toBeUndefined();
  });
});
