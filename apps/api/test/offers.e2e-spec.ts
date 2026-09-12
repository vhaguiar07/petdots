import type { Server } from 'node:http';

import { comparedOfferListSchema, storeOfferListSchema } from '@petdots/contracts';
import request from 'supertest';

import { API_PREFIX } from '../src/openapi.js';
import { FIXTURE_NAMES } from './support/seed-fixture.js';
import { type SeededApp, startSeededApp, stopSeededApp } from './support/seeded-app.js';

const OFFERS_URL = `/${API_PREFIX}/offers`;
const STORES_URL = `/${API_PREFIX}/stores`;
const UNKNOWN_UUID = '00000000-0000-4000-8000-000000000000';

interface ErrorEnvelope {
  error: { code: string; message: string; details: { field: string; message: string }[] };
}

/** Asserts a single-item list and hands the item back, still typed. */
function onlyOf<T>(items: T[]): T {
  expect(items).toHaveLength(1);

  const [only] = items;

  if (!only) {
    throw new Error('expected exactly one offer');
  }

  return only;
}

describe('Offers — the comparator (e2e)', () => {
  let seeded: SeededApp;

  beforeAll(async () => {
    seeded = await startSeededApp();
  }, 180_000);

  afterAll(async () => {
    await stopSeededApp(seeded);
  });

  const server = (): Server => seeded.app.getHttpServer() as Server;

  const compare = async (query: Record<string, string>) => {
    const response = await request(server()).get(OFFERS_URL).query(query);

    expect(response.status).toBe(200);

    return comparedOfferListSchema.parse(response.body);
  };

  it('lists only the stores covering the neighbourhood, with the landed price', async () => {
    const body = await compare({ productId: seeded.ids.p1, neighborhood: 'Méier' });
    const offer = onlyOf(body.items);

    expect(offer.store.name).toBe(FIXTURE_NAMES.a);
    expect(offer.priceCents).toBe(3990);
    expect(offer.deliveryArea).toEqual({
      label: 'Méier',
      deliveryFeeCents: 690,
      estimatedMinutes: 45,
    });
    expect(offer.landedCents).toBe(3990 + 690);
  });

  it('matches the neighbourhood without accent or case', async () => {
    const body = await compare({ productId: seeded.ids.p1, neighborhood: 'meier' });

    expect(body.items.map((offer) => offer.store.name)).toEqual([FIXTURE_NAMES.a]);
  });

  it('lists only the stores covering the postal code', async () => {
    const body = await compare({ productId: seeded.ids.p1, postalCode: '20725-000' });
    const offer = onlyOf(body.items);

    expect(offer.store.name).toBe(FIXTURE_NAMES.b);
    expect(offer.priceCents).toBe(3790);
    expect(offer.landedCents).toBe(3790 + 490);
  });

  it('ranks by item price and hides the totals when there is no address', async () => {
    const body = await compare({ productId: seeded.ids.p1 });

    // B is cheaper on the item; with no address the delivery is unknown.
    expect(body.items.map((offer) => offer.priceCents)).toEqual([3790, 3990]);
    expect(body.items.every((offer) => offer.deliveryArea === null)).toBe(true);
    expect(body.items.every((offer) => offer.landedCents === null)).toBe(true);
  });

  it('never lists a paused store, even though it is the cheapest and covers everything', async () => {
    // The sentinel of the listing rule: C sells P1 at 2990, covers every
    // neighbourhood and every CEP, and delivers for free.
    const everywhere = await Promise.all([
      compare({ productId: seeded.ids.p1 }),
      compare({ productId: seeded.ids.p1, neighborhood: 'Méier' }),
      compare({ productId: seeded.ids.p1, postalCode: '20725000' }),
    ]);

    for (const body of everywhere) {
      expect(body.items.map((offer) => offer.store.name)).not.toContain(FIXTURE_NAMES.c);
      expect(body.items.map((offer) => offer.priceCents)).not.toContain(2990);
    }
  });

  it('never lists an unavailable offer', async () => {
    // A carries P4 but marked unavailable; B carries it and covers the CEP.
    const byPostalCode = await compare({ productId: seeded.ids.p4, postalCode: '20725000' });
    expect(byPostalCode.items.map((offer) => offer.store.name)).toEqual([FIXTURE_NAMES.b]);

    // A covers Méier, but its only P4 offer is off the shelf.
    const byNeighborhood = await compare({ productId: seeded.ids.p4, neighborhood: 'Méier' });
    expect(byNeighborhood.items).toEqual([]);
  });

  it('answers an empty list for a product nobody offers', async () => {
    const body = await compare({ productId: seeded.ids.p2 });

    expect(body.items).toEqual([]);
  });

  it('answers an empty list — not 404 — for a neighbourhood outside the pilot', async () => {
    const body = await compare({ productId: seeded.ids.p1, neighborhood: 'Copacabana' });

    expect(body.items).toEqual([]);
  });

  it('answers 404 with the specific code for an unknown product', async () => {
    const response = await request(server()).get(OFFERS_URL).query({ productId: UNKNOWN_UUID });

    expect(response.status).toBe(404);
    expect((response.body as ErrorEnvelope).error.code).toBe('PRODUCT_NOT_FOUND');
  });

  it('refuses a request without a product', async () => {
    const response = await request(server()).get(OFFERS_URL);

    expect(response.status).toBe(422);

    const { error } = response.body as ErrorEnvelope;
    expect(error.code).toBe('VALIDATION_FAILED');
    expect(error.details.map((detail) => detail.message)).toContain('Informe o produto.');
  });

  it('refuses a malformed postal code, pointing at the field', async () => {
    const response = await request(server())
      .get(OFFERS_URL)
      .query({ productId: seeded.ids.p1, postalCode: '2072' });

    expect(response.status).toBe(422);
    expect((response.body as ErrorEnvelope).error.details.map((detail) => detail.field)).toContain(
      'postalCode',
    );
  });

  describe("a store's shelf", () => {
    const shelf = async (storeId: string) => {
      const response = await request(server()).get(`${STORES_URL}/${storeId}/offers`);

      expect(response.status).toBe(200);

      return storeOfferListSchema.parse(response.body);
    };

    it('lists what the store has on the shelf, with the product resolved', async () => {
      // B carries P1 and P4, both available.
      const body = await shelf(seeded.ids.b);

      expect(body.items.map((item) => item.product.name)).toEqual([
        'Golden Ração Cães Adultos',
        'Pipicat Areia Sanitária',
      ]);

      const [golden] = body.items;
      expect(golden?.priceCents).toBe(3790);
      expect(golden?.product.brand).toBe('Golden');
      expect(golden?.product.variant).toBe('15 kg');
    });

    it('orders by product name in pt-BR, not by the order the rows came back', async () => {
      const body = await shelf(seeded.ids.b);
      const names = body.items.map((item) => item.product.name);

      expect(names).toEqual([...names].sort((a, b) => new Intl.Collator('pt-BR').compare(a, b)));
    });

    it('never lists an unavailable offer', async () => {
      // A carries P1 (available) and P4 (off the shelf).
      const body = await shelf(seeded.ids.a);

      expect(body.items.map((item) => item.product.name)).toEqual(['Golden Ração Cães Adultos']);
    });

    it('🔴 answers 404 for a paused store, exactly as the store page does', async () => {
      // C has the cheapest P1 offer of all. A page that listed it would sell
      // what the comparator refuses to show.
      const response = await request(server()).get(`${STORES_URL}/${seeded.ids.c}/offers`);

      expect(response.status).toBe(404);
      expect((response.body as ErrorEnvelope).error.code).toBe('STORE_NOT_FOUND');
    });

    it('answers 404 for a uuid nobody uses — never an empty list', async () => {
      const response = await request(server()).get(`${STORES_URL}/${UNKNOWN_UUID}/offers`);

      expect(response.status).toBe(404);
      expect((response.body as ErrorEnvelope).error.code).toBe('STORE_NOT_FOUND');
    });

    it('refuses an id that is not a uuid with 422', async () => {
      const response = await request(server()).get(`${STORES_URL}/nao-e-uuid/offers`);

      expect(response.status).toBe(422);
      expect(
        (response.body as ErrorEnvelope).error.details.map((detail) => detail.field),
      ).toContain('storeId');
    });
  });
});
