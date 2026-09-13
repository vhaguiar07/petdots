import type { Server } from 'node:http';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';

import { RATE_LIMIT_ENABLED } from '../src/common/guards/rate-limit.guard.js';
import { RATE_LIMITS } from '../src/common/guards/rate-limits.js';
import { API_PREFIX } from '../src/openapi.js';
import { startMigratedPostgres } from './support/postgres.js';

const WAITLIST_URL = `/${API_PREFIX}/waitlist-entries`;
const POSTAL_CODE_URL = `/${API_PREFIX}/postal-codes/20720000`;

interface ErrorEnvelope {
  error: { code: string; message: string };
}

const leadNumbered = (index: number): Record<string, unknown> => ({
  name: `Teste ${String(index)}`,
  // A different phone each time, so the only thing that can refuse the request
  // is the throttle — never the unique index on `phone`.
  phone: `2199999${String(index).padStart(4, '0')}`,
  neighborhood: 'Engenho Novo',
  postalCode: '20720-000',
  source: 'CAMPAIGN',
  consent: true,
});

/**
 * 🔴 The throttle against the **real** controllers, with the switch forced on.
 *
 * `AppModule` turns it off under `NODE_ENV=test` so that every other suite has
 * its own budget; this one overrides that single provider, which is the only
 * way to see the annotations actually bite. What it proves that
 * `rate-limit.guard.e2e-spec.ts` and `rate-limit.routes.spec.ts` cannot:
 *
 * - the policies are wired to the routes a caller can really reach, through the
 *   global prefix and the exception filter of the live application;
 * - **the guard runs ahead of `AuthGuard`** — a flood with no token at all is
 *   refused as 429 instead of answering 401 for ever. That ordering is what
 *   keeps a login flood from paying for an argon2 hash apiece, and it depends
 *   on Nest scanning the root module's own providers before those of the
 *   modules it imports. Nothing in the framework promises that in writing, so
 *   it is pinned here.
 */
describe('Rate limit on the real routes (e2e)', () => {
  let container: StartedPostgreSqlContainer;
  let app: INestApplication;

  beforeAll(async () => {
    const postgres = await startMigratedPostgres();
    container = postgres.container;

    process.env.DATABASE_URL = postgres.url;
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';

    // Same deferral as the other suites: `ConfigModule.forRoot()` validates the
    // environment while the module file is evaluated.
    const { AppModule } = await import('../src/app.module.js');

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(RATE_LIMIT_ENABLED)
      .useValue(true)
      .compile();

    app = moduleRef.createNestApplication({ bufferLogs: true });
    app.setGlobalPrefix(API_PREFIX);
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    await container?.stop();
  });

  const server = (): Server => app.getHttpServer() as Server;

  it('lets the waitlist through its budget and then refuses', async () => {
    for (let index = 1; index <= RATE_LIMITS.WAITLIST_JOIN.limit; index += 1) {
      const allowed = await request(server()).post(WAITLIST_URL).send(leadNumbered(index));
      expect(allowed.status).toBe(201);
    }

    const refused = await request(server())
      .post(WAITLIST_URL)
      .send(leadNumbered(RATE_LIMITS.WAITLIST_JOIN.limit + 1));

    expect(refused.status).toBe(429);
    expect((refused.body as ErrorEnvelope).error.code).toBe('RATE_LIMITED');
    expect(Number(refused.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('throttles an authenticated route before authenticating it', async () => {
    // No token on any of these. If `AuthGuard` ran first they would be 401 for
    // ever and the counter would never move.
    for (let attempt = 1; attempt <= RATE_LIMITS.POSTAL_CODE_LOOKUP.limit; attempt += 1) {
      const unauthenticated = await request(server()).get(POSTAL_CODE_URL);
      expect(unauthenticated.status).toBe(401);
    }

    const refused = await request(server()).get(POSTAL_CODE_URL);

    expect(refused.status).toBe(429);
    expect((refused.body as ErrorEnvelope).error.code).toBe('RATE_LIMITED');
  });
});
