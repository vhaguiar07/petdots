import type { Cart } from './cart-state';
import type { ICartStorage } from './cart-storage.types';

/**
 * Where the cart lives on the device — **in memory**, for now.
 *
 * ⚠️ This file is the **native** half; `cart-storage.web.ts` is the browser one,
 * and Metro picks by platform suffix. The unsuffixed file is the native one on
 * purpose: TypeScript (`moduleResolution: bundler`) does not know about
 * platform suffixes and resolves this one, so this is the file `tsc` checks.
 *
 * 🔴 Memory, and not `expo-secure-store`: that is a keychain with a ~2 KB
 * limit, and a shopping cart is neither a secret nor small. `AsyncStorage`
 * would be the right tool and **is not installed** — putting it in now would be
 * a dependency added for a platform nobody has built yet.
 *
 * **Consequence, accepted and recorded:** on native the cart is lost when the
 * app is closed. Trigger to fix it: the **first native build** — install
 * `@react-native-async-storage/async-storage` and replace the object below. On
 * web, which is what the pilot actually runs, `localStorage` already survives a
 * reload (ADR-0017).
 */
let inMemory: Cart | null = null;

export const cartStorage: ICartStorage = {
  load() {
    return Promise.resolve(inMemory);
  },

  save(cart) {
    inMemory = cart;

    return Promise.resolve();
  },

  clear() {
    inMemory = null;

    return Promise.resolve();
  },
};
