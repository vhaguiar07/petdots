import {
  expired,
  refreshed,
  RESTORING,
  restored,
  sessionOf,
  signedIn,
  signedOut,
  type StoredSession,
  storedSessionSchema,
} from './session-state';

const SESSION: StoredSession = {
  accessToken: 'header.payload.signature',
  refreshToken: 'a'.repeat(43),
  expiresAt: 1_800_000_000_000,
  user: {
    id: '7c9d1a3b-4d5e-4f60-9b0c-1d2e3f4a5b6c',
    email: 'lojista@dev.petdots.local',
    roles: ['STORE_MEMBER', 'TUTOR'],
  },
};

describe('storedSessionSchema', () => {
  it('accepts a full session', () => {
    expect(storedSessionSchema.safeParse(SESSION).success).toBe(true);
  });

  it('refuses a session written by an older build', () => {
    // The whole point of parsing on load: a shape from a previous version must
    // be discarded, not trusted into `undefined` where a token belongs.
    const { expiresAt: _dropped, ...withoutExpiry } = SESSION;

    expect(storedSessionSchema.safeParse(withoutExpiry).success).toBe(false);
    expect(storedSessionSchema.safeParse({ ...SESSION, accessToken: '' }).success).toBe(false);
    expect(storedSessionSchema.safeParse({ ...SESSION, user: { id: 'x' } }).success).toBe(false);
  });

  it('🔴 serialises well under the 2048-byte ceiling SecureStore warns above', () => {
    // iOS warns above 2048 bytes per value. A realistic session is ~700; this
    // is the tripwire for the day someone adds a name or a photo URL to the
    // stored user, which would be the moment to split it into two keys
    // (ADR-0012, A3).
    const realistic: StoredSession = {
      ...SESSION,
      // A JWT carrying sub + roles + iat + exp, base64url, three segments.
      accessToken: `${'e'.repeat(36)}.${'J'.repeat(180)}.${'s'.repeat(43)}`,
    };

    const bytes = new TextEncoder().encode(JSON.stringify(realistic)).length;

    expect(bytes).toBeLessThanOrEqual(2048);
  });
});

describe('the session machine', () => {
  it('starts restoring, and says nothing about being signed out yet', () => {
    expect(RESTORING.kind).toBe('restoring');
    expect(sessionOf(RESTORING)).toBeNull();
  });

  it('restores to signedIn with a stored session and signedOut without one', () => {
    expect(restored(SESSION)).toEqual({ kind: 'signedIn', session: SESSION });

    // No `reason`: nobody was signed out, there simply was never a session.
    expect(restored(null)).toEqual({ kind: 'signedOut' });
  });

  it('carries the session on signIn and on refresh', () => {
    expect(sessionOf(signedIn(SESSION))).toBe(SESSION);
    expect(sessionOf(refreshed(SESSION))).toBe(SESSION);
  });

  it('🔴 separates expiry from logout — the sign-in screen says different things', () => {
    expect(expired()).toEqual({ kind: 'signedOut', reason: 'expired' });
    expect(signedOut()).toEqual({ kind: 'signedOut', reason: 'logout' });
  });

  it('never exposes a session while signed out', () => {
    expect(sessionOf(expired())).toBeNull();
    expect(sessionOf(signedOut())).toBeNull();
  });
});
