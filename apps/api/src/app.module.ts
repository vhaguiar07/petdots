import { randomUUID } from 'node:crypto';

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { LoggerModule } from 'nestjs-pino';
import { ZodValidationPipe } from 'nestjs-zod';

import { HttpExceptionFilter } from './common/http-exception.filter.js';
import { type Env, validateEnv } from './config/env.schema.js';
import { ROOT_ENV_FILE } from './config/paths.js';
import { HealthModule } from './health/health.module.js';
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
    WaitlistModule,
  ],
  providers: [
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
