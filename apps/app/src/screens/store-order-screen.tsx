import type { Order } from '@petdots/contracts';
import { Link, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ApiError, ApiUnavailableError } from '../api/http';
import {
  acceptStoreOrder,
  cancelStoreOrder,
  confirmStoreDelivery,
  dispatchStoreOrder,
  findStoreOrder,
  markStoreOrderItemUnavailable,
  rejectStoreOrder,
} from '../api/store-panel';
import { storeOrderStatusLabel } from '../panel/queue';
import { useSession } from '../session/session-context';
import { AppShell } from '../ui/app-shell';
import { Badge, Body, Button, Card, Field, Heading, Mono } from '../ui/primitives';
import { Colors, formatCents, Spacing } from '../ui/theme';

type Load =
  | { readonly kind: 'loading' }
  | { readonly kind: 'missing' }
  | { readonly kind: 'denied' }
  | { readonly kind: 'unavailable' }
  | { readonly kind: 'ready'; readonly order: Order };

/**
 * One order, from the shop's side: what to separate, where it goes, and every
 * move the state machine still allows.
 *
 * The address and the contact are here because the shop has to deliver there —
 * that is the minimum `SECURITY` §LGPD allows, and no more: the commission is
 * not in this contract at all.
 *
 * **Two steps for anything that moves money** — refusing, cancelling, marking an
 * item unavailable — and one tap for what the next transition undoes anyway:
 * accepting, dispatching, confirming delivery.
 */
