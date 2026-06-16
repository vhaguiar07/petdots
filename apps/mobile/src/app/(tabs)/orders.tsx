import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { Order } from '@petdots/shared';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { apiClient } from '@/lib/api-client';
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from '@/lib/order-status';
import { formatCurrency } from '@/lib/pricing';

export default function OrdersScreen() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    apiClient
      .listOrders()
      .then(setOrders)
      .catch(() => setError('Não foi possível carregar seus pedidos.'));
  }, [user]);

  if (authLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.primary }]}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <ThemedText style={styles.headerTitle}>Minhas Compras</ThemedText>
          </View>
          <View style={styles.contentBody}>
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: theme.primary }]}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          {/* Header area */}
          <View style={styles.header}>
            <ThemedText style={styles.headerTitle}>Minhas Compras</ThemedText>
          </View>

          {/* White Content Body Panel */}
          <View style={styles.contentBody}>
            <View style={styles.centered}>
              <Ionicons name="bag-handle-outline" size={64} color={theme.primary} />
              <ThemedText style={styles.emptyTitle}>Minhas compras</ThemedText>
              <ThemedText style={styles.emptyText}>
                Entre para ver seus pedidos anteriores e acompanhar suas entregas.
              </ThemedText>
              <Pressable onPress={() => router.push('/login')}>
                <View style={[styles.button, { backgroundColor: theme.primary }]}>
                  <ThemedText style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 14 }}>
                    Entrar
                  </ThemedText>
                </View>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.primary }]}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header area */}
        <View style={styles.header}>
          <ThemedText style={styles.headerTitle}>Minhas Compras</ThemedText>
        </View>

        {/* White Content Body Panel */}
        <View style={styles.contentBody}>
          <FlatList
            data={orders ?? []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.centered}>
                {orders === null ? (
                  <ActivityIndicator size="large" color={theme.primary} />
                ) : (
                  <>
                    <Ionicons name="receipt-outline" size={48} color="#B37A5C" />
                    <ThemedText style={[styles.emptyTitle, { color: '#802E00' }]}>Nenhum pedido</ThemedText>
                    <ThemedText style={styles.emptyText}>
                      {error ?? 'Você ainda não fez nenhum pedido no PetDots.'}
                    </ThemedText>
                  </>
                )}
              </View>
            }
            renderItem={({ item }) => {
              const statusColors = ORDER_STATUS_COLORS[item.status];
              return (
                <View style={styles.card}>
                  <View style={styles.cardBody}>
                    <ThemedText type="smallBold" style={{ color: '#000000' }}>
                      {item.store?.name ?? 'Loja'}
                    </ThemedText>
                    <ThemedText style={{ color: '#B37A5C', fontSize: 11, marginTop: 2 }}>
                      {new Date(item.createdAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </ThemedText>
                    <ThemedText type="smallBold" style={{ color: theme.primary, marginTop: 6 }}>
                      {formatCurrency(Number(item.total))}
                    </ThemedText>
                  </View>
                  <View style={[styles.badge, { backgroundColor: statusColors.bg }]}>
                    <ThemedText style={{ color: statusColors.fg, fontSize: 11, fontWeight: 'bold' }}>
                      {ORDER_STATUS_LABELS[item.status]}
                    </ThemedText>
                  </View>
                </View>
              );
            }}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  contentBody: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginTop: Spacing.three,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#B37A5C',
    textAlign: 'center',
    marginTop: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
  listContent: {
    padding: Spacing.three,
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: 16,
    marginBottom: Spacing.two,
    backgroundColor: '#FFF9F5',
    borderColor: '#FFEAD9',
    borderWidth: 1,
  },
  cardBody: {
    flex: 1,
  },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  button: {
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.two,
    borderRadius: 24,
    marginTop: Spacing.four,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
});
