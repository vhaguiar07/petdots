/** A refresh token as the database knows it: by the hash of its value, never the value. */
export interface StoredRefreshToken {
  id: string;
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

/** Injection token for the port — the domain never names its adapter. */
export const REFRESH_TOKEN_REPOSITORY = Symbol('IRefreshTokenRepository');

export interface IRefreshTokenRepository {
  issue(input: { userId: string; tokenHash: string; expiresAt: Date }): Promise<void>;
  findByHash(tokenHash: string): Promise<StoredRefreshToken | null>;
  /**
   * Marks the token revoked **only if it is still live**, answering whether it
   * was this call that revoked it.
   *
   * The conditional update is the point: rotation reads a token and then
   * revokes it, and two requests arriving with the same refresh token would
   * both pass a prior read. Letting the `UPDATE … WHERE revoked_at IS NULL`
   * decide is what makes a replayed token fail — a check in the use case is not
   * atomic (ADR-0011, A7).
   */
  revoke(tokenHash: string): Promise<boolean>;
}
