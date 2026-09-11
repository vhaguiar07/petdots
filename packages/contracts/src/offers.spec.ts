import { comparedOfferSchema, compareOffersQuerySchema } from './offers.js';

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
});
