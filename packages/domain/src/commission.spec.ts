import {
  commissionAmountCents,
  CommissionRateNotFoundError,
  type CommissionRateRule,
  isRuleValidAt,
  resolveCommissionRateBps,
  type StoreCommissionRateRule,
} from './commission.js';

const AT = new Date('2026-09-13T12:00:00.000Z');
const FROM = new Date('2026-09-01T00:00:00.000Z');

/** The seeded hypothesis of ADR-0003, as the pd-15 seed writes it. */
const TABLE: CommissionRateRule[] = [
  { category: 'FOOD_STANDARD', rateBps: 600, validFrom: FROM, validTo: null },
  { category: 'FOOD_PREMIUM', rateBps: 900, validFrom: FROM, validTo: null },
  { category: 'HYGIENE', rateBps: 800, validFrom: FROM, validTo: null },
  { category: 'HEALTH_OTC', rateBps: 1200, validFrom: FROM, validTo: null },
  { category: 'ACCESSORY', rateBps: 1200, validFrom: FROM, validTo: null },
  { category: 'TREAT', rateBps: 1000, validFrom: FROM, validTo: null },
];

const resolve = (
  category: string,
  storeRates: StoreCommissionRateRule[] = [],
  channel: 'PLATFORM' | 'STORE_REFERRAL' = 'PLATFORM',
  at: Date = AT,
): number =>
  resolveCommissionRateBps({
    category,
    acquisitionChannel: channel,
    storeRates,
    tableRates: TABLE,
    at,
  });

describe('isRuleValidAt', () => {
  const rule: CommissionRateRule = {
    category: 'HYGIENE',
    rateBps: 800,
    validFrom: FROM,
    validTo: new Date('2026-10-01T00:00:00.000Z'),
  };

  it('includes the first instant and excludes the last', () => {
    expect(isRuleValidAt(rule, FROM)).toBe(true);
    expect(isRuleValidAt(rule, new Date('2026-09-30T23:59:59.999Z'))).toBe(true);
    expect(isRuleValidAt(rule, new Date('2026-10-01T00:00:00.000Z'))).toBe(false);
  });

  it('is not yet valid before it starts', () => {
    expect(isRuleValidAt(rule, new Date('2026-08-31T23:59:59.999Z'))).toBe(false);
  });

  it('a null end never expires', () => {
    expect(isRuleValidAt({ ...rule, validTo: null }, new Date('2099-01-01T00:00:00.000Z'))).toBe(
      true,
    );
  });
});

describe('resolveCommissionRateBps', () => {
  it('reads the table for each of the six categories', () => {
    expect(resolve('FOOD_STANDARD')).toBe(600);
    expect(resolve('FOOD_PREMIUM')).toBe(900);
    expect(resolve('HYGIENE')).toBe(800);
    expect(resolve('HEALTH_OTC')).toBe(1200);
    expect(resolve('ACCESSORY')).toBe(1200);
    expect(resolve('TREAT')).toBe(1000);
  });

  it("🔴 the store's own rate beats the table — the founder tariff", () => {
    const override: StoreCommissionRateRule = {
      storeId: 'store-b',
      category: 'FOOD_PREMIUM',
      rateBps: 500,
      validFrom: FROM,
      validTo: null,
    };

    expect(resolve('FOOD_PREMIUM', [override])).toBe(500);
    // And only for the category it names.
    expect(resolve('HYGIENE', [override])).toBe(800);
  });

  it('an expired override falls back to the table', () => {
    const expired: StoreCommissionRateRule = {
      storeId: 'store-b',
      category: 'FOOD_PREMIUM',
      rateBps: 500,
      validFrom: FROM,
      validTo: new Date('2026-09-10T00:00:00.000Z'),
    };

    expect(resolve('FOOD_PREMIUM', [expired])).toBe(900);
  });

  it('an override that has not started yet falls back to the table', () => {
    const future: StoreCommissionRateRule = {
      storeId: 'store-b',
      category: 'FOOD_PREMIUM',
      rateBps: 500,
      validFrom: new Date('2026-12-01T00:00:00.000Z'),
      validTo: null,
    };

    expect(resolve('FOOD_PREMIUM', [future])).toBe(900);
  });

  it('two rules in force pick the one that started most recently', () => {
    const rates: CommissionRateRule[] = [
      { category: 'HYGIENE', rateBps: 800, validFrom: FROM, validTo: null },
      {
        category: 'HYGIENE',
        rateBps: 750,
        validFrom: new Date('2026-09-10T00:00:00.000Z'),
        validTo: null,
      },
    ];

    expect(
      resolveCommissionRateBps({
        category: 'HYGIENE',
        acquisitionChannel: 'PLATFORM',
        storeRates: [],
        tableRates: rates,
        at: AT,
      }),
    ).toBe(750);
  });

  it('🔴 a customer the store brought in pays zero, even with an override', () => {
    const override: StoreCommissionRateRule = {
      storeId: 'store-b',
      category: 'FOOD_PREMIUM',
      rateBps: 500,
      validFrom: FROM,
      validTo: null,
    };

    expect(resolve('FOOD_PREMIUM', [], 'STORE_REFERRAL')).toBe(0);
    expect(resolve('FOOD_PREMIUM', [override], 'STORE_REFERRAL')).toBe(0);
  });

  it('zero by referral does not need a rate in force at all', () => {
    expect(
      resolveCommissionRateBps({
        category: 'UNKNOWN',
        acquisitionChannel: 'STORE_REFERRAL',
        storeRates: [],
        tableRates: [],
        at: AT,
      }),
    ).toBe(0);
  });

  it('🔴 raises when no rate is in force, instead of quietly charging nothing', () => {
    expect(() => resolve('UNKNOWN')).toThrow(CommissionRateNotFoundError);
    expect(() => resolve('HYGIENE', [], 'PLATFORM', new Date('2026-08-01T00:00:00.000Z'))).toThrow(
      CommissionRateNotFoundError,
    );
  });
});

describe('commissionAmountCents', () => {
  it('rounds half up, the way applyBasisPoints decided', () => {
    // 3990 × 9% = 359,1 → 359.
    expect(commissionAmountCents(3990, 900)).toBe(359);
    // 3995 × 6% = 239,7 → 240.
    expect(commissionAmountCents(3995, 600)).toBe(240);
    // Exactly half a cent goes up: 2500 × 6% = 150,0 is exact; 2508 × 6% = 150,48 → 150.
    expect(commissionAmountCents(2508, 600)).toBe(150);
  });

  it('is zero for a zero rate and for a zero amount', () => {
    expect(commissionAmountCents(3990, 0)).toBe(0);
    expect(commissionAmountCents(0, 900)).toBe(0);
  });

  it('matches the e2e expectations of the fixture', () => {
    // Two Golden at 3790 with the store's 500 bps override.
    expect(commissionAmountCents(7580, 500)).toBe(379);
    // One Pipicat at 1690 on the HYGIENE table rate.
    expect(commissionAmountCents(1690, 800)).toBe(135);
  });
});
