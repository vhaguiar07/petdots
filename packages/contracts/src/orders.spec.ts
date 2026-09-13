import { MAX_LINE_QUANTITY, MAX_ORDER_LINES } from '@petdots/domain';

import {
  cancelOrderByStoreSchema,
  createOrderSchema,
  idempotencyKeySchema,
  listStoreOrdersQuerySchema,
  orderStatusSchema,
  quoteOrderSchema,
  refundReasonSchema,
  storeOrderItemParamsSchema,
  storeOrderParamsSchema,
  updateOrderItemFulfillmentSchema,
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

describe('listStoreOrdersQuerySchema', () => {
  it('turns a comma-separated filter into the statuses the queue asks for', () => {
    expect(listStoreOrdersQuerySchema.parse({ status: 'PLACED,ACCEPTED' })).toEqual({
      status: ['PLACED', 'ACCEPTED'],
    });
  });

  it('tolerates spaces around the commas, because a human types this URL', () => {
    expect(listStoreOrdersQuerySchema.parse({ status: 'PLACED, DISPATCHED' })).toEqual({
      status: ['PLACED', 'DISPATCHED'],
    });
  });

  it('means the whole queue when the filter is absent', () => {
    expect(listStoreOrdersQuerySchema.parse({})).toEqual({ status: undefined });
  });

  it('🔴 refuses a status nobody defined, instead of answering an empty queue', () => {
    const result = listStoreOrdersQuerySchema.safeParse({ status: 'FOO' });

    expect(result.success).toBe(false);
    expect(result.success ? [] : result.error.issues.map((issue) => issue.path[0])).toEqual([
      'status',
    ]);
  });

  it('refuses a list where only one entry is wrong', () => {
    expect(listStoreOrdersQuerySchema.safeParse({ status: 'PLACED,FOO' }).success).toBe(false);
  });
});

describe('cancelOrderByStoreSchema', () => {
  it('trims the reason the shop typed', () => {
    expect(cancelOrderByStoreSchema.parse({ reason: '  cliente ligou  ' })).toEqual({
      reason: 'cliente ligou',
    });
  });

  it('🔴 requires a reason: this is the side that has something to explain', () => {
    expect(cancelOrderByStoreSchema.safeParse({}).success).toBe(false);
    expect(cancelOrderByStoreSchema.safeParse({ reason: '   ' }).success).toBe(false);
  });

  it('refuses 201 characters, which is one past the column', () => {
    expect(cancelOrderByStoreSchema.safeParse({ reason: 'a'.repeat(200) }).success).toBe(true);
    expect(cancelOrderByStoreSchema.safeParse({ reason: 'a'.repeat(201) }).success).toBe(false);
  });
});

describe('updateOrderItemFulfillmentSchema', () => {
  it('accepts the one move the store can make on a line', () => {
    expect(updateOrderItemFulfillmentSchema.parse({ fulfillment: 'UNAVAILABLE' })).toEqual({
      fulfillment: 'UNAVAILABLE',
    });
  });

  it('🔴 refuses SUBSTITUTED, because the domain has no producer for it', () => {
    expect(updateOrderItemFulfillmentSchema.safeParse({ fulfillment: 'SUBSTITUTED' }).success).toBe(
      false,
    );
  });

  it('refuses FULFILLED, because nothing moves back', () => {
    expect(updateOrderItemFulfillmentSchema.safeParse({ fulfillment: 'FULFILLED' }).success).toBe(
      false,
    );
  });
});

describe('storeOrderParamsSchema', () => {
  const STORE = '7c9d1a3b-4d5e-4f60-9b0c-1d2e3f4a5b6c';

  it('carries both ids, because the store is in the path and not in the token', () => {
    expect(storeOrderParamsSchema.parse({ storeId: STORE, orderId: OFFER })).toEqual({
      storeId: STORE,
      orderId: OFFER,
    });
  });

  it('says which of the two is wrong, in Portuguese', () => {
    const result = storeOrderParamsSchema.safeParse({ storeId: 'amigo-fiel', orderId: OFFER });

    expect(result.success ? [] : result.error.issues.map((issue) => issue.message)).toEqual([
      'Loja inválida.',
    ]);
  });

  it('extends into the line params without losing either id', () => {
    expect(
      storeOrderItemParamsSchema.safeParse({ storeId: STORE, orderId: OFFER, orderItemId: STORE })
        .success,
    ).toBe(true);
    expect(storeOrderItemParamsSchema.safeParse({ storeId: STORE, orderId: OFFER }).success).toBe(
      false,
    );
  });
});
