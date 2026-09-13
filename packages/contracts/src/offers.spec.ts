import {
  comparedOfferSchema,
  compareOffersQuerySchema,
  createStoreOfferSchema,
  listStoreOffersQuerySchema,
  storeOfferSchema,
  updateOfferAvailabilitySchema,
  updateOfferPriceSchema,
} from './offers.js';

const PRODUCT_ID = '6b8c0f2a-3c4d-4e5f-8a9b-0c1d2e3f4a5b';

const fieldOf = (query: unknown): string[] => {
  const result = compareOffersQuerySchema.safeParse(query);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
};

describe('compareOffersQuerySchema', () => {
  it('accepts a comparison with no address — the page still lists who sells it', () => {
    expect(compareOffersQuerySchema.parse({ productId: PRODUCT_ID })).toEqual({
      productId: PRODUCT_ID,
    });
  });

  it('accepts the neighbourhood alone and the CEP alone', () => {
    expect(
      compareOffersQuerySchema.safeParse({ productId: PRODUCT_ID, neighborhood: 'Méier' }).success,
    ).toBe(true);
    expect(
      compareOffersQuerySchema.safeParse({ productId: PRODUCT_ID, postalCode: '20725-000' })
        .success,
    ).toBe(true);
  });

  it('requires the product, and says so in Portuguese', () => {
    const result = compareOffersQuerySchema.safeParse({});

    expect(result.success).toBe(false);
    expect(result.success ? [] : result.error.issues.map((issue) => issue.message)).toEqual([
      'Informe o produto.',
    ]);
  });

  it('refuses a product that is not a uuid', () => {
    expect(fieldOf({ productId: 'golden-15-kg' })).toEqual(['productId']);
  });

  it('refuses a malformed CEP, pointing at the field', () => {
    expect(fieldOf({ productId: PRODUCT_ID, postalCode: '2072' })).toEqual(['postalCode']);
  });
});

describe('comparedOfferSchema', () => {
  const VALID = {
    offerId: '7c9d1a3b-4d5e-4f60-9b0c-1d2e3f4a5b6c',
    priceCents: 3990,
    priceUpdatedAt: '2026-09-11T00:00:00.000Z',
    store: {
      id: PRODUCT_ID,
      slug: 'petshop-amigo-fiel',
      name: 'Petshop Amigo Fiel',
      neighborhood: 'Méier',
      openingHours: [{ weekday: 1, opens: '08:00', closes: '19:00' }],
    },
    deliveryArea: { label: 'Méier e vizinhos', deliveryFeeCents: 690, estimatedMinutes: 45 },
    landedCents: 4680,
  };

  it('accepts an offer compared with an address', () => {
    expect(comparedOfferSchema.safeParse(VALID).success).toBe(true);
  });

  it('accepts an offer with no address: area and landed price are null together', () => {
    expect(
      comparedOfferSchema.safeParse({ ...VALID, deliveryArea: null, landedCents: null }).success,
    ).toBe(true);
  });

  it('refuses a free item — a price of zero is a data error, not a promotion', () => {
    expect(comparedOfferSchema.safeParse({ ...VALID, priceCents: 0 }).success).toBe(false);
  });

  it('🔴 exige a agenda da loja — é o que a linha usa para dizer "Fechada"', () => {
    const { openingHours: _omitida, ...semAgenda } = VALID.store;

    expect(comparedOfferSchema.safeParse({ ...VALID, store: semAgenda }).success).toBe(false);
  });

  it('aceita agenda vazia, que significa "nunca abre"', () => {
    expect(
      comparedOfferSchema.safeParse({ ...VALID, store: { ...VALID.store, openingHours: [] } })
        .success,
    ).toBe(true);
  });

  it('recusa agenda com faixas sobrepostas, como em qualquer outro lugar', () => {
    const sobreposta = [
      { weekday: 2, opens: '08:00', closes: '15:00' },
      { weekday: 2, opens: '14:00', closes: '19:00' },
    ];

    expect(
      comparedOfferSchema.safeParse({
        ...VALID,
        store: { ...VALID.store, openingHours: sobreposta },
      }).success,
    ).toBe(false);
  });

  it('🔴 não deixa passar o status da loja: o comparador lista tudo que não é PAUSED', () => {
    const parsed = comparedOfferSchema.parse({
      ...VALID,
      store: { ...VALID.store, status: 'PROSPECT' },
    });

    expect(parsed.store).not.toHaveProperty('status');
  });
});

