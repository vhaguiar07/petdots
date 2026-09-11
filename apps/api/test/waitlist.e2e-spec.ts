import type { Server } from 'node:http';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { waitlistEntrySchema } from '@petdots/contracts';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';

import { API_PREFIX } from '../src/openapi.js';
import { startMigratedPostgres } from './support/postgres.js';

const WAITLIST_URL = `/${API_PREFIX}/waitlist-entries`;

const VALID_BODY = {
  name: '  Victor  ',
  phone: '21999999999',
  neighborhood: 'Engenho Novo',
  postalCode: '20720-000',
  petFoodDeclared: 'Golden Fórmula',
  source: 'CAMPAIGN',
  consent: true,
};

interface ErrorEnvelope {
  error: { code: string; message: string; details: { field: string; message: string }[] };
}

describe('Waitlist (e2e)', () => {
  let container: StartedPostgreSqlContainer;
  let app: INestApplication;

  beforeAll(async () => {
    const postgres = await startMigratedPostgres();
    container = postgres.container;

    process.env.DATABASE_URL = postgres.url;
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';

    // Same deferral as the health suite: `ConfigModule.forRoot()` validates the
    // environment while the module file is evaluated.
    const { AppModule } = await import('../src/app.module.js');

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleRef.createNestApplication({ bufferLogs: true });
    app.setGlobalPrefix(API_PREFIX);
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    await container?.stop();
  });

  const server = (): Server => app.getHttpServer() as Server;

  it('creates an entry, normalised and trimmed', async () => {
    const response = await request(server()).post(WAITLIST_URL).send(VALID_BODY);

    expect(response.status).toBe(201);

    const body = waitlistEntrySchema.parse(response.body);
    expect(body.phone).toBe('+5521999999999');
    expect(body.postalCode).toBe('20720000');
    expect(body.name).toBe('Victor');
    expect(body.source).toBe('CAMPAIGN');
    expect(body.consentAt).toEqual(expect.any(String));

    // No read route exists for this resource, so no Location header (A8).
    expect(response.headers.location).toBeUndefined();
  });

  it('rejects the same phone written differently', async () => {
    // The sentinel of the whole feature: without the unique index the smoke
    // test would count one person twice (pd-09, A9).
    const response = await request(server())
      .post(WAITLIST_URL)
      .send({ ...VALID_BODY, phone: '(21) 99999-9999', name: 'Victor de novo' });

    expect(response.status).toBe(409);

    const { error } = response.body as ErrorEnvelope;
    expect(error.code).toBe('WAITLIST_ENTRY_ALREADY_EXISTS');
  });

  it('rejects an invalid postal code with 422 and points at the field', async () => {
    const response = await request(server())
      .post(WAITLIST_URL)
      .send({ ...VALID_BODY, phone: '21988887777', postalCode: '2072000' });

    expect(response.status).toBe(422);

    const { error } = response.body as ErrorEnvelope;
    expect(error.code).toBe('VALIDATION_FAILED');
    expect(error.details.map((detail) => detail.field)).toContain('postalCode');
  });

  it('rejects a source outside the enum with 422', async () => {
    const response = await request(server())
      .post(WAITLIST_URL)
      .send({ ...VALID_BODY, phone: '21977776666', source: 'INSTAGRAM' });

    expect(response.status).toBe(422);

    const { error } = response.body as ErrorEnvelope;
    expect(error.code).toBe('VALIDATION_FAILED');
    expect(error.details.map((detail) => detail.field)).toContain('source');
  });
});
