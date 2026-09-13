import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, type JwtSignOptions } from '@nestjs/jwt';

import type { Env } from '../../config/env.schema.js';
import { AuthGuard } from '../../common/guards/auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { FindAuthenticatedUserUseCase } from './application/find-authenticated-user.use-case.js';
import { LoginUseCase } from './application/login.use-case.js';
import { LogoutUseCase } from './application/logout.use-case.js';
import { RefreshTokensUseCase } from './application/refresh-tokens.use-case.js';
import { RegisterUserUseCase } from './application/register-user.use-case.js';
import { SessionIssuer } from './application/session-issuer.js';
import { UpdateUserPhoneUseCase } from './application/update-user-phone.use-case.js';
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
 *
 * 🔴 The two guards are registered **globally from here**, not from
 * `AppModule`: `AuthGuard` injects `JwtService`, which this module already
 * configures, and registering it where the JWT lives avoids a second
 * configuration of the same secret (pd-13, A13). Order matters — `AuthGuard`
 * first, so an anonymous request is refused as unauthenticated before
 * `RolesGuard` can call it unauthorised.
 *
 * The consequence is deliberate: **every route is closed unless it says
 * otherwise.** A controller added tomorrow without `@Public()` answers 401, and
 * the `public-routes` e2e is the net that catches an open route marked shut by
 * accident (ADR-0011 R3, inverted here).
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
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    RegisterUserUseCase,
    LoginUseCase,
    RefreshTokensUseCase,
    LogoutUseCase,
    FindAuthenticatedUserUseCase,
    UpdateUserPhoneUseCase,
    SessionIssuer,
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: REFRESH_TOKEN_REPOSITORY, useClass: PrismaRefreshTokenRepository },
    { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
    { provide: TOKEN_SERVICE, useClass: JwtTokenService },
  ],
  // `tutors` reads the identity behind a request and writes the tutor's phone
  // onto it, and may not touch the `users` table itself (CODING_STANDARDS):
  // both go through these two use cases, the same way `offers` reaches
  // `stores`.
  exports: [JwtModule, FindAuthenticatedUserUseCase, UpdateUserPhoneUseCase],
})
export class IdentityModule {}
