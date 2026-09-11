import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { STORES, listOrders } from '../fixtures/data-source';
import { buildIncomingOrder } from '../fixtures/orders';
import type { ItemFulfillment, Order, OrderStatus } from '../fixtures/types';
import { AppShell } from '../ui/app-shell';
import { Badge, Body, Button, Card, Heading, Mono } from '../ui/primitives';
import type { BadgeTone } from '../ui/primitives';
import { Colors, DesktopMinWidth, Spacing, formatCents } from '../ui/theme';

/** A new order lands every ~20 s — the panel is judged on prolonged use (A6). */
const INCOMING_INTERVAL_MS = 20_000;

const STATUS_LABEL: Record<OrderStatus, string> = {
  PLACED: 'Aguardando aceite',
  ACCEPTED: 'Em separação',
  DISPATCHED: 'Saiu para entrega',
  DELIVERED: 'Entregue',
  REJECTED: 'Recusado',
};

const STATUS_TONE: Record<OrderStatus, BadgeTone> = {
  PLACED: 'warning',
  ACCEPTED: 'accent',
  DISPATCHED: 'accent',
  DELIVERED: 'positive',
  REJECTED: 'danger',
};

const REJECTION_OPTIONS = [
  'Produto em falta',
  'Fora do horário de funcionamento',
  'Endereço fora da rota',
];

type Filter = 'ALL' | OrderStatus;

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'ALL', label: 'Todos' },
  { key: 'PLACED', label: 'Aguardando aceite' },
  { key: 'ACCEPTED', label: 'Em separação' },
  { key: 'DISPATCHED', label: 'Saiu para entrega' },
  { key: 'DELIVERED', label: 'Entregues' },
  { key: 'REJECTED', label: 'Recusados' },
];

