import { Stack } from 'expo-router';

import { CartProvider } from '@/cart/cart-context';
import { SessionProvider } from '@/session/session-context';

/**
 * The cart provider sits **inside** the session one: the checkout reads both,
 * and the cart itself needs no session — an anonymous visitor fills one and
 * signs in at the end.
 */
export default function RootLayout() {
  return (
    <SessionProvider>
      <CartProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </CartProvider>
    </SessionProvider>
  );
}
