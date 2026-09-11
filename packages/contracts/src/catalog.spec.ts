import { listProductsQuerySchema, productSchema } from './catalog.js';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from './pagination.js';

const fieldOf = (query: unknown): string[] => {
  const result = listProductsQuerySchema.safeParse(query);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
};

describe('listProductsQuerySchema', () => {
  it('fills in the pagination when the visitor sent none', () => {
    expect(listProductsQuerySchema.parse({})).toEqual({
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
    });
  });

  it('coerces the query string, which always arrives as text', () => {
    expect(listProductsQuerySchema.parse({ page: '3', pageSize: '10' })).toEqual({
      page: 3,
      pageSize: 10,
    });
  });

  it('refuses a page size above the ceiling, pointing at the field', () => {
    expect(fieldOf({ pageSize: '999' })).toEqual(['pageSize']);
  });

  it('accepts exactly the ceiling', () => {
    expect(listProductsQuerySchema.parse({ pageSize: String(MAX_PAGE_SIZE) }).pageSize).toBe(
      MAX_PAGE_SIZE,
    );
  });

  it('refuses page zero and negative pages', () => {
    expect(fieldOf({ page: '0' })).toEqual(['page']);
    expect(fieldOf({ page: '-1' })).toEqual(['page']);
  });

  it('refuses a page that is not a number', () => {
    expect(fieldOf({ page: 'primeira' })).toEqual(['page']);
  });

  it('trims the search term', () => {
    expect(listProductsQuerySchema.parse({ q: '  golden  ' }).q).toBe('golden');
  });

  it('refuses a search term longer than the field allows', () => {
    expect(fieldOf({ q: 'x'.repeat(81) })).toEqual(['q']);
  });
});

describe('productSchema', () => {
  const VALID = {
    id: '6b8c0f2a-3c4d-4e5f-8a9b-0c1d2e3f4a5b',
    slug: 'golden-formula-caes-adultos-15-kg',
    ean: null,
    name: 'Golden Fórmula Cães Adultos Frango e Arroz',
    brand: 'Golden',
    category: 'FOOD_PREMIUM',
    variant: '15 kg',
    netWeightGrams: 15000,
    imageUrl: null,
    requiresPrescription: false,
    active: true,
  };

  it('accepts a curated product without EAN', () => {
    expect(productSchema.safeParse(VALID).success).toBe(true);
  });

  it('refuses a category outside the enum', () => {
    expect(productSchema.safeParse({ ...VALID, category: 'RACAO' }).success).toBe(false);
  });

  it('refuses a weightless product, which would break the price per kilo', () => {
    expect(productSchema.safeParse({ ...VALID, netWeightGrams: 0 }).success).toBe(false);
  });
});
