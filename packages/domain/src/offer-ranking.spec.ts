import { InvalidMoneyOperationError } from './money.js';
import {
  compareByItemPrice,
  compareByLandedPrice,
  type LandedOffer,
  landedPriceCents,
} from './offer-ranking.js';

const offer = (landedCents: number, estimatedMinutes: number, storeName: string): LandedOffer => ({
  landedCents,
  estimatedMinutes,
  storeName,
});

describe('landedPriceCents', () => {
  it('adds the item and the delivery in integer cents', () => {
    expect(landedPriceCents(3990, 690)).toBe(4680);
  });

  it('accepts a free delivery', () => {
    expect(landedPriceCents(3990, 0)).toBe(3990);
  });

  it('rejects a non-integer amount, which would mean cents in floating point', () => {
    expect(() => landedPriceCents(39.9, 690)).toThrow(InvalidMoneyOperationError);
  });

  it('rejects a negative delivery fee', () => {
    expect(() => landedPriceCents(3990, -1)).toThrow(InvalidMoneyOperationError);
  });
});

describe('compareByLandedPrice', () => {
  it('ranks the cheapest total first, not the cheapest item', () => {
    const cheapItemExpensiveTrip = offer(4990, 40, 'A');
    const dearItemCheapTrip = offer(4680, 40, 'B');

    expect([cheapItemExpensiveTrip, dearItemCheapTrip].sort(compareByLandedPrice)).toEqual([
      dearItemCheapTrip,
      cheapItemExpensiveTrip,
    ]);
  });

  it('breaks a price tie by the shorter delivery time', () => {
    const slow = offer(4680, 70, 'A');
    const fast = offer(4680, 45, 'B');

    expect([slow, fast].sort(compareByLandedPrice)).toEqual([fast, slow]);
  });

  it('breaks a full tie by store name in pt-BR, so the order never wobbles', () => {
    const zeta = offer(4680, 45, 'Zoo Pet');
    const acai = offer(4680, 45, 'Açaí Pet');

    // Without the locale, `Ç` would sort after `Z` by code point.
    expect([zeta, acai].sort(compareByLandedPrice)).toEqual([acai, zeta]);
  });

  it('is total: sorting a shuffled list twice gives the same order', () => {
    const list = [offer(4680, 45, 'B'), offer(4680, 45, 'A'), offer(3990, 60, 'C')];

    const once = [...list].sort(compareByLandedPrice);
    const twice = [...list].reverse().sort(compareByLandedPrice);

    expect(twice).toEqual(once);
  });
});

describe('compareByItemPrice', () => {
  it('ranks by the item price when there is no address', () => {
    const dear = { priceCents: 3990, storeName: 'A' };
    const cheap = { priceCents: 3790, storeName: 'B' };

    expect([dear, cheap].sort(compareByItemPrice)).toEqual([cheap, dear]);
  });

  it('breaks a tie by store name', () => {
    const b = { priceCents: 3990, storeName: 'B' };
    const a = { priceCents: 3990, storeName: 'A' };

    expect([b, a].sort(compareByItemPrice)).toEqual([a, b]);
  });
});
