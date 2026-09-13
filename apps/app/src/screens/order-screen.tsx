import type { Order } from '@petdots/contracts';
import { Link, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ApiError, ApiUnavailableError } from '../api/http';
import { cancelMyOrder, findMyOrder } from '../api/orders';
import { orderStatusLabel, orderStatusTone, storeClock } from '../cart/order-labels';
import { useSession } from '../session/session-context';
import { AppShell } from '../ui/app-shell';
import { Badge, Body, Button, Card, Heading, Mono } from '../ui/primitives';
import { Colors, formatCents, Spacing } from '../ui/theme';
import { formatDate } from './orders-screen';

type Load =
  | { readonly kind: 'loading' }
  | { readonly kind: 'missing' }
  | { readonly kind: 'unavailable' }
  | { readonly kind: 'ready'; readonly order: Order };

/** One order, and — while it is still waiting — the way out of it. */
export function OrderScreen() {
  const { http } = useSession();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    void findMyOrder(http, orderId, controller.signal)
      .then((order) => {
        setLoad({ kind: 'ready', order });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setLoad(
          error instanceof ApiError && error.status === 404
            ? { kind: 'missing' }
            : error instanceof ApiUnavailableError
              ? { kind: 'unavailable' }
              : { kind: 'missing' },
        );
      });

    return () => {
      controller.abort();
    };
  }, [http, orderId]);

  const onCancel = () => {
    setCancelling(true);
    setCancelError(null);

    void cancelMyOrder(http, orderId)
      .then((order) => {
        setLoad({ kind: 'ready', order });
        setConfirming(false);
      })
      .catch((error: unknown) => {
        setCancelError(
          error instanceof ApiError
            ? error.message
            : 'Não conseguimos falar com o servidor. Tente de novo.',
        );
      })
      .finally(() => {
        setCancelling(false);
      });
  };

  if (load.kind === 'loading') {
    return (
      <AppShell title="Pedido">
        <Body muted>Carregando o pedido…</Body>
      </AppShell>
    );
  }

  if (load.kind === 'unavailable') {
    return (
      <AppShell title="Pedido">
        <Body muted>Não conseguimos carregar este pedido agora. Tente de novo em instantes.</Body>
        <BackToOrders />
      </AppShell>
    );
  }

  if (load.kind === 'missing') {
    return (
      <AppShell title="Pedido não encontrado">
        <Body muted>Este pedido não existe ou não é seu.</Body>
        <BackToOrders />
      </AppShell>
    );
  }

  const { order } = load;
  const waiting = order.status === 'PLACED';

  return (
    <AppShell title={`Pedido ${order.code}`} subtitle={order.store.name || undefined}>
      <BackToOrders />

      <Card>
        <View style={styles.header}>
          <Mono style={styles.code}>{order.code}</Mono>
          <Badge label={orderStatusLabel(order)} tone={orderStatusTone(order.status)} />
        </View>

        <Body muted>Feito em {formatDate(order.placedAt)}</Body>

        {waiting ? (
          <Body muted>
            A loja tem até {storeClock(new Date(order.acceptanceDeadlineAt))} para aceitar.
          </Body>
        ) : null}

        {order.status === 'REJECTED' && order.rejectionReason === 'ACCEPTANCE_EXPIRED' ? (
          // ⚠️ Copy provisória: na pd-17, quando houver pagamento de verdade,
          // vira "o valor será devolvido".
          <Body muted>A loja não respondeu a tempo. Nada foi cobrado.</Body>
        ) : null}

        {order.status === 'REJECTED' && order.rejectionReason === 'STORE_REJECTED' ? (
          // ⚠️ Copy provisória, como a da expiração. Sem motivo em texto livre:
          // a recusa não carrega um (ADR-0018, A9) — está em IDEIAS, com o
          // gatilho "primeiro tutor perguntando por quê".
          <Body muted>A loja recusou o pedido. Nada foi cobrado.</Body>
        ) : null}

        {order.status === 'CANCELLED' ? (
          <Body muted>
            {order.cancellationReason
              ? `A loja cancelou o pedido: ${order.cancellationReason}`
              : 'Este pedido foi cancelado.'}{' '}
            Nada foi cobrado.
          </Body>
        ) : null}

        {order.status === 'ACCEPTED' || order.status === 'DISPATCHED' ? (
          // The way out of an accepted order is the telephone: the store
          // cancels, and there is no channel inside the order (ADR-0014, C4).
          // ⚠️ Without the number — `phone_whatsapp` is not in the schema yet;
          // it arrives with the store onboarding (J6).
          <Body muted>Para cancelar, fale com a loja.</Body>
        ) : null}
      </Card>

      <Card>
        <Heading level={3}>Itens</Heading>

        {order.items.map((item) => (
          <View key={item.id} style={styles.line}>
            <View style={styles.lineInfo}>
              <Body>{item.productName}</Body>
              <Body muted>
                {item.productVariant} · {String(item.quantity)} × {formatCents(item.unitPriceCents)}
              </Body>
            </View>
            <View style={styles.lineRight}>
              <Mono>{formatCents(item.lineTotalCents)}</Mono>
              {item.fulfillment === 'UNAVAILABLE' ? (
                <Badge label="Indisponível" tone="danger" />
              ) : null}
            </View>
          </View>
        ))}

        <View style={styles.totals}>
          <Row label="Subtotal" value={formatCents(order.itemsTotalCents)} />
          <Row label="Entrega" value={formatCents(order.deliveryFeeCents)} />
          <Row label="Taxa de serviço" value={formatCents(order.serviceFeeCents)} />
          <Row label="Total" value={formatCents(order.totalCents)} strong />
        </View>
      </Card>

      <Card>
        <Heading level={3}>Entrega</Heading>
        <Body>
          {order.deliveryAddress.street}, {order.deliveryAddress.number}
          {order.deliveryAddress.complement ? ` · ${order.deliveryAddress.complement}` : ''}
        </Body>
        <Body muted>
          {order.deliveryAddress.neighborhood} · {order.deliveryAddress.postalCode}
        </Body>
        {order.deliveryAddress.reference ? (
          <Body muted>Referência: {order.deliveryAddress.reference}</Body>
        ) : null}
        <Body muted>
          {order.contactName} · {order.contactPhone}
        </Body>
      </Card>

      {waiting ? (
        <Card style={styles.cancelCard}>
          {cancelError ? <Body style={styles.error}>{cancelError}</Body> : null}

          {/* Two steps, like removing a pet: cancelling is not undoable, and a
              single tap next to the status is too easy to hit by accident. */}
          {confirming ? (
            <View style={styles.cancelActions}>
              <Button
                label={cancelling ? 'Cancelando…' : 'Confirmar cancelamento'}
                tone="danger"
                disabled={cancelling}
                onPress={onCancel}
              />
              <Button
                label="Voltar"
                disabled={cancelling}
                onPress={() => {
                  setConfirming(false);
                }}
              />
            </View>
          ) : (
            <Button
              label="Cancelar pedido"
              tone="danger"
              onPress={() => {
                setConfirming(true);
              }}
            />
          )}

          <Body muted>Você pode cancelar enquanto a loja não aceitar.</Body>
        </Card>
      ) : null}
    </AppShell>
  );
}

function BackToOrders() {
  return (
    <Link href="/pedidos" style={styles.link}>
      ← Voltar aos pedidos
    </Link>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <Body style={strong ? styles.strong : undefined}>{label}</Body>
      <Mono style={strong ? styles.strong : undefined}>{value}</Mono>
    </View>
  );
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
  code: { fontSize: 22, fontWeight: '700' },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
    flexWrap: 'wrap',
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  lineInfo: { gap: 2, flexShrink: 1 },
  lineRight: { alignItems: 'flex-end', gap: Spacing.xs },
  totals: { gap: Spacing.xs, marginTop: Spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md },
  strong: { fontWeight: '700' },
  cancelCard: { gap: Spacing.sm },
  cancelActions: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  error: { color: Colors.danger },
});
