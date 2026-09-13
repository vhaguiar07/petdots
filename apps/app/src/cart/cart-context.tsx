import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import {
  addLine,
  type AddResult,
  type Cart,
  type CartLine,
  type CartStore,
  removeLine,
  replaceStore,
  setQuantity,
} from './cart-state';
import { cartStorage } from './cart-storage';

interface CartApi {
  /** `null` means no cart at all — not an empty one. */
  readonly cart: Cart | null;
  /** True until the storage has been read, exactly like the session. */
  readonly restoring: boolean;
  readonly add: (store: CartStore, line: CartLine) => AddResult;
  /** Throws the cart away and starts again at the other store. */
  readonly switchStore: (store: CartStore, line: CartLine) => void;
  readonly changeQuantity: (offerId: string, quantity: number) => void;
  readonly remove: (offerId: string) => void;
  readonly clear: () => void;
}

const CartContext = createContext<CartApi | null>(null);

/**
 * The cart, and the only place it exists.
 *
 * 🔴 **The server never sees a cart** (ADR-0017). `Cart` is not an entity of the
 * `DOMAIN_MODEL`, and creating a table for it would change the domain model to
 * solve a problem the pilot does not have — one person per device. What *does*
 * need a single source of truth — price, fees, commission, availability, whether
 * the shop is open — is none of this: it is the quote, computed server-side on
 * every change.
 *
 * If a persistent cart ever becomes a requirement (abandoned-cart recovery is
 * an idea with no owner in `IDEIAS`), `POST /order-quotes` is already the
 * contract a server-side cart would fill.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [restoring, setRestoring] = useState(true);

  // Read after mounting, never during render — the same reason as the session
  // (ADR-0012, A7): the static export runs this module where there is no
  // `localStorage`, and a value read during render would not match the
  // hydrated client.
  useEffect(() => {
    let alive = true;

    void cartStorage.load().then((stored) => {
      if (alive) {
        setCart(stored);
        setRestoring(false);
      }
    });

    return () => {
      alive = false;
    };
  }, []);

  /** Persisting is best effort and never blocks the screen from updating. */
  const persist = useCallback((next: Cart | null) => {
    setCart(next);

    void (next ? cartStorage.save(next) : cartStorage.clear());
  }, []);

  const add = useCallback(
    (store: CartStore, line: CartLine): AddResult => {
      const result = addLine(cart, store, line);

      if (result.kind === 'added') {
        persist(result.cart);
      }

      // A conflict or a full cart changes nothing: the screen asks first.
      return result;
    },
    [cart, persist],
  );

  const switchStore = useCallback(
    (store: CartStore, line: CartLine) => {
      persist(replaceStore(store, line));
    },
    [persist],
  );

  const changeQuantity = useCallback(
    (offerId: string, quantity: number) => {
      if (cart) {
        persist(setQuantity(cart, offerId, quantity));
      }
    },
    [cart, persist],
  );

  const remove = useCallback(
    (offerId: string) => {
      if (cart) {
        persist(removeLine(cart, offerId));
      }
    },
    [cart, persist],
  );

  const clear = useCallback(() => {
    persist(null);
  }, [persist]);

  const value = useMemo<CartApi>(
    () => ({ cart, restoring, add, switchStore, changeQuantity, remove, clear }),
    [cart, restoring, add, switchStore, changeQuantity, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartApi {
  const api = useContext(CartContext);

  if (!api) {
    throw new Error('useCart precisa estar dentro de CartProvider');
  }

  return api;
}
