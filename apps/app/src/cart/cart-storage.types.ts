import { type Cart, cartSchema } from './cart-state';

/**
 * What the two platform implementations of the cart storage share.
 *
 * The shape copies the session storage exactly (ADR-0012, A1): `cart-storage.ts`
 * is the native half and `cart-storage.web.ts` the browser one, Metro picks by
 * platform suffix, and they are never compiled together — so a difference
 * between them would only show up at runtime, on one platform.
 */
export const CART_KEY = 'petdots.cart';

export interface ICartStorage {
  load(): Promise<Cart | null>;
  save(cart: Cart): Promise<void>;
  clear(): Promise<void>;
}

/**
 * Parsed, never cast. A cart written by an older build has an older shape, and
 * trusting it would send `undefined` where a quantity belongs. Discarding is
 * always safe: the person picks the items again.
 */
export function parseStoredCart(raw: string): Cart | null {
  try {
    const parsed = cartSchema.safeParse(JSON.parse(raw));

    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
