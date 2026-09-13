import { CART_KEY, type ICartStorage, parseStoredCart } from './cart-storage.types';

/**
 * The web half of the cart storage: `localStorage`.
 *
 * Unlike the session, there is no secret here — a cart is a list of things
 * somebody might buy. `localStorage` is chosen for the plain reason that it
 * survives a reload, and F5 on a checkout page that emptied the basket is the
 * kind of thing that ends a purchase.
 *
 * Every access is wrapped: a private window, a browser set to block site data,
 * or the static export running this on a server all make `localStorage` absent
 * or throwing, and none of those is an error — they simply mean no stored cart.
 */
export const cartStorage: ICartStorage = {
  load() {
    try {
      const raw = globalThis.localStorage?.getItem(CART_KEY);

      return Promise.resolve(raw ? parseStoredCart(raw) : null);
    } catch {
      return Promise.resolve(null);
    }
  },

  save(cart) {
    try {
      globalThis.localStorage?.setItem(CART_KEY, JSON.stringify(cart));
    } catch {
      // Best effort. The cart still works on this page; it just will not
      // survive a reload.
    }

    return Promise.resolve();
  },

  clear() {
    try {
      globalThis.localStorage?.removeItem(CART_KEY);
    } catch {
      // Nothing to remove, or nowhere to remove it from.
    }

    return Promise.resolve();
  },
};
