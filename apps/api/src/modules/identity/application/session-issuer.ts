import { Inject, Injectable } from '@nestjs/common';
import type { AuthTokens } from '@petdots/contracts';

import {
  type IRefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '../domain/irefresh-token.repository.js';
import { type ITokenService, TOKEN_SERVICE } from '../domain/itoken-service.js';
import type { User } from '../domain/user.js';

/**
 * Mints the pair of tokens and records the refresh side of it.
 *
 * Shared by registration, login and refresh because "starting a session" is one
 * behaviour with one shape. Written three times it would drift three ways — and
 * the field that must never appear in the result is easier to keep out of one
 * function than out of three.
 */
@Injectable()
export class SessionIssuer {
  constructor(
    @Inject(TOKEN_SERVICE)
    private readonly tokens: ITokenService,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokens: IRefreshTokenRepository,
  ) {}

  async issueFor(user: User): Promise<AuthTokens> {
    const access = await this.tokens.issueAccessToken(user);
    const refresh = this.tokens.issueRefreshToken();

    await this.refreshTokens.issue({
      userId: user.id,
      tokenHash: refresh.hash,
      expiresAt: refresh.expiresAt,
    });

    return {
      accessToken: access.value,
      refreshToken: refresh.value,
      expiresIn: access.expiresInSeconds,
      // 🔴 Built field by field, never by spreading the `User`. A spread would
      // carry `passwordHash` into every auth response the day someone adds a
      // column, and nobody would notice (ADR-0011, C6).
      user: { id: user.id, email: user.email, phone: user.phone, roles: user.roles },
    };
  }
}
