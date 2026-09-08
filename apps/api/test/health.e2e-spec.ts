import type { Server } from 'node:http';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { healthResponseSchema } from '@petdots/contracts';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';

import { API_PREFIX } from '../src/openapi.js';

const HEALTH_URL = `/${API_PREFIX}/health`;

describe('Health (e2e)', () => {
  let container: StartedPostgreSqlContainer;
  let app: INestApplication;
  let containerStopped = false;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();

    process.env.DATABASE_URL = container.getConnectionUri();
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';

    // Loaded only now, on purpose: `ConfigModule.forRoot()` runs while the
    // module file is being evaluated, so a static import would validate the
    // environment before the container URL above exists.
    const { AppModule } = await import('../src/app.module.js');

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleRef.createNestApplication({ bufferLogs: true });
    app.setGlobalPrefix(API_PREFIX);
    await app.init();
  });

  afterAll(async () => {
    await app?.close();

    if (!containerStopped) {
      await container?.stop();
    }
  });

  /** `getHttpServer()` is typed `any`; naming the type keeps the suite checked. */
  const server = (): Server => app.getHttpServer() as Server;

  it('reports ok while the database answers', async () => {
    const response = await request(server()).get(HEALTH_URL);

    expect(response.status).toBe(200);

    const body = healthResponseSchema.parse(response.body);
    expect(body.status).toBe('ok');
    expect(body.database).toBe('up');
  });

  it('reports degraded with 503 once the database is gone', async () => {
    await container.stop();
    containerStopped = true;

    const response = await request(server()).get(HEALTH_URL);

    expect(response.status).toBe(503);

    // Same shape on failure — a client parses both outcomes with one schema.
    const body = healthResponseSchema.parse(response.body);
    expect(body.status).toBe('degraded');
    expect(body.database).toBe('down');
  });
});
