import { randomUUID } from 'node:crypto';

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { LoggerModule } from 'nestjs-pino';
import { ZodValidationPipe } from 'nestjs-zod';

import { AuditModule } from './audit/audit.module.js';
import { RATE_LIMIT_ENABLED, RateLimitGuard } from './common/guards/rate-limit.guard.js';
import { RateLimitStore } from './common/guards/rate-limit.store.js';
import { HttpExceptionFilter } from './common/http-exception.filter.js';
import { type Env, validateEnv } from './config/env.schema.js';
import { ROOT_ENV_FILE } from './config/paths.js';
import { HealthModule } from './health/health.module.js';
import { CatalogModule } from './modules/catalog/catalog.module.js';
import { IdentityModule } from './modules/identity/identity.module.js';
import { OffersModule } from './modules/offers/offers.module.js';
import { OrdersModule } from './modules/orders/orders.module.js';
import { PaymentsModule } from './modules/payments/payments.module.js';
import { PostalCodesModule } from './modules/postal-codes/postal-codes.module.js';
import { StoresModule } from './modules/stores/stores.module.js';
import { TutorsModule } from './modules/tutors/tutors.module.js';
import { WaitlistModule } from './modules/waitlist/waitlist.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

const CORRELATION_ID_HEADER = 'x-correlation-id';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      envFilePath: ROOT_ENV_FILE,
      // Tests get their environment injected (an ephemeral container URL, for
      // one) and must not inherit the developer's .env.
      ignoreEnvFile: process.env.NODE_ENV === 'test',
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        pinoHttp: {
          level: config.get('LOG_LEVEL', { infer: true }),
          // NAMING_CONVENTIONS names the field `timestamp`, not pino's `time`.
          timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
          genReqId: (_req: IncomingMessage, res: ServerResponse) => {
            const id = randomUUID();
            res.setHeader('x-request-id', id);
            return id;
          },
          customProps: (req: IncomingMessage) => {
            const requestId = (req as IncomingMessage & { id?: string }).id ?? '';
            const header = req.headers[CORRELATION_ID_HEADER];
            const correlationId = typeof header === 'string' && header ? header : requestId;

            return { requestId, correlationId };
          },
          redact: {
            paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
            censor: '[redacted]',
          },
          transport:
            config.get('NODE_ENV', { infer: true }) === 'development'
              ? { target: 'pino-pretty', options: { singleLine: true } }
              : undefined,
        },
      }),
    }),
    PrismaModule,
    HealthModule,
    IdentityModule,
    WaitlistModule,
    CatalogModule,
    StoresModule,
    OffersModule,
    PostalCodesModule,
    TutorsModule,
    AuditModule,
    PaymentsModule,
    OrdersModule,
  ],
  providers: [
    // 🔴 The throttle is registered **here**, in the root module, and not in a
    // feature module: Nest scans the root's own providers before those of the
    // modules it imports, so this global guard runs ahead of the `AuthGuard`
    // and `RolesGuard` that `IdentityModule` contributes. A flood is refused
    // before a token is verified or a password is hashed.
    RateLimitStore,
    {
      // 🔴 **Off under `NODE_ENV=test`**, the same bargain the expiry sweeper
      // makes: a suite's budget is its own. The identity e2e logs in dozens of
      // times and the waitlist e2e posts more leads than any human would, and
      // both would start failing on the sixth request for a reason that has
      // nothing to do with what they test.
      //
      // Three suites buy back what the switch would otherwise hide:
      // `rate-limit.store.spec.ts` (the counting), `rate-limit.guard.e2e-spec`
      // (the refusal, over a throwaway controller) and
      // `rate-limit.routes.e2e-spec`, which overrides **this provider** to
      // `true` and drives the real controllers — including the assertion that
      // this guard runs ahead of `AuthGuard`.
      provide: RATE_LIMIT_ENABLED,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): boolean =>
        config.get('NODE_ENV', { infer: true }) !== 'test',
    },
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
