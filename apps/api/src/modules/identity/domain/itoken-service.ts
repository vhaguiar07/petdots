import type { User } from './user.js';

/** Injection token for the port — the domain never names its adapter. */
export const TOKEN_SERVICE = Symbol('ITokenService');

export interface IssuedAccessToken {
  value: string;
  /** Seconds, for the `expiresIn` of the contract. */
  expiresInSeconds: number;
}

export interface IssuedRefreshToken {
  /** Given to the caller exactly once — the database only ever sees `hash`. */
  value: string;
  hash: string;
  expiresAt: Date;
}

/**
 * The two tokens are minted by one port because they are one decision: how a
 * session is represented. Splitting them would let the access token's claims
 * and the refresh token's lifetime drift apart in two files.
 */
export interface ITokenService {
  /**
   * Signs the access token. `sub` is the **`User.id`** — the authenticable
   * identity — and not the Tutor: `Tutor` is a consumption profile hanging off
   * a `User`, and it does not exist yet (DOMAIN_MODEL prevails over the draft
   * AUTHENTICATION; ADR-0011, A9).
   */
  issueAccessToken(user: Pick<User, 'id' | 'roles'>): Promise<IssuedAccessToken>;
  issueRefreshToken(): IssuedRefreshToken;
  /** Same function the issuer used, so a presented token can be looked up. */
  hashRefreshToken(value: string): string;
}
