import {
  deliveryAreaSchema,
  findStoreParamsSchema,
  listDeliveryAreasQuerySchema,
  postalCodeRangeSchema,
  storeMembershipListSchema,
  storeRoleSchema,
  storeSchema,
  updateOpeningHoursSchema,
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

describe('storeSchema', () => {
  const VALID_STORE = {
    id: '7c9d1a3b-4d5e-4f60-9b0c-1d2e3f4a5b6c',
    slug: 'petshop-amigo-fiel',
    name: 'Petshop Amigo Fiel',
    neighborhood: 'Méier',
    status: 'ACTIVE',
    deliveryAreas: [VALID_AREA],
    openingHours: [{ weekday: 1, opens: '08:00', closes: '19:00' }],
  };

  it('accepts a store with its areas', () => {
    expect(storeSchema.safeParse(VALID_STORE).success).toBe(true);
  });

  it('accepts a store with no area at all — it exists, it just delivers nowhere yet', () => {
    expect(storeSchema.safeParse({ ...VALID_STORE, deliveryAreas: [] }).success).toBe(true);
  });

  it('refuses a status outside the domain enum', () => {
    expect(storeSchema.safeParse({ ...VALID_STORE, status: 'ABERTA' }).success).toBe(false);
  });

  it('carries the weekly schedule since pd-15, and refuses a malformed one', () => {
    expect(storeSchema.parse(VALID_STORE).openingHours).toHaveLength(1);
    // An empty schedule is valid and means "never open" — the shopfront says so.
    expect(storeSchema.safeParse({ ...VALID_STORE, openingHours: [] }).success).toBe(true);
    expect(
      storeSchema.safeParse({
        ...VALID_STORE,
        openingHours: [{ weekday: 1, opens: '19:00', closes: '08:00' }],
      }).success,
    ).toBe(false);
  });

  it('requires the schedule — a store without one could never be asked "está aberta?"', () => {
    const { openingHours: _omitted, ...withoutHours } = VALID_STORE;

    expect(storeSchema.safeParse(withoutHours).success).toBe(false);
  });
});

describe('findStoreParamsSchema', () => {
  it('refuses a slug where a uuid is expected, and says so in Portuguese', () => {
    const result = findStoreParamsSchema.safeParse({ storeId: 'petshop-amigo-fiel' });

    expect(result.success).toBe(false);
    expect(result.success ? [] : result.error.issues.map((issue) => issue.message)).toEqual([
      'Loja inválida.',
    ]);
  });
});

describe('storeRoleSchema', () => {
  it('knows the two roles ADR-0013 settled, and nothing else', () => {
    expect(storeRoleSchema.parse('OWNER')).toBe('OWNER');
    expect(storeRoleSchema.parse('OPERATOR')).toBe('OPERATOR');
    expect(storeRoleSchema.safeParse('ADMIN').success).toBe(false);
    expect(storeRoleSchema.safeParse('STORE_MEMBER').success).toBe(false);
  });
});

describe('storeMembershipListSchema', () => {
  const STORE = {
    id: '7c9d1a3b-4d5e-4f60-9b0c-1d2e3f4a5b6c',
    slug: 'petshop-amigo-fiel',
    name: 'Petshop Amigo Fiel',
    neighborhood: 'Méier',
  };

  it('accepts a person who operates two shops in different capacities', () => {
    const parsed = storeMembershipListSchema.parse({
      items: [
        { store: STORE, role: 'OWNER' },
        { store: { ...STORE, id: '6b8c0f2a-3c4d-4e5f-8a9b-0c1d2e3f4a5b' }, role: 'OPERATOR' },
      ],
    });

    expect(parsed.items.map((item) => item.role)).toEqual(['OWNER', 'OPERATOR']);
  });

  it('accepts an empty list, which is a STORE_MEMBER whose last shop was unlinked', () => {
    expect(storeMembershipListSchema.parse({ items: [] }).items).toEqual([]);
  });

  it('🔴 does not carry the status: the panel opens for a paused shop too', () => {
    const parsed = storeMembershipListSchema.parse({
      items: [{ store: { ...STORE, status: 'PAUSED' }, role: 'OWNER' }],
    });

    expect(parsed.items[0]?.store).not.toHaveProperty('status');
  });
});

describe('updateOpeningHoursSchema', () => {
  it('accepts a day split by a lunch break', () => {
    expect(
      updateOpeningHoursSchema.safeParse({
        openingHours: [
          { weekday: 2, opens: '08:00', closes: '12:00' },
          { weekday: 2, opens: '14:00', closes: '19:00' },
        ],
      }).success,
    ).toBe(true);
  });

  it('refuses the two stretches overlapping', () => {
    expect(
      updateOpeningHoursSchema.safeParse({
        openingHours: [
          { weekday: 2, opens: '08:00', closes: '15:00' },
          { weekday: 2, opens: '14:00', closes: '19:00' },
        ],
      }).success,
    ).toBe(false);
  });

  it('🔴 accepts an empty week: it means the shop stops taking orders, and that is legal', () => {
    expect(updateOpeningHoursSchema.parse({ openingHours: [] })).toEqual({ openingHours: [] });
  });
});
