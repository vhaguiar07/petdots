import type { Server } from 'node:http';

import { Controller, Get, type INestApplication } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { RateLimit } from '../src/common/guards/rate-limit.decorator.js';
import { RATE_LIMIT_ENABLED, RateLimitGuard } from '../src/common/guards/rate-limit.guard.js';
import { RateLimitStore } from '../src/common/guards/rate-limit.store.js';
import { HttpExceptionFilter } from '../src/common/http-exception.filter.js';

const BUDGET = { limit: 2, windowMs: 60_000 } as const;

/**
 * The guard is exercised over a throwaway controller, the same way
 * `guards.e2e-spec.ts` exercises `AuthGuard` and `RolesGuard`.
 *
 * 🔴 It has to be: the throttle is **off under `NODE_ENV=test`** (`AppModule`
 * explains the bargain), so a suite booting the real application sees no 429
 * unless it overrides that switch — which costs a Postgres container. This one
 * therefore covers the guard's own behaviour at no cost, and the wiring of the
 * four real routes is left to `rate-limit.routes.spec.ts` (their metadata) and
 * `rate-limit.routes.e2e-spec.ts` (their behaviour, container and all).
 */
@Controller('throttled')
class ThrottledController {
  @Get('one')
  @RateLimit(BUDGET)
  one(): { ok: true } {
    return { ok: true };
  }

  @Get('two')
  @RateLimit(BUDGET)
  two(): { ok: true } {
    return { ok: true };
  }

  @Get('free')
  free(): { ok: true } {
    return { ok: true };
  }
}

interface ErrorEnvelope {
  error: { code: string; message: string };
}

interface AppOptions {
  enabled?: boolean;
  trustProxyHops?: number;
}

async function startApp({
  enabled = true,
  trustProxyHops = 0,
}: AppOptions = {}): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    controllers: [ThrottledController],
    providers: [
      RateLimitStore,
      { provide: RATE_LIMIT_ENABLED, useValue: enabled },
      { provide: APP_GUARD, useClass: RateLimitGuard },
      { provide: APP_FILTER, useClass: HttpExceptionFilter },
    ],
  }).compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>({ bufferLogs: true });

  if (trustProxyHops > 0) {
    app.set('trust proxy', trustProxyHops);
  }

  await app.init();

  return app;
}

describe('RateLimitGuard (e2e)', () => {
  const apps: INestApplication[] = [];

  const start = async (options?: AppOptions): Promise<INestApplication> => {
    const app = await startApp(options);
    apps.push(app);
    return app;
  };

  afterAll(async () => {
    await Promise.all(apps.map((app) => app.close()));
  });

  const server = (app: INestApplication): Server => app.getHttpServer() as Server;

  it('serves the budget, then answers 429 with RATE_LIMITED and Retry-After', async () => {
    const app = await start();

    for (let attempt = 1; attempt <= BUDGET.limit; attempt += 1) {
      const allowed = await request(server(app)).get('/throttled/one');
      expect(allowed.status).toBe(200);
    }

    const refused = await request(server(app)).get('/throttled/one');

    expect(refused.status).toBe(429);

    const body = refused.body as ErrorEnvelope;
    expect(body.error.code).toBe('RATE_LIMITED');
    // The message says to try later and never how much budget is left or when
    // exactly it resets beyond the header — a counter is a probe.
    expect(body.error.message).toBe('Muitas tentativas. Tente de novo em instantes.');

    // Seconds, and never zero: `Retry-After: 0` reads as "right now".
    expect(Number(refused.headers['retry-after'])).toBeGreaterThan(0);
    expect(Number(refused.headers['retry-after'])).toBeLessThanOrEqual(60);
  });

  it('gives each route its own budget', async () => {
    const app = await start();

    for (let attempt = 1; attempt <= BUDGET.limit + 1; attempt += 1) {
      await request(server(app)).get('/throttled/one');
    }

    // Exhausting one route must not spend another's: on the real API a person
    // who mistyped their password six times still has to be able to look up a
    // CEP.
    expect((await request(server(app)).get('/throttled/two')).status).toBe(200);
  });

  it('leaves unannotated routes alone', async () => {
    const app = await start();

    for (let attempt = 1; attempt <= 10; attempt += 1) {
      await request(server(app)).get('/throttled/one');
    }

    expect((await request(server(app)).get('/throttled/free')).status).toBe(200);
  });

  it('refuses nothing when the throttle is switched off', async () => {
    const app = await start({ enabled: false });

    for (let attempt = 1; attempt <= BUDGET.limit + 3; attempt += 1) {
      expect((await request(server(app)).get('/throttled/one')).status).toBe(200);
    }
  });

  it('separates callers by forwarded address once a proxy is trusted', async () => {
    const app = await start({ trustProxyHops: 1 });

    for (let attempt = 1; attempt <= BUDGET.limit + 1; attempt += 1) {
      await request(server(app)).get('/throttled/one').set('X-Forwarded-For', '203.0.113.1');
    }

    const other = await request(server(app))
      .get('/throttled/one')
      .set('X-Forwarded-For', '203.0.113.2');

    expect(other.status).toBe(200);
  });

  it('ignores a forwarded address when no proxy is trusted', async () => {
    const app = await start();

    for (let attempt = 1; attempt <= BUDGET.limit + 1; attempt += 1) {
      await request(server(app)).get('/throttled/one').set('X-Forwarded-For', '203.0.113.1');
    }

    // 🔴 The header is a string the caller chose. Without `trust proxy` it
    // buys nothing: every request still counts against the real socket peer,
    // so rotating it cannot mint fresh budget.
    const other = await request(server(app))
      .get('/throttled/one')
      .set('X-Forwarded-For', '203.0.113.2');

    expect(other.status).toBe(429);
  });

  it('takes the address the trusted proxy observed, not the one the caller prepended', async () => {
    const app = await start({ trustProxyHops: 1 });

    // One hop is trusted, so the right-most entry is what our own edge wrote.
    // A caller forging entries only prepends noise to the left of it, and all
    // four requests below land in the same bucket.
    for (let attempt = 1; attempt <= BUDGET.limit + 1; attempt += 1) {
      await request(server(app))
        .get('/throttled/one')
        .set('X-Forwarded-For', `198.51.100.${String(attempt)}, 203.0.113.9`);
    }

    const forged = await request(server(app))
      .get('/throttled/one')
      .set('X-Forwarded-For', '198.51.100.250, 203.0.113.9');

    expect(forged.status).toBe(429);
  });
});
