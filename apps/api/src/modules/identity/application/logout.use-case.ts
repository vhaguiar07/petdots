import { Inject, Injectable, Logger } from '@nestjs/common';
import type { LogoutRequest } from '@petdots/contracts';

import {
  type IRefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '../domain/irefresh-token.repository.js';
import { type ITokenService, TOKEN_SERVICE } from '../domain/itoken-service.js';

@Injectable()
export class LogoutUseCase {
  private readonly logger = new Logger(LogoutUseCase.name);

  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokens: IRefreshTokenRepository,
    @Inject(TOKEN_SERVICE)
    private readonly tokens: ITokenService,
  ) {}

  /**
   * Revokes the refresh token presented, and says nothing about whether there
   * was one to revoke.
   *
   * Succeeding either way is deliberate on two counts. It leaks nothing — a
   * `404` for an unknown token would confirm which strings are real tokens —
   * and it is idempotent, so a client retrying a logout it never saw the
   * response to does not get an error for having already succeeded.
   *
   * Only this session ends. Revoking every token of the user would log them out
   * of their phone because they closed a browser tab; killing all sessions is a
   * different action (password change, suspected compromise) and it does not
   * exist yet.
   */
  async execute(input: LogoutRequest): Promise<void> {
    const revoked = await this.refreshTokens.revoke(
      this.tokens.hashRefreshToken(input.refreshToken),
    );

    this.logger.log(`logout (revoked=${String(revoked)})`);
  }
}
