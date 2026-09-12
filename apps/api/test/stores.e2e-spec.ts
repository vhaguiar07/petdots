import type { Server } from 'node:http';

import { deliveryAreaListSchema, storeSchema } from '@petdots/contracts';
import request from 'supertest';

import { API_PREFIX } from '../src/openapi.js';
import { FIXTURE_NAMES, FIXTURE_SLUGS } from './support/seed-fixture.js';
import { type SeededApp, startSeededApp, stopSeededApp } from './support/seeded-app.js';

const DELIVERY_AREAS_URL = `/${API_PREFIX}/delivery-areas`;
const STORES_URL = `/${API_PREFIX}/stores`;
const UNKNOWN_UUID = '00000000-0000-4000-8000-000000000000';

interface ErrorEnvelope {
  error: { code: string; details: { field: string; message: string }[] };
}

// One container for both halves of the module: the store page and the delivery
// areas read the same rows, and a second ephemeral Postgres would double the
// slowest part of the suite for nothing.
describe('Stores (e2e)', () => {
  let seeded: SeededApp;

  beforeAll(async () => {
    seeded = await startSeededApp();
  }, 180_000);

  afterAll(async () => {
    await stopSeededApp(seeded);
  });

  const server = (): Server => seeded.app.getHttpServer() as Server;

  describe('Delivery areas', () => {
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

    it('never lists a switched-off area, though nothing else covers its neighbourhood', async () => {
      const body = await list({ neighborhood: 'Engenho Novo' });

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

  describe('Store page', () => {
    const find = async (storeId: string) => {
      const response = await request(server()).get(`${STORES_URL}/${storeId}`);

      expect(response.status).toBe(200);

      return storeSchema.parse(response.body);
    };

    it('answers the store with its slug, status and active areas', async () => {
      const store = await find(seeded.ids.a);

      expect(store.name).toBe(FIXTURE_NAMES.a);
      expect(store.slug).toBe(FIXTURE_SLUGS.a);
      expect(store.neighborhood).toBe('Méier');
      expect(store.status).toBe('PROSPECT');
      expect(store.deliveryAreas.map((area) => area.label)).toEqual(['Méier']);
    });

    it('🔴 leaves the switched-off area out of the page', async () => {
      const store = await find(seeded.ids.a);

      // A's second area exists in the table and is inactive. Showing it here
      // would promise a delivery the comparator refuses to make.
      expect(store.deliveryAreas.every((area) => area.active)).toBe(true);
      expect(store.deliveryAreas.map((area) => area.label)).not.toContain(
        'Engenho Novo (desativada)',
      );
    });

    it('parses the postal ranges out of JSONB here too', async () => {
      const store = await find(seeded.ids.b);

      expect(store.deliveryAreas[0]?.postalCodeRanges).toEqual([
        { from: '20720000', to: '20729999' },
      ]);
    });

    it('🔴 answers 404 for a paused store — invisible here as in the comparator', async () => {
      const response = await request(server()).get(`${STORES_URL}/${seeded.ids.c}`);

      expect(response.status).toBe(404);
      expect((response.body as ErrorEnvelope).error.code).toBe('STORE_NOT_FOUND');
    });

    it('answers 404 for a uuid nobody uses', async () => {
      const response = await request(server()).get(`${STORES_URL}/${UNKNOWN_UUID}`);

      expect(response.status).toBe(404);
      expect((response.body as ErrorEnvelope).error.code).toBe('STORE_NOT_FOUND');
    });

    it('refuses an id that is not a uuid with 422, pointing at the field', async () => {
      const response = await request(server()).get(`${STORES_URL}/nao-e-uuid`);

      expect(response.status).toBe(422);

      const { error } = response.body as ErrorEnvelope;
      expect(error.code).toBe('VALIDATION_FAILED');
      expect(error.details.map((detail) => detail.field)).toContain('storeId');
    });
  });
});
