import { MAX_LINE_QUANTITY, MAX_ORDER_LINES } from '@petdots/domain';

import {
  createOrderSchema,
  idempotencyKeySchema,
  orderStatusSchema,
  quoteOrderSchema,
  refundReasonSchema,
} from './orders.js';
import { openingHoursSchema } from './stores.js';

const OFFER = '11111111-1111-4111-8111-111111111111';
const STORE = '22222222-2222-4222-8222-222222222222';

const cart = (items: { offerId: string; quantity: number }[]) => ({ storeId: STORE, items });

describe('quoteOrderSchema', () => {
  it('accepts a cart of one store with one line', () => {
    expect(quoteOrderSchema.safeParse(cart([{ offerId: OFFER, quantity: 2 }])).success).toBe(true);
  });

  it('refuses an empty cart', () => {
    const result = quoteOrderSchema.safeParse(cart([]));

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Adicione ao menos um item.');
  });

  it('refuses a quantity below 1 and above the per-line cap', () => {
    expect(quoteOrderSchema.safeParse(cart([{ offerId: OFFER, quantity: 0 }])).success).toBe(false);
    expect(
      quoteOrderSchema.safeParse(cart([{ offerId: OFFER, quantity: MAX_LINE_QUANTITY + 1 }]))
        .success,
    ).toBe(false);
    expect(
      quoteOrderSchema.safeParse(cart([{ offerId: OFFER, quantity: MAX_LINE_QUANTITY }])).success,
    ).toBe(true);
  });

  it('refuses a fractional quantity', () => {
    expect(quoteOrderSchema.safeParse(cart([{ offerId: OFFER, quantity: 1.5 }])).success).toBe(
      false,
    );
  });

  it('refuses more lines than the cap and accepts exactly the cap', () => {
    const line = (index: number) => ({
      offerId: `11111111-1111-4111-8111-${String(index).padStart(12, '0')}`,
      quantity: 1,
    });

    expect(
      quoteOrderSchema.safeParse(
        cart(Array.from({ length: MAX_ORDER_LINES + 1 }, (_, i) => line(i))),
      ).success,
    ).toBe(false);
    expect(
      quoteOrderSchema.safeParse(cart(Array.from({ length: MAX_ORDER_LINES }, (_, i) => line(i))))
        .success,
    ).toBe(true);
  });

  it('refuses an offer id that is not a UUID', () => {
    expect(quoteOrderSchema.safeParse(cart([{ offerId: 'abc', quantity: 1 }])).success).toBe(false);
  });

  it('refuses a store id that is not a UUID', () => {
    expect(
      quoteOrderSchema.safeParse({ storeId: 'loja', items: [{ offerId: OFFER, quantity: 1 }] })
        .success,
    ).toBe(false);
  });

  it('🔴 carries no price — what a line costs is the server’s answer', () => {
    const parsed = quoteOrderSchema.parse({
      storeId: STORE,
      items: [{ offerId: OFFER, quantity: 1, unitPriceCents: 1 }],
    });

    expect(parsed.items[0]).not.toHaveProperty('unitPriceCents');
  });
});

describe('createOrderSchema', () => {
  it('is the very same body as the quote — the key travels in the header', () => {
    expect(createOrderSchema.safeParse(cart([{ offerId: OFFER, quantity: 1 }])).success).toBe(true);
  });
});

describe('idempotencyKeySchema', () => {
  it('accepts a UUID and refuses anything else', () => {
    expect(idempotencyKeySchema.safeParse(OFFER).success).toBe(true);
    expect(idempotencyKeySchema.safeParse('nao-e-uuid').success).toBe(false);
    expect(idempotencyKeySchema.safeParse('').success).toBe(false);
    expect(idempotencyKeySchema.safeParse(undefined).success).toBe(false);
  });
});

describe('orderStatusSchema', () => {
  it('names the six states of the DOMAIN_MODEL and nothing else', () => {
    expect(orderStatusSchema.options).toEqual([
      'PLACED',
      'ACCEPTED',
      'DISPATCHED',
      'DELIVERED',
      'REJECTED',
      'CANCELLED',
    ]);
    // pd-17 adds the pre-payment state; it must not be here yet (ADR-0017, P3).
    expect(orderStatusSchema.safeParse('PENDING_PAYMENT').success).toBe(false);
  });
});

describe('refundReasonSchema', () => {
  it('names the five exits of ADR-0014 C5', () => {
    expect(refundReasonSchema.options).toEqual([
      'STORE_REJECTED',
      'ACCEPTANCE_EXPIRED',
      'TUTOR_CANCELLED',
      'STORE_CANCELLED',
      'ITEM_UNAVAILABLE',
    ]);
  });
});

describe('openingHoursSchema', () => {
  it('accepts an empty schedule — the store simply never opens', () => {
    expect(openingHoursSchema.safeParse([]).success).toBe(true);
  });

  it('accepts a weekday with a lunch break', () => {
    expect(
      openingHoursSchema.safeParse([
        { weekday: 1, opens: '08:00', closes: '12:00' },
        { weekday: 1, opens: '14:00', closes: '19:00' },
      ]).success,
    ).toBe(true);
  });

  it('refuses a closing time at or before the opening one', () => {
    expect(
      openingHoursSchema.safeParse([{ weekday: 1, opens: '19:00', closes: '08:00' }]).success,
    ).toBe(false);
    expect(
      openingHoursSchema.safeParse([{ weekday: 1, opens: '08:00', closes: '08:00' }]).success,
    ).toBe(false);
  });

  it('refuses two intervals of the same weekday that overlap', () => {
    const result = openingHoursSchema.safeParse([
      { weekday: 2, opens: '08:00', closes: '13:00' },
      { weekday: 2, opens: '12:00', closes: '19:00' },
    ]);

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Faixas de horário inválidas ou sobrepostas.');
  });

  it('refuses a weekday of 7', () => {
    expect(
      openingHoursSchema.safeParse([{ weekday: 7, opens: '08:00', closes: '19:00' }]).success,
    ).toBe(false);
  });

  it('refuses a malformed time', () => {
    expect(
      openingHoursSchema.safeParse([{ weekday: 1, opens: '8:00', closes: '19:00' }]).success,
    ).toBe(false);
    expect(
      openingHoursSchema.safeParse([{ weekday: 1, opens: '08:00', closes: '25:00' }]).success,
    ).toBe(false);
  });

  it('accepts 24:00 as a closing time, so a round-the-clock store has no dead minute', () => {
    expect(
      openingHoursSchema.safeParse([{ weekday: 1, opens: '00:00', closes: '24:00' }]).success,
    ).toBe(true);
  });
});