describe('storeOfferSchema', () => {
  const VALID = {
    offerId: '7c9d1a3b-4d5e-4f60-9b0c-1d2e3f4a5b6c',
    priceCents: 3990,
    priceUpdatedAt: '2026-09-11T00:00:00.000Z',
    available: true,
    product: {
      id: PRODUCT_ID,
      slug: 'golden-racao-caes-adultos-15-kg',
      name: 'Golden Ração Cães Adultos',
      brand: 'Golden',
      variant: '15 kg',
    },
  };

  it('accepts a shelf line', () => {
    expect(storeOfferSchema.safeParse(VALID).success).toBe(true);
  });

  it('refuses a free item, exactly as the comparator does', () => {
    expect(storeOfferSchema.safeParse({ ...VALID, priceCents: 0 }).success).toBe(false);
  });

  it('🔴 does not let the store through — the store is the page, not the row', () => {
    const parsed = storeOfferSchema.parse({
      ...VALID,
      store: { id: PRODUCT_ID, slug: 'x', name: 'x', neighborhood: 'x' },
    });

    expect(parsed).not.toHaveProperty('store');
  });
});

describe('listStoreOffersQuerySchema', () => {
  it('leaves the shopfront alone when nobody asks for the whole shelf', () => {
    expect(listStoreOffersQuerySchema.parse({})).toEqual({});
  });

  it('accepts the panel asking for the switched-off rows too', () => {
    expect(listStoreOffersQuerySchema.parse({ unavailable: 'true' })).toEqual({
      unavailable: 'true',
    });
  });

  it('🔴 refuses anything but "true" — a silent false would hide half the shelf', () => {
    expect(listStoreOffersQuerySchema.safeParse({ unavailable: '0' }).success).toBe(false);
    expect(listStoreOffersQuerySchema.safeParse({ unavailable: 'false' }).success).toBe(false);
  });
});

describe('updateOfferPriceSchema', () => {
  it('accepts a price in cents', () => {
    expect(updateOfferPriceSchema.parse({ priceCents: 3990 })).toEqual({ priceCents: 3990 });
  });

  it('refuses zero and a fraction of a cent', () => {
    expect(updateOfferPriceSchema.safeParse({ priceCents: 0 }).success).toBe(false);
    expect(updateOfferPriceSchema.safeParse({ priceCents: -100 }).success).toBe(false);
    expect(updateOfferPriceSchema.safeParse({ priceCents: 39.9 }).success).toBe(false);
  });
});

describe('updateOfferAvailabilitySchema', () => {
  it('accepts both answers to "tenho?"', () => {
    expect(updateOfferAvailabilitySchema.parse({ available: false })).toEqual({ available: false });
    expect(updateOfferAvailabilitySchema.parse({ available: true })).toEqual({ available: true });
  });

  it('refuses a string — "false" is truthy, and that is a real bug', () => {
    expect(updateOfferAvailabilitySchema.safeParse({ available: 'false' }).success).toBe(false);
  });
});

describe('createStoreOfferSchema', () => {
  it('puts a catalogue product on the shelf, available by default', () => {
    expect(createStoreOfferSchema.parse({ productId: PRODUCT_ID, priceCents: 3990 })).toEqual({
      productId: PRODUCT_ID,
      priceCents: 3990,
      available: true,
    });
  });

  it('refuses a product named by slug — the shelf points at the shared catalogue by id', () => {
    expect(
      createStoreOfferSchema.safeParse({ productId: 'golden-15-kg', priceCents: 3990 }).success,
    ).toBe(false);
  });
});
