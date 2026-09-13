import { MAX_LINE_QUANTITY, MAX_ORDER_LINES } from '@petdots/domain';
import { z } from 'zod';

/**
 * One line of the cart, as the shopfront knows it.
 *
 * ⚠️ The price here is **last-known information, not a promise**. What the
 * order is charged is decided by `POST /order-quotes` against live rows; this
 * copy exists so the bar at the foot of the shopfront can show a running total
 * without a request per tap. The checkout always shows the quote's prices, not
 * these.
 */
export const cartLineSchema = z.object({
  offerId: z.string(),
  productId: z.string(),
  productName: z.string(),
  productVariant: z.string(),
  unitPriceCents: z.number().int().positive(),
  quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY),
});

/**
 * 🔴 One cart, one store (ADR-0004 #6). There is no multi-store cart in the
 * MVP: it would multiply deliveries, splits and order states per store for a
 * small convenience in a neighbourhood pilot.
 */
export const cartSchema = z.object({
  storeId: z.string(),
  storeName: z.string(),
  lines: z.array(cartLineSchema).max(MAX_ORDER_LINES),
});

export type CartLine = z.infer<typeof cartLineSchema>;
export type Cart = z.infer<typeof cartSchema>;

/** The store a line is being added to. */
export interface CartStore {
  id: string;
  name: string;
}

/**
 * Adding an item of another store is not refused and not silently accepted: it
 * comes back as a conflict the screen turns into a question.
 */
export type AddResult =
  | { readonly kind: 'added'; readonly cart: Cart }
  | { readonly kind: 'conflict'; readonly currentStoreName: string }
  | { readonly kind: 'full' };

export const EMPTY_CART: Cart | null = null;

/**
 * Adds a line, or reports why it cannot.
 *
 * Same store: the quantity accumulates, capped at `MAX_LINE_QUANTITY` rather
 * than refused — someone tapping "Adicionar" a twenty-first time meant to add
 * one more, and an error would be a worse answer than the cap.
 *
 * Different store: `conflict`, so the screen can ask before throwing away what
 * the person already picked. Deciding here would be deciding for them.
 */
export function addLine(cart: Cart | null, store: CartStore, line: CartLine): AddResult {
  if (!cart) {
    return { kind: 'added', cart: { storeId: store.id, storeName: store.name, lines: [line] } };
  }

  if (cart.storeId !== store.id) {
    return { kind: 'conflict', currentStoreName: cart.storeName };
  }

  const existing = cart.lines.find((candidate) => candidate.offerId === line.offerId);

  if (!existing) {
    if (cart.lines.length >= MAX_ORDER_LINES) {
      return { kind: 'full' };
    }

    return { kind: 'added', cart: { ...cart, lines: [...cart.lines, line] } };
  }

  return {
    kind: 'added',
    cart: {
      ...cart,
      lines: cart.lines.map((candidate) =>
        candidate.offerId === line.offerId
          ? { ...candidate, quantity: capQuantity(candidate.quantity + line.quantity) }
          : candidate,
      ),
    },
  };
}

/** Throws the cart away and starts a new one at the other store. */
export function replaceStore(store: CartStore, line: CartLine): Cart {
  return { storeId: store.id, storeName: store.name, lines: [line] };
}

/**
 * Sets a line's quantity. Zero removes it, which is what the minus button on
 * the last unit means; anything above the cap is clamped rather than refused.
 */
export function setQuantity(cart: Cart, offerId: string, quantity: number): Cart | null {
  if (quantity <= 0) {
    return removeLine(cart, offerId);
  }

  return {
    ...cart,
    lines: cart.lines.map((line) =>
      line.offerId === offerId ? { ...line, quantity: capQuantity(quantity) } : line,
    ),
  };
}

/** Removes a line, and the cart itself once the last one goes. */
export function removeLine(cart: Cart, offerId: string): Cart | null {
  const lines = cart.lines.filter((line) => line.offerId !== offerId);

  // An empty cart is no cart: keeping the shell would leave the header saying
  // "Carrinho (0)" and the checkout offering to order nothing.
  return lines.length === 0 ? null : { ...cart, lines };
}

/** What the shopfront bar shows: how many units, and roughly how much. */
export function cartItemCount(cart: Cart | null): number {
  return cart?.lines.reduce((total, line) => total + line.quantity, 0) ?? 0;
}

export function cartSubtotalCents(cart: Cart | null): number {
  return cart?.lines.reduce((total, line) => total + line.unitPriceCents * line.quantity, 0) ?? 0;
}

/** The body `POST /order-quotes` and `POST /orders` both take. */
export function toQuoteRequest(cart: Cart): {
  storeId: string;
  items: { offerId: string; quantity: number }[];
} {
  return {
    storeId: cart.storeId,
    items: cart.lines.map((line) => ({ offerId: line.offerId, quantity: line.quantity })),
  };
}

function capQuantity(quantity: number): number {
  return Math.min(quantity, MAX_LINE_QUANTITY);
}