export function StorePanelScreen() {
  const { width } = useWindowDimensions();
  const desktop = width >= DesktopMinWidth;

  const [orders, setOrders] = useState<Order[] | null>(null);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [liveCount, setLiveCount] = useState(0);
  const incoming = useRef(0);

  useEffect(() => {
    let active = true;
    void listOrders().then((result) => {
      if (active) setOrders(result);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      incoming.current += 1;
      const order = buildIncomingOrder(incoming.current);
      setOrders((current) => (current ? [order, ...current] : current));
      setLiveCount((count) => count + 1);
    }, INCOMING_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  const update = useCallback((orderId: string, patch: Partial<Order>) => {
    setOrders((current) =>
      current
        ? current.map((order) => (order.id === orderId ? { ...order, ...patch } : order))
        : current,
    );
  }, []);

  const markItem = useCallback((orderId: string, itemId: string, fulfillment: ItemFulfillment) => {
    setOrders((current) =>
      current
        ? current.map((order) =>
            order.id === orderId
              ? {
                  ...order,
                  items: order.items.map((item) =>
                    item.id === itemId ? { ...item, fulfillment } : item,
                  ),
                }
              : order,
          )
        : current,
    );
  }, []);

  const counts = useMemo(() => {
    const result = new Map<Filter, number>([['ALL', orders?.length ?? 0]]);
    for (const order of orders ?? []) {
      result.set(order.status, (result.get(order.status) ?? 0) + 1);
    }
    return result;
  }, [orders]);

  const visible = useMemo(
    () => (orders ?? []).filter((order) => filter === 'ALL' || order.status === filter),
    [orders, filter],
  );

  const selected = useMemo(
    () => visible.find((order) => order.id === selectedId) ?? visible[0] ?? null,
    [visible, selectedId],
  );

  return (
    <AppShell
      title="Painel do lojista"
      subtitle="Fila de pedidos com atualização frequente — pensada para ficar aberta a tarde inteira numa tela grande."
      scroll={false}
    >
      <View style={styles.filterRow}>
        {FILTERS.map((item) => (
          <Button
            key={item.key}
            label={`${item.label} (${counts.get(item.key) ?? 0})`}
            compact
            tone={filter === item.key ? 'primary' : 'neutral'}
            onPress={() => setFilter(item.key)}
          />
        ))}
        {liveCount > 0 ? (
          <Badge
            label={`${liveCount} ${liveCount === 1 ? 'pedido novo' : 'pedidos novos'} desde que você abriu`}
            tone="accent"
          />
        ) : null}
      </View>

      <View style={desktop ? styles.splitDesktop : styles.split}>
        <View style={styles.queueColumn}>
          {orders === null ? (
            <Card>
              <Body muted>Carregando a fila…</Body>
            </Card>
          ) : (
            <ScrollView style={styles.queueScroll} contentContainerStyle={styles.queueContent}>
              {visible.map((order) => (
                <QueueCard
                  key={order.id}
                  order={order}
                  selected={selected?.id === order.id}
                  onSelect={() => setSelectedId(order.id)}
                  onAccept={() => update(order.id, { status: 'ACCEPTED' })}
                  onReject={() => {
                    setSelectedId(order.id);
                    setRejecting(order.id);
                  }}
                  onDispatch={() => update(order.id, { status: 'DISPATCHED' })}
                  onDeliver={() => update(order.id, { status: 'DELIVERED' })}
                />
              ))}
              {visible.length === 0 ? (
                <Card>
                  <Body muted>Nenhum pedido nesse filtro.</Body>
                </Card>
              ) : null}
            </ScrollView>
          )}
        </View>

        <View style={desktop ? styles.detailColumn : undefined}>
          <ScrollView contentContainerStyle={styles.detailContent}>
            <OrderDetail
              order={selected}
              rejecting={rejecting === selected?.id}
              onMarkItem={markItem}
              onConfirmRejection={(reason) => {
                if (!selected) return;
                update(selected.id, { status: 'REJECTED', rejectionReason: reason });
                setRejecting(null);
              }}
              onCancelRejection={() => setRejecting(null)}
            />
          </ScrollView>
        </View>
      </View>
    </AppShell>
  );
}

function QueueCard({
  order,
  selected,
  onSelect,
  onAccept,
  onReject,
  onDispatch,
  onDeliver,
}: {
  order: Order;
  selected: boolean;
  onSelect: () => void;
  onAccept: () => void;
  onReject: () => void;
  onDispatch: () => void;
  onDeliver: () => void;
}) {
  const store = STORES.find((candidate) => candidate.id === order.storeId);

  return (
    <Card style={[styles.queueCard, selected && styles.queueCardSelected]}>
      <View style={styles.queueHead}>
        <Mono style={styles.code}>{order.code}</Mono>
        <Badge label={STATUS_LABEL[order.status]} tone={STATUS_TONE[order.status]} />
        {order.acquisitionChannel === 'STORE_REFERRAL' ? (
          <Badge label="cliente próprio · sem comissão" tone="positive" />
        ) : null}
      </View>

      <Body>
        {order.tutorName} · {order.neighborhood}
      </Body>
      <Body muted style={styles.metaText}>
        {store?.name ?? order.storeId} · {order.items.length}{' '}
        {order.items.length === 1 ? 'item' : 'itens'} ·{' '}
        {new Date(order.placedAt).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Body>

      <View style={styles.queueFoot}>
        <Mono style={styles.total}>{formatCents(order.totalCents)}</Mono>
        <View style={styles.queueActions}>
          <Button label="Abrir" compact onPress={onSelect} />
          {order.status === 'PLACED' ? (
            <>
              <Button label="Aceitar" compact tone="primary" onPress={onAccept} />
              <Button label="Recusar" compact tone="danger" onPress={onReject} />
            </>
          ) : null}
          {order.status === 'ACCEPTED' ? (
            <Button label="Despachar" compact tone="primary" onPress={onDispatch} />
          ) : null}
          {order.status === 'DISPATCHED' ? (
            <Button label="Confirmar entrega" compact tone="primary" onPress={onDeliver} />
          ) : null}
        </View>
      </View>
    </Card>
  );
}

function OrderDetail({
  order,
  rejecting,
  onMarkItem,
  onConfirmRejection,
  onCancelRejection,
}: {
  order: Order | null;
  rejecting: boolean;
  onMarkItem: (orderId: string, itemId: string, fulfillment: ItemFulfillment) => void;
  onConfirmRejection: (reason: string) => void;
  onCancelRejection: () => void;
}) {
  if (!order) {
    return (
      <Card>
        <Heading level={3}>Detalhe do pedido</Heading>
        <Body muted>Selecione um pedido na fila.</Body>
      </Card>
    );
  }

  return (
    <Card>
      <Heading level={3}>Pedido {order.code}</Heading>
      <Body muted>
        {order.tutorName} · {order.neighborhood} ·{' '}
        {new Date(order.placedAt).toLocaleString('pt-BR')}
      </Body>

      {rejecting ? (
        <View style={styles.rejectBlock}>
          <Heading level={4}>Motivo da recusa</Heading>
          <Body muted style={styles.metaText}>
            O Pix já foi capturado: recusar deixa o cliente pago sem caminho de volta enquanto o
            estorno não estiver modelado. O motivo é obrigatório.
          </Body>
          <View style={styles.rejectOptions}>
            {REJECTION_OPTIONS.map((reason) => (
              <Button
                key={reason}
                label={reason}
                compact
                tone="danger"
                onPress={() => onConfirmRejection(reason)}
              />
            ))}
            <Button label="Voltar" compact onPress={onCancelRejection} />
          </View>
        </View>
      ) : null}

      {order.rejectionReason ? (
        <View style={styles.rejectedNote}>
          <Badge label={`Recusado: ${order.rejectionReason}`} tone="danger" />
        </View>
      ) : null}

      <View style={styles.itemList}>
        {order.items.map((item) => (
          <View key={item.id} style={styles.item}>
            <View style={styles.itemInfo}>
              <Body>{item.productNameSnapshot}</Body>
              <Body muted style={styles.metaText}>
                {item.quantity} × {formatCents(item.unitPriceCents)} · comissão{' '}
                {item.commissionRateBpsSnapshot / 100}% = {formatCents(item.commissionAmountCents)}
              </Body>
            </View>
            <View style={styles.itemActions}>
              {item.fulfillment === 'UNAVAILABLE' ? (
                <Badge label="indisponível" tone="danger" />
              ) : (
                <Button
                  label="Marcar indisponível"
                  compact
                  onPress={() => onMarkItem(order.id, item.id, 'UNAVAILABLE')}
                />
              )}
            </View>
          </View>
        ))}
      </View>

      <View style={styles.totals}>
        <TotalLine label="Itens" cents={order.itemsTotalCents} />
        <TotalLine label="Entrega" cents={order.deliveryFeeCents} />
        <TotalLine label="Taxa de serviço" cents={order.serviceFeeCents} />
        <TotalLine label="Comissão retida" cents={order.commissionTotalCents} />
        <View style={styles.netLine}>
          <Body>Líquido da loja</Body>
          <Mono style={styles.total}>
            {formatCents(order.itemsTotalCents - order.commissionTotalCents)}
          </Mono>
        </View>
      </View>
    </Card>
  );
}

function TotalLine({ label, cents }: { label: string; cents: number }) {
  return (
    <View style={styles.totalLine}>
      <Body muted>{label}</Body>
      <Mono>{formatCents(cents)}</Mono>
    </View>
  );
}

const styles = StyleSheet.create({
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, alignItems: 'center' },
  split: { gap: Spacing.lg, flex: 1 },
  splitDesktop: { flexDirection: 'row', gap: Spacing.lg, flex: 1, alignItems: 'stretch' },
  queueColumn: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0 },
  queueScroll: { flex: 1 },
  queueContent: { gap: Spacing.md, paddingBottom: Spacing.xl },
  detailColumn: { flexGrow: 0, flexShrink: 0, flexBasis: 420 },
  detailContent: { paddingBottom: Spacing.xl },
  queueCard: { gap: Spacing.xs },
  queueCardSelected: { borderColor: Colors.accent, borderWidth: 2 },
  queueHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  queueFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    flexWrap: 'wrap',
    marginTop: Spacing.xs,
  },
  queueActions: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  code: { fontWeight: '700' },
  total: { fontWeight: '700' },
  metaText: { fontSize: 12 },
  itemList: { gap: Spacing.md, marginTop: Spacing.md },
  item: {
    gap: Spacing.xs,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  itemInfo: { gap: 2 },
  itemActions: { flexDirection: 'row', gap: Spacing.sm },
  totals: { marginTop: Spacing.md, gap: 2 },
  totalLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  netLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  rejectBlock: { gap: Spacing.sm, marginTop: Spacing.md },
  rejectOptions: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  rejectedNote: { marginTop: Spacing.sm },
});
