import * as SecureStore from 'expo-secure-store';

import { type ISessionStorage, parseStoredSession, SESSION_KEY } from './session-storage.types';

/**
 * Where the session lives on the device.
 *
 * ⚠️ This file is the **native** half. Metro picks the implementation by
 * platform suffix, and `session-storage.web.ts` is the other half — the one the
 * browser gets, because `expo-secure-store` on web is an empty module whose
 * `getItemAsync` throws (ADR-0012, A1).
 *
 * The unsuffixed file is the native one on purpose: TypeScript
 * (`moduleResolution: bundler`) does not know about platform suffixes and
 * resolves this one, so this is the file `tsc` checks.
 *
 * 🔴 Nothing outside this file may import `expo-secure-store`: on web that
 * import breaks at runtime, not at compile time.
 */
export const sessionStorage: ISessionStorage = {
  async load() {
    try {
      const raw = await SecureStore.getItemAsync(SESSION_KEY);

      return raw ? parseStoredSession(raw) : null;
    } catch {
      // The keychain can refuse (locked device, simulator quirks). No session
      // is the correct answer — worst case the person signs in again.
      return null;
    }
  },

  async save(session) {
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
  },

  async clear() {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  },
};