export function StoreOrderScreen() {
  const { http } = useSession();
  const { storeId, orderId } = useLocalSearchParams<{ storeId: string; orderId: string }>();
  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    void findStoreOrder(http, storeId, orderId, controller.signal)
      .then((order) => {
        setLoad({ kind: 'ready', order });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setLoad(
          error instanceof ApiError && error.status === 403
            ? { kind: 'denied' }
            : error instanceof ApiError && error.status === 404
              ? { kind: 'missing' }
              : error instanceof ApiUnavailableError
                ? { kind: 'unavailable' }
                : { kind: 'missing' },
        );
      });

    return () => {
      controller.abort();
    };
  }, [http, storeId, orderId]);

  const act = (action: () => Promise<Order>) => {
    setBusy(true);
    setActionError(null);

    void action()
      .then((order) => {
        // The API answers with the order in its new state, so the screen
        // replaces what it is showing instead of refetching.
        setLoad({ kind: 'ready', order });
        setConfirming(null);
        setReason('');
      })
      .catch((error: unknown) => {
        setActionError(
          error instanceof ApiError
            ? error.message
            : 'Não conseguimos falar com o servidor. Tente de novo.',
        );
      })
      .finally(() => {
        setBusy(false);
      });
  };

  const backToQueue = (
    <Link href={`/painel/${storeId}`} style={styles.link}>
      ← Voltar à fila
    </Link>
  );

  if (load.kind === 'loading') {
    return (
      <AppShell title="Pedido">
        <Body muted>Carregando o pedido…</Body>
      </AppShell>
    );
  }

  if (load.kind === 'denied') {
    return (
      <AppShell title="Pedido">
        <Body muted>Você não opera esta loja.</Body>
        <Link href="/painel" style={styles.link}>
          ← Voltar às suas lojas
        </Link>
      </AppShell>
    );
  }

  if (load.kind === 'unavailable') {
    return (
      <AppShell title="Pedido">
        <Body muted>Não conseguimos carregar este pedido agora. Tente de novo em instantes.</Body>
        {backToQueue}
      </AppShell>
    );
  }

  if (load.kind === 'missing') {
    return (
      <AppShell title="Pedido não encontrado">
        <Body muted>Este pedido não é desta loja.</Body>
        {backToQueue}
      </AppShell>
    );
  }

  const { order } = load;
  const canMarkItems = order.status === 'ACCEPTED';

  return (
    <AppShell title={`Pedido ${order.code}`} subtitle={storeOrderStatusLabel(order)}>
      {backToQueue}

      <Card>
        <View style={styles.header}>
          <Mono style={styles.code}>{order.code}</Mono>
          <Badge
            label={storeOrderStatusLabel(order)}
            tone={order.status === 'PLACED' ? 'warning' : 'accent'}
          />
        </View>
        {order.cancellationReason ? (
          <Body muted>Motivo do cancelamento: {order.cancellationReason}</Body>
        ) : null}
      </Card>

      <Card>
        <Heading level={3}>Separar</Heading>

        {order.items.map((item) => (
          <View key={item.id} style={styles.line}>
            <View style={styles.lineInfo}>
              <Body>
                {String(item.quantity)} × {item.productName}
              </Body>
              <Body muted>
                {item.productVariant} · {formatCents(item.unitPriceCents)}
              </Body>
            </View>
            <View style={styles.lineRight}>
              <Mono>{formatCents(item.lineTotalCents)}</Mono>
              {item.fulfillment === 'UNAVAILABLE' ? (
                <Badge label="Indisponível" tone="danger" />
              ) : canMarkItems ? (
                // Two steps: this refunds the line, and the last one cancels
                // the whole order (ADR-0014, C3).
                confirming === item.id ? (
                  <View style={styles.actions}>
                    <Button
                      label={busy ? 'Marcando…' : 'Confirmar'}
                      tone="danger"
                      compact
                      disabled={busy}
                      onPress={() => {
                        act(() => markStoreOrderItemUnavailable(http, storeId, orderId, item.id));
                      }}
                    />
                    <Button
                      label="Voltar"
                      compact
                      disabled={busy}
                      onPress={() => {
                        setConfirming(null);
                      }}
                    />
                  </View>
                ) : (
                  <Button
                    label="Indisponível"
                    tone="danger"
                    compact
                    disabled={busy}
                    onPress={() => {
                      setConfirming(item.id);
                    }}
                  />
                )
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
        <Heading level={3}>Entregar em</Heading>
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
        <Body>
          {order.contactName} · {order.contactPhone}
        </Body>
      </Card>

      {actionError ? <Body style={styles.error}>{actionError}</Body> : null}

      {order.status === 'PLACED' ? (
        <Card style={styles.actionCard}>
          <Button
            label={busy ? 'Aceitando…' : 'Aceitar'}
            tone="primary"
            disabled={busy}
            onPress={() => {
              act(() => acceptStoreOrder(http, storeId, orderId));
            }}
          />
          {confirming === 'rejection' ? (
            <View style={styles.actions}>
              <Button
                label={busy ? 'Recusando…' : 'Confirmar recusa'}
                tone="danger"
                disabled={busy}
                onPress={() => {
                  act(() => rejectStoreOrder(http, storeId, orderId));
                }}
              />
              <Button
                label="Voltar"
                disabled={busy}
                onPress={() => {
                  setConfirming(null);
                }}
              />
            </View>
          ) : (
            <Button
              label="Recusar"
              tone="danger"
              disabled={busy}
              onPress={() => {
                setConfirming('rejection');
              }}
            />
          )}
        </Card>
      ) : null}

      {order.status === 'ACCEPTED' ? (
        <Card style={styles.actionCard}>
          <Button
            label={busy ? 'Despachando…' : 'Despachar'}
            tone="primary"
            disabled={busy}
            onPress={() => {
              act(() => dispatchStoreOrder(http, storeId, orderId));
            }}
          />

          {confirming === 'cancellation' ? (
            <>
              {/* The reason is required — this is the side with something to
                  explain (ADR-0014, C4). It stays on the order and never goes
                  into the audit payload, which may not carry a sentence that
                  names the tutor. */}
              <Field
                label="Por que está cancelando?"
                value={reason}
                onChangeText={setReason}
                placeholder="Ex.: cliente ligou pedindo para cancelar"
                maxLength={200}
                hint="O tutor vê este motivo."
              />
              <View style={styles.actions}>
                <Button
                  label={busy ? 'Cancelando…' : 'Confirmar cancelamento'}
                  tone="danger"
                  disabled={busy || reason.trim().length === 0}
                  onPress={() => {
                    act(() => cancelStoreOrder(http, storeId, orderId, reason.trim()));
                  }}
                />
                <Button
                  label="Voltar"
                  disabled={busy}
                  onPress={() => {
                    setConfirming(null);
                    setReason('');
                  }}
                />
              </View>
            </>
          ) : (
            <Button
              label="Cancelar pedido"
              tone="danger"
              disabled={busy}
              onPress={() => {
                setConfirming('cancellation');
              }}
            />
          )}
        </Card>
      ) : null}

      {order.status === 'DISPATCHED' ? (
        <Card style={styles.actionCard}>
          <Button
            label={busy ? 'Confirmando…' : 'Confirmar entrega'}
            tone="primary"
            disabled={busy}
            onPress={() => {
              act(() => confirmStoreDelivery(http, storeId, orderId));
            }}
          />
        </Card>
      ) : null}
    </AppShell>
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
  actionCard: { gap: Spacing.sm },
  actions: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  error: { color: Colors.danger },
});
