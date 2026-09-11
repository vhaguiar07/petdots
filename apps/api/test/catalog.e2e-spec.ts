import type { Server } from 'node:http';

import { productListSchema, productSchema } from '@petdots/contracts';
import request from 'supertest';

import { API_PREFIX } from '../src/openapi.js';
import { FIXTURE_SLUGS } from './support/seed-fixture.js';
import { type SeededApp, startSeededApp, stopSeededApp } from './support/seeded-app.js';

const PRODUCTS_URL = `/${API_PREFIX}/products`;
const UNKNOWN_UUID = '00000000-0000-4000-8000-000000000000';

interface ErrorEnvelope {
  error: { code: string; message: string; details: { field: string; message: string }[] };
}

describe('Catalog (e2e)', () => {
  let seeded: SeededApp;

  beforeAll(async () => {
    seeded = await startSeededApp();
  }, 180_000);

  afterAll(async () => {
    await stopSeededApp(seeded);
  });

  const server = (): Server => seeded.app.getHttpServer() as Server;

  it('lists the catalogue with the pagination envelope', async () => {
    const response = await request(server()).get(PRODUCTS_URL);

    expect(response.status).toBe(200);

    const body = productListSchema.parse(response.body);
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(20);
    // Four active products; the fifth is inactive.
    expect(body.total).toBe(4);
  });

  it('never shows an inactive product', async () => {
    const response = await request(server()).get(PRODUCTS_URL).query({ pageSize: 50 });

    const body = productListSchema.parse(response.body);
    expect(body.items.map((item) => item.slug)).not.toContain(FIXTURE_SLUGS.p3);
    expect(body.items.every((item) => item.active)).toBe(true);
  });

  it('orders by brand, then name, then weight', async () => {
    const response = await request(server()).get(PRODUCTS_URL).query({ pageSize: 50 });

    const body = productListSchema.parse(response.body);
    expect(body.items.map((item) => item.brand)).toEqual(['Elanco', 'Golden', 'Golden', 'Pipicat']);
  });

  it('finds an accented name with an unaccented term', async () => {
    const response = await request(server()).get(PRODUCTS_URL).query({ q: 'racao' });

    const body = productListSchema.parse(response.body);
    expect(body.total).toBe(1);
    expect(body.items.map((item) => item.slug)).toEqual([FIXTURE_SLUGS.p1]);
  });

  it('ANDs the tokens of a multi-word term', async () => {
    const broad = await request(server()).get(PRODUCTS_URL).query({ q: 'golden' });
    const narrow = await request(server()).get(PRODUCTS_URL).query({ q: 'golden 15' });

    // Two active Golden products; only one of them is the 15 kg bag.
    expect(productListSchema.parse(broad.body).total).toBe(2);

    const body = productListSchema.parse(narrow.body);
    expect(body.total).toBe(1);
    expect(body.items.map((item) => item.slug)).toEqual([FIXTURE_SLUGS.p1]);
  });

  it('answers an empty page for a term nothing matches', async () => {
    const response = await request(server()).get(PRODUCTS_URL).query({ q: 'bicicleta' });

    const body = productListSchema.parse(response.body);
    expect(body.total).toBe(0);
    expect(body.items).toEqual([]);
  });

  it('looks a product up by its public slug', async () => {
    const response = await request(server()).get(PRODUCTS_URL).query({ slug: FIXTURE_SLUGS.p1 });

    const body = productListSchema.parse(response.body);
    expect(body.total).toBe(1);
    expect(body.items.map((item) => item.name)).toEqual(['Golden Ração Cães Adultos']);
  });

  it('paginates, and the total describes the filter, not the page', async () => {
    const response = await request(server()).get(PRODUCTS_URL).query({ pageSize: 2, page: 2 });

    const body = productListSchema.parse(response.body);
    expect(body.total).toBe(4);
    expect(body.items).toHaveLength(2);
    expect(body.page).toBe(2);
  });

  it('refuses a page size above the ceiling, pointing at the field', async () => {
    const response = await request(server()).get(PRODUCTS_URL).query({ pageSize: 999 });

    expect(response.status).toBe(422);

    const { error } = response.body as ErrorEnvelope;
    expect(error.code).toBe('VALIDATION_FAILED');
    expect(error.details.map((detail) => detail.field)).toContain('pageSize');
  });

  it('answers one product by id', async () => {
    const response = await request(server()).get(`${PRODUCTS_URL}/${seeded.ids.p1}`);

    expect(response.status).toBe(200);

    const body = productSchema.parse(response.body);
    expect(body.slug).toBe(FIXTURE_SLUGS.p1);
    expect(body.ean).toBeNull();
    expect(body.netWeightGrams).toBe(15000);
  });

  it('answers 404 with the specific code for an unknown product', async () => {
    const response = await request(server()).get(`${PRODUCTS_URL}/${UNKNOWN_UUID}`);

    expect(response.status).toBe(404);
    expect((response.body as ErrorEnvelope).error.code).toBe('PRODUCT_NOT_FOUND');
  });

  it('refuses an id that is not a uuid with 422', async () => {
    const response = await request(server()).get(`${PRODUCTS_URL}/golden-15-kg`);

    expect(response.status).toBe(422);

    const { error } = response.body as ErrorEnvelope;
    expect(error.code).toBe('VALIDATION_FAILED');
    expect(error.details.map((detail) => detail.field)).toContain('productId');
  });
});
