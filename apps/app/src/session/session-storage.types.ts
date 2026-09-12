import { type StoredSession, storedSessionSchema } from './session-state';

/**
 * What the two platform implementations of the session storage share.
 *
 * It exists so the interface cannot drift: `session-storage.ts` (native,
 * `SecureStore`) and `session-storage.web.ts` (`localStorage`) are chosen by
 * Metro from the platform suffix and are never compiled together, so a
 * difference between them would only show up at runtime, on one platform
 * (ADR-0012, A1).
 */
export const SESSION_KEY = 'petdots.session';

export interface ISessionStorage {
  load(): Promise<StoredSession | null>;
  save(session: StoredSession): Promise<void>;
  clear(): Promise<void>;
}

/**
 * Parsed, never cast. A session written by an older build has an older shape,
 * and trusting it would put `undefined` where a token belongs. Discarding is
 * always safe: the person signs in again.
 */
export function parseStoredSession(raw: string): StoredSession | null {
  try {
    const parsed = storedSessionSchema.safeParse(JSON.parse(raw));

    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
