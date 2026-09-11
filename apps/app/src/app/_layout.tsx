import { Stack } from 'expo-router';

import { CartProvider } from '@/spike/cart/cart-context';

export default function RootLayout() {
  return (
    <CartProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </CartProvider>
  );
}
