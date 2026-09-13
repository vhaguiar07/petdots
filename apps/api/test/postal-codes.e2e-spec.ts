import type { Server } from 'node:http';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { authTokensSchema, postalCodeAddressSchema } from '@petdots/contracts';
import type { PostalCodeAddress } from '@petdots/contracts';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import type { Response } from 'supertest';

import { PostalCodeLookupFailedError } from '../src/modules/postal-codes/domain/postal-code-lookup-failed.error.js';
import { API_PREFIX } from '../src/openapi.js';
import { startMigratedPostgres } from './support/postgres.js';

const MEIER: PostalCodeAddress = {
  postalCode: '20720000',
  street: 'Rua Dias da Cruz',
  neighborhood: 'Méier',
  city: 'Rio de Janeiro',
  state: 'RJ',
};

/**
 * 🔴 The directory is faked, and that is the point of the port existing.
 *
 * A suite that called ViaCEP for real would fail when somebody else's server is
 * slow, would be useless offline and on a CI runner without egress, and would
 * make us a load generator for a free service. What is under test here is *our*
 * behaviour — the normalisation, the two distinct failures, the closed door —
 * and none of that lives on their side.
 */
class FakeDirectory {
  asked: string[] = [];
  answer: 'found' | 'missing' | 'unreachable' = 'found';

  findByPostalCode(postalCode: string): Promise<PostalCodeAddress | null> {
    this.asked.push(postalCode);

    if (this.answer === 'unreachable') {
      return Promise.reject(new PostalCodeLookupFailedError('fake outage'));
    }

    return Promise.resolve(this.answer === 'found' ? { ...MEIER, postalCode } : null);
  }
}

interface ErrorEnvelope {
  error: { code: string; message: string };
}

describe('Postal codes (e2e)', () => {
  let container: StartedPostgreSqlContainer;
  let app: INestApplication;
  let directory: FakeDirectory;
  let token = '';

  beforeAll(async () => {
    const postgres = await startMigratedPostgres();
    container = postgres.container;

    process.env.DATABASE_URL = postgres.url;
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';

    const { AppModule } = await import('../src/app.module.js');
    const { POSTAL_CODE_GATEWAY } =
      await import('../src/modules/postal-codes/domain/ipostal-code.gateway.js');

    directory = new FakeDirectory();

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(POSTAL_CODE_GATEWAY)
      .useValue(directory)
      .compile();

    app = moduleRef.createNestApplication({ bufferLogs: true });
    app.setGlobalPrefix(API_PREFIX);
    await app.init();

    const registered = await request(app.getHttpServer() as Server)
      .post(`/${API_PREFIX}/auth/register`)
      .send({ email: 'cep@petdots.com.br', password: 'petdots-dev-2026' });

    token = authTokensSchema.parse(registered.body).accessToken;
  }, 180_000);

  afterAll(async () => {
    await app?.close();
    await container?.stop();
  });

  const get = async (postalCode: string, withToken = true): Promise<Response> => {
    const call = request(app.getHttpServer() as Server).get(
      `/${API_PREFIX}/postal-codes/${postalCode}`,
    );

    return withToken ? call.set('Authorization', `Bearer ${token}`) : call;
  };

  const codeOf = (response: Response): string => (response.body as ErrorEnvelope).error.code;

  beforeEach(() => {
    directory.asked = [];
    directory.answer = 'found';
  });

  it('🔴 P1 — the route is closed: no token, no lookup', async () => {
    // An open endpoint that forwards a path parameter to a third party is a
    // proxy anyone can aim at them, on our IP.
    const response = await get('20720000', false);

    expect(response.status).toBe(401);
    expect(directory.asked).toEqual([]);
  });

  it('P2 — resolves a CEP to its street and neighbourhood', async () => {
    const response = await get('20720000');

    expect(response.status).toBe(200);

    const address = postalCodeAddressSchema.parse(response.body);
    expect(address.street).toBe('Rua Dias da Cruz');
    expect(address.neighborhood).toBe('Méier');
    expect(address.city).toBe('Rio de Janeiro');
    expect(address.state).toBe('RJ');
  });

  it('P3 — normalises before asking, so the hyphen never reaches the directory', async () => {
    await get('20720-000');

    expect(directory.asked).toEqual(['20720000']);
  });

  it('P4 — a malformed CEP is refused at the border, without asking anyone', async () => {
    const response = await get('2072');

    expect(response.status).toBe(422);
    expect(codeOf(response)).toBe('VALIDATION_FAILED');
    // The cheapest request is the one never made.
    expect(directory.asked).toEqual([]);
  });

  it('P5 — a CEP the directory does not know is 404', async () => {
    directory.answer = 'missing';

    const response = await get('99999999');

    expect(response.status).toBe(404);
    expect(codeOf(response)).toBe('POSTAL_CODE_NOT_FOUND');
  });

  it('🔴 P6 — the directory being down is 503, never 404', async () => {
    // The distinction the whole module exists to preserve: "esse CEP não
    // existe" and "não consegui perguntar" are different facts, and the second
    // must never be shown to a person as the first — their CEP may be right.
    directory.answer = 'unreachable';

    const response = await get('20720000');

    expect(response.status).toBe(503);
    expect(codeOf(response)).toBe('POSTAL_CODE_LOOKUP_UNAVAILABLE');
  });

  it('P7 — a CEP único answers with empty street and neighbourhood, not a failure', async () => {
    // Whole small towns share one CEP and name no street. The shape has to
    // carry that, or a client fills a field it believes is populated.
    directory.findByPostalCode = () =>
      Promise.resolve({
        postalCode: '76200000',
        street: '',
        neighborhood: '',
        city: 'Iporá',
        state: 'GO',
      });

    const response = await get('76200000');

    expect(response.status).toBe(200);
    expect(postalCodeAddressSchema.parse(response.body).street).toBe('');
  });
});
