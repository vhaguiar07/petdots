import { Inject, Injectable, Logger } from '@nestjs/common';
import type { AuthTokens, RefreshRequest } from '@petdots/contracts';

import {
  type IRefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '../domain/irefresh-token.repository.js';
import { InvalidCredentialsError } from '../domain/invalid-credentials.error.js';
import { type ITokenService, TOKEN_SERVICE } from '../domain/itoken-service.js';
import { type IUserRepository, USER_REPOSITORY } from '../domain/iuser.repository.js';
import { SessionIssuer } from './session-issuer.js';

@Injectable()
export class RefreshTokensUseCase {
  private readonly logger = new Logger(RefreshTokensUseCase.name);

  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokens: IRefreshTokenRepository,
    @Inject(USER_REPOSITORY)
    private readonly users: IUserRepository,
    @Inject(TOKEN_SERVICE)
    private readonly tokens: ITokenService,
    private readonly sessions: SessionIssuer,
  ) {}

  /**
   * Trades a live refresh token for a new pair, and burns the one presented.
   *
   * **Rotation is the security property, not a convenience.** A refresh token
   * lives for thirty days and travels between the client's storage and the
   * API many times; rotating it means a stolen copy stops working the moment
   * the legitimate client next renews. The revocation happens *before* the new
   * pair is minted, and it is the conditional `UPDATE` that decides — so a
   * replay of the same token loses even against a simultaneous first use
   * (ADR-0011, A7 / C4).
   */
  async execute(input: RefreshRequest): Promise<AuthTokens> {
    const presentedHash = this.tokens.hashRefreshToken(input.refreshToken);
    const stored = await this.refreshTokens.findByHash(presentedHash);

    if (!stored || stored.revokedAt !== null || stored.expiresAt.getTime() <= Date.now()) {
      // Unknown, already revoked and expired are one answer: telling them apart
      // would say whether a guessed token ever existed.
      this.logger.warn('refresh denied: token is not live');
      throw new InvalidCredentialsError();
    }

    if (!(await this.refreshTokens.revoke(presentedHash))) {
      this.logger.warn(`refresh denied: token already rotated (userId=${stored.userId})`);
      throw new InvalidCredentialsError();
    }

    // Re-read rather than trusting the token's own claims: roles may have
    // changed, and the account may be gone. The row is the truth; the token is
    // a thirty-day-old copy of it.
    const user = await this.users.findById(stored.userId);

    if (!user) {
      this.logger.warn('refresh denied: user no longer exists');
      throw new InvalidCredentialsError();
    }

    this.logger.log(`refresh rotated (userId=${user.id})`);

    return this.sessions.issueFor(user);
  }
}
