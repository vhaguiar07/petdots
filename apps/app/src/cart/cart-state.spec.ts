import { MAX_LINE_QUANTITY, MAX_ORDER_LINES } from '@petdots/domain';

import {
  addLine,
  type Cart,
  cartItemCount,
  cartSchema,
  cartSubtotalCents,
  type CartLine,
  removeLine,
  replaceStore,
  setQuantity,
  toQuoteRequest,
} from './cart-state';

const STORE_B = { id: 'store-b', name: 'Petshop B do Cachambi' };
const STORE_A = { id: 'store-a', name: 'Petshop A do Méier' };

const line = (overrides: Partial<CartLine> = {}): CartLine => ({
  offerId: 'offer-1',
  productId: 'product-1',
  productName: 'Golden Ração Cães Adultos',
  productVariant: '15 kg',
  unitPriceCents: 3790,
  quantity: 1,
  ...overrides,
});

const cartWith = (...lines: CartLine[]): Cart => ({
  storeId: STORE_B.id,
  storeName: STORE_B.name,
  lines,
});

describe('addLine', () => {
  it('starts a cart at the store the item came from', () => {
    const result = addLine(null, STORE_B, line());

    expect(result.kind).toBe('added');
    expect(result.kind === 'added' && result.cart.storeId).toBe(STORE_B.id);
    expect(result.kind === 'added' && result.cart.lines).toHaveLength(1);
  });

  it('accumulates the quantity of an item already in the cart', () => {
    const first = addLine(null, STORE_B, line());
    const second = addLine(first.kind === 'added' ? first.cart : null, STORE_B, line());

    expect(second.kind === 'added' && second.cart.lines).toHaveLength(1);
    expect(second.kind === 'added' && second.cart.lines[0]?.quantity).toBe(2);
  });

  it('adds a second line for a different offer of the same store', () => {
    const result = addLine(cartWith(line()), STORE_B, line({ offerId: 'offer-2' }));

    expect(result.kind === 'added' && result.cart.lines).toHaveLength(2);
  });

  it('caps the quantity instead of refusing the tap', () => {
    const result = addLine(cartWith(line({ quantity: MAX_LINE_QUANTITY })), STORE_B, line());

    expect(result.kind).toBe('added');
    expect(result.kind === 'added' && result.cart.lines[0]?.quantity).toBe(MAX_LINE_QUANTITY);
  });

  it('🔴 reports a conflict for an item of another store, instead of deciding', () => {
    const result = addLine(cartWith(line()), STORE_A, line({ offerId: 'offer-a' }));

    expect(result.kind).toBe('conflict');
    expect(result.kind === 'conflict' && result.currentStoreName).toBe(STORE_B.name);
  });

  it('🔴 a conflict leaves the cart exactly as it was', () => {
    const cart = cartWith(line());
    const snapshot = JSON.stringify(cart);

    addLine(cart, STORE_A, line({ offerId: 'offer-a' }));

    expect(JSON.stringify(cart)).toBe(snapshot);
  });

  it('refuses a new line past the order cap', () => {
    const full = cartWith(
      ...Array.from({ length: MAX_ORDER_LINES }, (_, index) =>
        line({ offerId: `offer-${String(index)}` }),
      ),
    );

    expect(addLine(full, STORE_B, line({ offerId: 'offer-extra' })).kind).toBe('full');
    // But an item already there still accumulates: the cap is on distinct lines.
    expect(addLine(full, STORE_B, line({ offerId: 'offer-0' })).kind).toBe('added');
  });
});

describe('replaceStore', () => {
  it('throws the old cart away and starts at the new store', () => {
    const replaced = replaceStore(STORE_A, line({ offerId: 'offer-a' }));

    expect(replaced.storeId).toBe(STORE_A.id);
    expect(replaced.storeName).toBe(STORE_A.name);
    expect(replaced.lines).toHaveLength(1);
  });
});

describe('setQuantity', () => {
  it('changes one line and leaves the others alone', () => {
    const cart = cartWith(line(), line({ offerId: 'offer-2' }));
    const next = setQuantity(cart, 'offer-1', 5);

    expect(next?.lines.find((it) => it.offerId === 'offer-1')?.quantity).toBe(5);
    expect(next?.lines.find((it) => it.offerId === 'offer-2')?.quantity).toBe(1);
  });

  it('clamps to the per-line cap', () => {
    expect(setQuantity(cartWith(line()), 'offer-1', 999)?.lines[0]?.quantity).toBe(
      MAX_LINE_QUANTITY,
    );
  });

  it('zero removes the line — what the minus button on the last unit means', () => {
    const cart = cartWith(line(), line({ offerId: 'offer-2' }));

    expect(setQuantity(cart, 'offer-1', 0)?.lines.map((it) => it.offerId)).toEqual(['offer-2']);
  });

  it('removing the last line leaves no cart at all', () => {
    // An empty shell would leave the header saying "Carrinho (0)" and the
    // checkout offering to order nothing.
    expect(setQuantity(cartWith(line()), 'offer-1', 0)).toBeNull();
  });
});

describe('removeLine', () => {
  it('drops the line and keeps the rest', () => {
    const cart = cartWith(line(), line({ offerId: 'offer-2' }));

    expect(removeLine(cart, 'offer-1')?.lines.map((it) => it.offerId)).toEqual(['offer-2']);
  });

  it('an unknown offer changes nothing', () => {
    expect(removeLine(cartWith(line()), 'offer-999')?.lines).toHaveLength(1);
  });
});

describe('cartItemCount and cartSubtotalCents', () => {
  it('count is units, not lines', () => {
    expect(
      cartItemCount(cartWith(line({ quantity: 2 }), line({ offerId: 'o2', quantity: 1 }))),
    ).toBe(3);
  });

  it('subtotal multiplies price by quantity', () => {
    expect(
      cartSubtotalCents(
        cartWith(line({ quantity: 2 }), line({ offerId: 'o2', unitPriceCents: 1690, quantity: 1 })),
      ),
    ).toBe(7580 + 1690);
  });

  it('an absent cart is zero on both', () => {
    expect(cartItemCount(null)).toBe(0);
    expect(cartSubtotalCents(null)).toBe(0);
  });
});

describe('toQuoteRequest', () => {
  it('🔴 sends only offer ids and quantities — never a price', () => {
    const body = toQuoteRequest(cartWith(line({ quantity: 2 })));

    expect(body).toEqual({ storeId: STORE_B.id, items: [{ offerId: 'offer-1', quantity: 2 }] });
    // A price in the request body would be a price the customer could choose.
    expect(JSON.stringify(body)).not.toContain('3790');
  });
});

describe('cartSchema', () => {
  it('accepts what the cart writes', () => {
    expect(cartSchema.safeParse(cartWith(line())).success).toBe(true);
  });

  it('🔴 refuses a stored cart from an older shape, instead of trusting it', () => {
    // Parsed, never cast — the same rule the session storage follows. A cart
    // written by an older build would otherwise put `undefined` where a
    // quantity belongs, and the checkout would send it.
    expect(cartSchema.safeParse({ storeId: 'b', lines: [] }).success).toBe(false);
    expect(
      cartSchema.safeParse({ storeId: 'b', storeName: 'B', lines: [{ offerId: 'x' }] }).success,
    ).toBe(false);
  });

  it('refuses a quantity above the cap or below one', () => {
    expect(cartSchema.safeParse(cartWith(line({ quantity: 0 }))).success).toBe(false);
    expect(cartSchema.safeParse(cartWith(line({ quantity: MAX_LINE_QUANTITY + 1 }))).success).toBe(
      false,
    );
  });
});
