import { createHash, randomBytes } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import type { Env } from '../../../config/env.schema.js';
import type {
  ITokenService,
  IssuedAccessToken,
  IssuedRefreshToken,
} from '../domain/itoken-service.js';
import type { User } from '../domain/user.js';

/** 256 bits of randomness — the refresh token is guessed, or it is not used. */
const REFRESH_TOKEN_BYTES = 32;

const SECONDS_PER_DAY = 86_400;

/** Claims of the access token (AUTHENTICATION §Claims), with nothing sensitive in it. */
export interface AccessTokenClaims {
  sub: string;
  roles: string[];
}

@Injectable()
export class JwtTokenService implements ITokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async issueAccessToken(user: Pick<User, 'id' | 'roles'>): Promise<IssuedAccessToken> {
    const claims: AccessTokenClaims = { sub: user.id, roles: user.roles };
    const value = await this.jwt.signAsync(claims);

    return { value, expiresInSeconds: this.accessTokenLifetimeSeconds(value) };
  }

  /**
   * The refresh token is **opaque random bytes, not a JWT**, and only its
   * SHA-256 reaches the database.
   *
   * Random because nothing needs to be read out of it: it is looked up in
   * `refresh_tokens`, so a signed payload would only add a second thing that
   * can be true while the row says otherwise. SHA-256 rather than argon2
   * because this input already has 256 bits of entropy — argon2's cost exists
   * to slow down guessing a human-chosen password, and there is nothing to
   * guess here (ADR-0011, A7).
   */
  issueRefreshToken(): IssuedRefreshToken {
    const value = randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
    const days = this.config.get('REFRESH_TOKEN_EXPIRATION_DAYS', { infer: true });

    return {
      value,
      hash: this.hashRefreshToken(value),
      expiresAt: new Date(Date.now() + days * SECONDS_PER_DAY * 1000),
    };
  }

  hashRefreshToken(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  /**
   * Read back from the signed token instead of re-parsing `JWT_EXPIRATION_TIME`:
   * `exp` is what the API will actually enforce, and a client that trusts a
   * separately computed number would refresh at the wrong moment if the two
   * ever disagreed.
   */
  private accessTokenLifetimeSeconds(token: string): number {
    const { exp, iat } = this.jwt.decode<{ exp: number; iat: number }>(token);

    return exp - iat;
  }
}
