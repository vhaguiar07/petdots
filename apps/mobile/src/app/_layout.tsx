import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { AuthProvider } from '@/lib/auth-context';
import { CartProvider } from '@/lib/cart-context';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <AuthProvider>
      <CartProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="stores/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen
              name="register"
              options={{ presentation: 'modal', headerShown: false }}
            />
          </Stack>
        </ThemeProvider>
      </CartProvider>
    </AuthProvider>
  );
}
