import {
  InvalidOrderPricingError,
  lineTotalCents,
  MAX_LINE_QUANTITY,
  MAX_ORDER_LINES,
  orderTotals,
  SERVICE_FEE_CENTS,
} from './order-pricing.js';

const line = (unitPriceCents: number, quantity: number, commissionAmountCents = 0) => ({
  unitPriceCents,
  quantity,
  commissionAmountCents,
});

describe('SERVICE_FEE_CENTS', () => {
  it('is R$ 1,99, under the R$ 2,99 ceiling of ADR-0003', () => {
    expect(SERVICE_FEE_CENTS).toBe(199);
    expect(SERVICE_FEE_CENTS).toBeLessThanOrEqual(299);
  });
});

describe('lineTotalCents', () => {
  it('multiplies in integer space', () => {
    expect(lineTotalCents(3790, 2)).toBe(7580);
    expect(lineTotalCents(1690, 1)).toBe(1690);
  });

  it('refuses a non-positive price or quantity', () => {
    expect(() => lineTotalCents(0, 1)).toThrow(InvalidOrderPricingError);
    expect(() => lineTotalCents(3790, 0)).toThrow(InvalidOrderPricingError);
    expect(() => lineTotalCents(-100, 1)).toThrow(InvalidOrderPricingError);
  });

  it('refuses a fractional price — money is integer cents', () => {
    expect(() => lineTotalCents(37.9, 1)).toThrow(InvalidOrderPricingError);
  });
});

describe('orderTotals', () => {
  it('🔴 total is items plus delivery plus service, exactly', () => {
    const totals = orderTotals({
      lines: [line(3790, 2, 379), line(1690, 1, 135)],
      deliveryFeeCents: 490,
      serviceFeeCents: SERVICE_FEE_CENTS,
    });

    expect(totals.itemsTotalCents).toBe(9270);
    expect(totals.totalCents).toBe(9270 + 490 + 199);
    expect(totals.commissionTotalCents).toBe(514);
  });

  it('sums the commission of every line', () => {
    expect(
      orderTotals({
        lines: [line(1000, 1, 60), line(2000, 2, 240), line(500, 3, 90)],
        deliveryFeeCents: 0,
        serviceFeeCents: 0,
      }).commissionTotalCents,
    ).toBe(390);
  });

  it('accepts a free delivery area', () => {
    expect(
      orderTotals({ lines: [line(1000, 1)], deliveryFeeCents: 0, serviceFeeCents: 199 }).totalCents,
    ).toBe(1199);
  });

  it('refuses an order with no line', () => {
    expect(() => orderTotals({ lines: [], deliveryFeeCents: 0, serviceFeeCents: 0 })).toThrow(
      InvalidOrderPricingError,
    );
  });

  it('refuses more lines than the sanity cap', () => {
    const lines = Array.from({ length: MAX_ORDER_LINES + 1 }, () => line(100, 1));

    expect(() => orderTotals({ lines, deliveryFeeCents: 0, serviceFeeCents: 0 })).toThrow(
      InvalidOrderPricingError,
    );
  });

  it('accepts exactly the sanity cap', () => {
    const lines = Array.from({ length: MAX_ORDER_LINES }, () => line(100, 1));

    expect(orderTotals({ lines, deliveryFeeCents: 0, serviceFeeCents: 0 }).itemsTotalCents).toBe(
      MAX_ORDER_LINES * 100,
    );
  });

  it('refuses a quantity above the per-line cap', () => {
    expect(() =>
      orderTotals({
        lines: [line(100, MAX_LINE_QUANTITY + 1)],
        deliveryFeeCents: 0,
        serviceFeeCents: 0,
      }),
    ).toThrow(InvalidOrderPricingError);
  });

  it('refuses a negative fee', () => {
    expect(() =>
      orderTotals({ lines: [line(100, 1)], deliveryFeeCents: -1, serviceFeeCents: 0 }),
    ).toThrow(InvalidOrderPricingError);
    expect(() =>
      orderTotals({ lines: [line(100, 1)], deliveryFeeCents: 0, serviceFeeCents: -1 }),
    ).toThrow(InvalidOrderPricingError);
  });
});
