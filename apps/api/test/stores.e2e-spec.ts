import type { Server } from 'node:http';

import { deliveryAreaListSchema } from '@petdots/contracts';
import request from 'supertest';

import { API_PREFIX } from '../src/openapi.js';
import { FIXTURE_NAMES } from './support/seed-fixture.js';
import { type SeededApp, startSeededApp, stopSeededApp } from './support/seeded-app.js';

const DELIVERY_AREAS_URL = `/${API_PREFIX}/delivery-areas`;

interface ErrorEnvelope {
  error: { code: string; details: { field: string; message: string }[] };
}

describe('Delivery areas (e2e)', () => {
  let seeded: SeededApp;

  beforeAll(async () => {
    seeded = await startSeededApp();
  }, 180_000);

  afterAll(async () => {
    await stopSeededApp(seeded);
  });

  const server = (): Server => seeded.app.getHttpServer() as Server;

  const list = async (query: Record<string, string> = {}) => {
    const response = await request(server()).get(DELIVERY_AREAS_URL).query(query);

    expect(response.status).toBe(200);

    return deliveryAreaListSchema.parse(response.body);
  };

  it('lists every area of every listable store, and none of a paused one', async () => {
    const body = await list();

    expect(body.items.map((area) => area.store.name).sort()).toEqual([
      FIXTURE_NAMES.a,
      FIXTURE_NAMES.b,
    ]);
    expect(body.items.map((area) => area.store.name)).not.toContain(FIXTURE_NAMES.c);
  });

  it('parses the postal ranges out of JSONB instead of handing back raw JSON', async () => {
    const body = await list();

    const cachambi = body.items.find((area) => area.store.name === FIXTURE_NAMES.b);
    expect(cachambi?.postalCodeRanges).toEqual([{ from: '20720000', to: '20729999' }]);
  });

  it('filters by neighbourhood without accent or case', async () => {
    const body = await list({ neighborhood: 'meier' });

    expect(body.items.map((area) => area.store.name)).toEqual([FIXTURE_NAMES.a]);
  });

  it('filters by postal code, which A does not cover', async () => {
    const body = await list({ postalCode: '20725000' });

    expect(body.items.map((area) => area.store.name)).toEqual([FIXTURE_NAMES.b]);
  });

  it('answers an empty list for a neighbourhood outside the pilot', async () => {
    const body = await list({ neighborhood: 'Copacabana' });

    expect(body.items).toEqual([]);
  });

  it('refuses a malformed postal code with 422', async () => {
    const response = await request(server()).get(DELIVERY_AREAS_URL).query({ postalCode: '123' });

    expect(response.status).toBe(422);

    const { error } = response.body as ErrorEnvelope;
    expect(error.code).toBe('VALIDATION_FAILED');
    expect(error.details.map((detail) => detail.field)).toContain('postalCode');
  });
});
