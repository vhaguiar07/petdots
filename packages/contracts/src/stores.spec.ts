import {
  deliveryAreaSchema,
  listDeliveryAreasQuerySchema,
  postalCodeRangeSchema,
} from './stores.js';

const VALID_AREA = {
  id: '6b8c0f2a-3c4d-4e5f-8a9b-0c1d2e3f4a5b',
  storeId: '7c9d1a3b-4d5e-4f60-9b0c-1d2e3f4a5b6c',
  label: 'Méier e vizinhos',
  neighborhoods: ['Méier', 'Todos os Santos'],
  postalCodeRanges: [{ from: '20720000', to: '20729999' }],
  deliveryFeeCents: 690,
  estimatedMinutes: 45,
  active: true,
};

describe('postalCodeRangeSchema', () => {
  it('accepts a range of two bare CEPs in order', () => {
    expect(postalCodeRangeSchema.safeParse({ from: '20720000', to: '20729999' }).success).toBe(
      true,
    );
  });

  it('refuses the hyphenated spelling, which would break the comparison', () => {
    expect(postalCodeRangeSchema.safeParse({ from: '20720-000', to: '20729-999' }).success).toBe(
      false,
    );
  });

  it('refuses an inverted range', () => {
    expect(postalCodeRangeSchema.safeParse({ from: '20729999', to: '20720000' }).success).toBe(
      false,
    );
  });
});

describe('deliveryAreaSchema', () => {
  it('accepts a filled-in area', () => {
    expect(deliveryAreaSchema.safeParse(VALID_AREA).success).toBe(true);
  });

  it('accepts a free delivery, but not a negative fee', () => {
    expect(deliveryAreaSchema.safeParse({ ...VALID_AREA, deliveryFeeCents: 0 }).success).toBe(true);
    expect(deliveryAreaSchema.safeParse({ ...VALID_AREA, deliveryFeeCents: -1 }).success).toBe(
      false,
    );
  });

  it('refuses an area with no neighbourhood at all', () => {
    expect(deliveryAreaSchema.safeParse({ ...VALID_AREA, neighborhoods: [] }).success).toBe(false);
  });

  it('accepts an area covered only by postal ranges', () => {
    expect(deliveryAreaSchema.safeParse({ ...VALID_AREA, postalCodeRanges: [] }).success).toBe(
      true,
    );
  });
});

describe('listDeliveryAreasQuerySchema', () => {
  it('accepts an empty filter — the landing lists every area to fill the picker', () => {
    expect(listDeliveryAreasQuerySchema.parse({})).toEqual({});
  });

  it('refuses a CEP with four digits, pointing at the field', () => {
    const result = listDeliveryAreasQuerySchema.safeParse({ postalCode: '2072' });

    expect(result.success).toBe(false);
    expect(result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'))).toEqual([
      'postalCode',
    ]);
  });

  it('accepts the hyphenated CEP the visitor types', () => {
    expect(listDeliveryAreasQuerySchema.parse({ postalCode: '20725-000' }).postalCode).toBe(
      '20725-000',
    );
  });
});
