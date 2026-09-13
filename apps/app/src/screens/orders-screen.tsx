import type { Order } from '@petdots/contracts';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { listMyOrders } from '../api/orders';
import { orderStatusLabel, orderStatusTone } from '../cart/order-labels';
import { useSession } from '../session/session-context';
import { AppShell } from '../ui/app-shell';
import { Badge, Body, Card, Heading, Mono } from '../ui/primitives';
import { Colors, formatCents, Spacing } from '../ui/theme';

type Load =
  | { readonly kind: 'loading' }
  | { readonly kind: 'unavailable' }
  | { readonly kind: 'ready'; readonly orders: Order[] };

/** Every order the caller has made, newest first. */
export function OrdersScreen() {
  const { http } = useSession();
  const [load, setLoad] = useState<Load>({ kind: 'loading' });

  useEffect(() => {
    const controller = new AbortController();

    void listMyOrders(http, controller.signal)
      .then((orders) => {
        setLoad({ kind: 'ready', orders });
      })
      .catch(() => {
        if (controller.signal.aborted) {
          return;
        }

        // Every failure lands on a drawn state, including the ones that are not
        // a network problem (BUG-R01). There is no branch to take here: an empty
        // list is already a legitimate answer, so anything that went wrong is
        // "não conseguimos carregar".
        setLoad({ kind: 'unavailable' });
      });

    return () => {
      controller.abort();
    };
  }, [http]);

  if (load.kind === 'loading') {
    return (
      <AppShell title="Seus pedidos">
        <Body muted>Carregando seus pedidos…</Body>
      </AppShell>
    );
  }

  if (load.kind === 'unavailable') {
    return (
      <AppShell title="Seus pedidos">
        <Body muted>Não conseguimos carregar seus pedidos agora. Tente de novo em instantes.</Body>
      </AppShell>
    );
  }

  if (load.orders.length === 0) {
    return (
      <AppShell title="Seus pedidos">
        <Body muted>Você ainda não fez nenhum pedido.</Body>
        <Link href="/" style={styles.link}>
          Ver preços no comparador
        </Link>
      </AppShell>
    );
  }

  return (
    <AppShell title="Seus pedidos" subtitle={`${String(load.orders.length)} no total`}>
      {load.orders.map((order) => (
        <Card key={order.id}>
          <View style={styles.header}>
            <Link href={`/pedidos/${order.id}`} style={styles.code}>
              <Mono>{order.code}</Mono>
            </Link>
            <Badge label={orderStatusLabel(order)} tone={orderStatusTone(order.status)} />
          </View>

          <Heading level={3}>{order.store.name || 'Loja'}</Heading>
          <Body muted>
            {formatDate(order.placedAt)} · {formatCents(order.totalCents)}
          </Body>

          <Link href={`/pedidos/${order.id}`} style={styles.link}>
            Ver detalhes
          </Link>
        </Card>
      ))}
    </AppShell>
  );
}

/** `13/09/2026 às 14:30`, in the store's timezone. */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
    .format(new Date(iso))
    .replace(', ', ' às ');
}

const styles = StyleSheet.create({
  link: { fontSize: 14, fontWeight: '600', color: Colors.accent, alignSelf: 'flex-start' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    flexWrap: 'wrap',
  },
  code: { fontSize: 16, fontWeight: '700', color: Colors.accent },
});
