import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import type { Cart, ComparedOffer } from '../fixtures/types';

/**
 * Cart state for J3. It survives a browser reload on purpose: B5 reloads an
 * inner URL, and a checkout that comes back empty would make the criterion
 * unanswerable. Storage is best-effort — a private window, or native, simply
 * starts from an empty cart.
 */
const STORAGE_KEY = 'petdots.spike.cart';

const EMPTY_CART: Cart = { storeId: null, lines: [] };

type CartApi = {
  readonly cart: Cart;
  readonly add: (row: ComparedOffer) => 'added' | 'store-conflict';
  readonly setQuantity: (offerId: string, quantity: number) => void;
  readonly remove: (offerId: string) => void;
  readonly clear: () => void;
};

const CartContext = createContext<CartApi | null>(null);

function readStoredCart(): Cart {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_CART;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'lines' in parsed &&
      Array.isArray((parsed as Cart).lines)
    ) {
      return parsed as Cart;
    }
  } catch {
    // Storage can be unavailable or hold stale shapes; an empty cart is correct.
  }
  return EMPTY_CART;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart>(EMPTY_CART);

  // Read after mount, never during render: the static export runs this module
  // on the server, where there is no localStorage, and a value read during
  // render would mismatch the hydrated client.
  useEffect(() => setCart(readStoredCart()), []);

  useEffect(() => {
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // Best effort.
    }
  }, [cart]);

  const add = useCallback((row: ComparedOffer): 'added' | 'store-conflict' => {
    let outcome: 'added' | 'store-conflict' = 'added';

    setCart((current) => {
      // One order belongs to exactly one store — there is no multi-store cart
      // in the MVP (DOMAIN_MODEL §Agregados).
      if (current.storeId !== null && current.storeId !== row.store.id) {
        outcome = 'store-conflict';
        return current;
      }

      const existing = current.lines.find((line) => line.offerId === row.offer.id);
      const lines = existing
        ? current.lines.map((line) =>
            line.offerId === row.offer.id ? { ...line, quantity: line.quantity + 1 } : line,
          )
        : [...current.lines, { offerId: row.offer.id, productId: row.product.id, quantity: 1 }];

      return { storeId: row.store.id, lines };
    });

    return outcome;
  }, []);

  const setQuantity = useCallback((offerId: string, quantity: number) => {
    setCart((current) => {
      const lines = current.lines
        .map((line) => (line.offerId === offerId ? { ...line, quantity } : line))
        .filter((line) => line.quantity > 0);
      return lines.length === 0 ? EMPTY_CART : { ...current, lines };
    });
  }, []);

  const remove = useCallback((offerId: string) => {
    setCart((current) => {
      const lines = current.lines.filter((line) => line.offerId !== offerId);
      return lines.length === 0 ? EMPTY_CART : { ...current, lines };
    });
  }, []);

  const clear = useCallback(() => setCart(EMPTY_CART), []);

  const value = useMemo<CartApi>(
    () => ({ cart, add, setQuantity, remove, clear }),
    [cart, add, setQuantity, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartApi {
  const api = useContext(CartContext);
  if (!api) throw new Error('useCart precisa estar dentro de CartProvider');
  return api;
}

export function cartItemCount(cart: Cart): number {
  return cart.lines.reduce((sum, line) => sum + line.quantity, 0);
}
