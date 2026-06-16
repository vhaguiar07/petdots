import { Tabs, TabList, TabTrigger, TabSlot, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useCart } from '@/lib/cart-context';

export default function TabLayout() {
  return (
    <Tabs>
      <TabSlot style={{ flex: 1 }} />
      <TabList asChild>
        <BottomTabBar>
          <TabTrigger name="index" href="/" asChild>
            <TabButton label="Início" icon="home" />
          </TabTrigger>
          <TabTrigger name="orders" href="/orders" asChild>
            <TabButton label="Pedidos" icon="receipt" />
          </TabTrigger>
          <TabTrigger name="cart" href="/cart" asChild>
            <CartTabButton />
          </TabTrigger>
          <TabTrigger name="account" href="/account" asChild>
            <TabButton label="Conta" icon="person" />
          </TabTrigger>
        </BottomTabBar>
      </TabList>
    </Tabs>
  );
}

function BottomTabBar({ children, ...props }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();

  return (
    <View
      {...props}
      style={[
        styles.bar,
        { borderTopColor: '#FF6B00', backgroundColor: '#FF6B00', paddingBottom: Math.max(insets.bottom, Spacing.two) },
      ]}
    >
      {children}
    </View>
  );
}

function TabButton({ label, icon, isFocused, ...props }: TabTriggerSlotProps & { label: string; icon: keyof typeof Ionicons.glyphMap }) {
  const inactiveColor = 'rgba(255, 255, 255, 0.6)';
  const activeColor = '#ffffff';

  return (
    <Pressable {...props} style={({ pressed }) => [styles.tabButton, pressed && styles.pressed]}>
      <Ionicons 
        name={isFocused ? icon : (`${icon}-outline` as any)} 
        size={22} 
        color={isFocused ? activeColor : inactiveColor} 
      />
      <ThemedText type="small" style={[styles.tabLabel, { color: isFocused ? activeColor : inactiveColor }]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function CartTabButton({ isFocused, ...props }: TabTriggerSlotProps) {
  const inactiveColor = 'rgba(255, 255, 255, 0.6)';
  const activeColor = '#ffffff';
  const { itemCount } = useCart();

  return (
    <Pressable {...props} style={({ pressed }) => [styles.tabButton, pressed && styles.pressed]}>
      <View style={styles.iconContainer}>
        <Ionicons 
          name={isFocused ? 'cart' : 'cart-outline'} 
          size={22} 
          color={isFocused ? activeColor : inactiveColor} 
        />
        {itemCount > 0 && (
          <View style={styles.badge}>
            <ThemedText style={styles.badgeText}>
              {itemCount}
            </ThemedText>
          </View>
        )}
      </View>
      <ThemedText type="small" style={[styles.tabLabel, { color: isFocused ? activeColor : inactiveColor }]}>
        Carrinho
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    height: 64,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.one,
  },
  pressed: {
    opacity: 0.6,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },
  iconContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  badgeText: {
    color: '#FF6B00',
    fontSize: 9,
    fontWeight: 'bold',
    lineHeight: 11,
    textAlign: 'center',
  },
});
