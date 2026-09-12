import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, type JwtSignOptions } from '@nestjs/jwt';

import type { Env } from '../../config/env.schema.js';
import { LoginUseCase } from './application/login.use-case.js';
import { LogoutUseCase } from './application/logout.use-case.js';
import { RefreshTokensUseCase } from './application/refresh-tokens.use-case.js';
import { RegisterUserUseCase } from './application/register-user.use-case.js';
import { SessionIssuer } from './application/session-issuer.js';
import { REFRESH_TOKEN_REPOSITORY } from './domain/irefresh-token.repository.js';
import { PASSWORD_HASHER } from './domain/ipassword-hasher.js';
import { TOKEN_SERVICE } from './domain/itoken-service.js';
import { USER_REPOSITORY } from './domain/iuser.repository.js';
import { Argon2PasswordHasher } from './infra/argon2-password-hasher.js';
import { JwtTokenService } from './infra/jwt-token.service.js';
import { PrismaRefreshTokenRepository } from './infra/prisma-refresh-token.repository.js';
import { PrismaUserRepository } from './infra/prisma-user.repository.js';
import { IdentityController } from './identity.controller.js';

/**
 * `JwtModule` is exported so the `AuthGuard` can verify a token from any
 * module. The secret is configured in one place — here — because two modules
 * signing with two configurations is how a token starts verifying in one half
 * of the API and failing in the other.
 */
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
        signOptions: {
          // `ms` types its input as a template literal union, which no value
          // read from the environment can ever satisfy. The regex in
          // `envSchema` is the real check, and it runs at boot.
          expiresIn: config.get('JWT_EXPIRATION_TIME', {
            infer: true,
          }) as JwtSignOptions['expiresIn'],
        },
      }),
    }),
  ],
  controllers: [IdentityController],
  providers: [
    RegisterUserUseCase,
    LoginUseCase,
    RefreshTokensUseCase,
    LogoutUseCase,
    SessionIssuer,
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: REFRESH_TOKEN_REPOSITORY, useClass: PrismaRefreshTokenRepository },
    { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
    { provide: TOKEN_SERVICE, useClass: JwtTokenService },
  ],
  exports: [JwtModule],
})
export class IdentityModule {}
