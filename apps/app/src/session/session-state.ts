import { authenticatedUserSchema } from '@petdots/contracts';
import { z } from 'zod';

/**
 * The whole session, as it is kept on the device.
 *
 * The access token is persisted alongside the refresh token, not held in memory
 * only. Memory-only would force a rotation on every reload and every new tab,
 * multiplying races between tabs; and since the access token expires in fifteen
 * minutes and cannot be revoked, storing it next to the refresh token does not
 * widen what an XSS would already take (ADR-0012, A3).
 *
 * `expiresAt` is an absolute epoch millisecond, computed as
 * `Date.now() + expiresIn * 1000` when the pair arrives. Nothing here decodes
 * the JWT — the client never reads claims it is not the audience of.
 */
export const storedSessionSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  expiresAt: z.number().int().positive(),
  user: authenticatedUserSchema,
});

export type StoredSession = z.infer<typeof storedSessionSchema>;

/** Why the person is signed out, when the app knows. */
export type SignedOutReason = 'expired' | 'logout';

export type SessionState =
  /** Before the storage has been read — the state every app start begins in. */
  | { readonly kind: 'restoring' }
  | { readonly kind: 'signedOut'; readonly reason?: SignedOutReason }
  | { readonly kind: 'signedIn'; readonly session: StoredSession };

export const RESTORING: SessionState = { kind: 'restoring' };

/** The storage has been read: either there was a session in it, or there was not. */
export function restored(session: StoredSession | null): SessionState {
  return session ? { kind: 'signedIn', session } : { kind: 'signedOut' };
}

export function signedIn(session: StoredSession): SessionState {
  return { kind: 'signedIn', session };
}

/**
 * A renewal landed. Identical to `signedIn` in shape, and separate in name
 * because the two are different events for anything that watches the machine —
 * signing in is a person, renewing is the client.
 */
export function refreshed(session: StoredSession): SessionState {
  return { kind: 'signedIn', session };
}

/**
 * 🔴 The API said the refresh token does not work. Only this authorises
 * discarding a session.
 *
 * A network failure must **not** reach here: logging someone out because their
 * train went into a tunnel is the classic mobile bug, and the session is still
 * perfectly valid on the server (ADR-0012, A6).
 */
export function expired(): SessionState {
  return { kind: 'signedOut', reason: 'expired' };
}

/** The person pressed "Sair". */
export function signedOut(): SessionState {
  return { kind: 'signedOut', reason: 'logout' };
}

/** The session, when there is one — the one accessor every screen uses. */
export function sessionOf(state: SessionState): StoredSession | null {
  return state.kind === 'signedIn' ? state.session : null;
}
