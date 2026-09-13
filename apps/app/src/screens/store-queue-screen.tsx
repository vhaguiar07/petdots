import type { Order, StoreMembership } from '@petdots/contracts';
import { Link, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ApiError, ApiUnavailableError } from '../api/http';
import {
  acceptStoreOrder,
  listMyStoreMemberships,
  listStoreOrders,
  rejectStoreOrder,
} from '../api/store-panel';
import { deadlineLabel, groupOrdersForQueue, storeOrderStatusLabel } from '../panel/queue';
import { useSession } from '../session/session-context';
import { AppShell } from '../ui/app-shell';
import { Badge, Body, Button, Card, Heading, Mono } from '../ui/primitives';
import { Colors, formatCents, Spacing } from '../ui/theme';

/** The panel refreshes itself while nobody touches it — there is no push yet. */
const POLL_INTERVAL_MS = 20_000;

type Load =
  | { readonly kind: 'loading' }
  | { readonly kind: 'denied' }
  | { readonly kind: 'unavailable' }
  | { readonly kind: 'ready'; readonly orders: Order[] };

/**
 * The store's queue — the screen a shopkeeper leaves open on the counter.
 *
 * 🔴 **Polling every 20 seconds**, because there is no notification yet
 * (capability 10) and an order nobody sees is an order that expires. The
 * interval is what `USER_JOURNEYS` §risco de UX describes; push is a decision
 * the notifications ADR owes.
 *
 * Two details that are not incidental: the timer is cleared on unmount and the
 * request is aborted with it, so leaving the screen does not leave a request
 * racing to set state on something gone; and polling **pauses while the tab is
 * hidden**, because a panel left open overnight would otherwise make 4,320
 * requests before anybody looked at it.
 */
export function StoreQueueScreen() {
  const { http } = useSession();
  const { storeId } = useLocalSearchParams<{ storeId: string }>();
  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [membership, setMembership] = useState<StoreMembership | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [confirmingRejection, setConfirmingRejection] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  const refresh = useCallback(
    (signal?: AbortSignal) =>
      listStoreOrders(http, storeId, undefined, signal)
        .then((orders) => {
          setLoad({ kind: 'ready', orders });
          setNow(new Date());
        })
        .catch((error: unknown) => {
          if (signal?.aborted) {
            return;
          }

          setLoad(
            error instanceof ApiError && error.status === 403
              ? { kind: 'denied' }
              : error instanceof ApiUnavailableError
                ? { kind: 'unavailable' }
                : { kind: 'unavailable' },
          );
        }),
    [http, storeId],
  );

  // Which shop this is, and in what capacity — the links to Horários and
  // Prateleira depend on the role, and the role is not in the token (B7).
  useEffect(() => {
    const controller = new AbortController();

    void listMyStoreMemberships(http, controller.signal)
      .then((memberships) => {
        setMembership(memberships.find((entry) => entry.store.id === storeId) ?? null);
      })
      .catch(() => {
        // The queue below reports the real failure; a missing header is not
        // worth a second error message.
      });

    return () => {
      controller.abort();
    };
  }, [http, storeId]);

  useEffect(() => {
    const controller = new AbortController();

    void refresh(controller.signal);

    const timer = setInterval(() => {
      // `document` exists only on web; on a device the app is foregrounded or
      // it is not running at all.
      if (typeof document !== 'undefined' && document.hidden) {
        return;
      }

      void refresh(controller.signal);
    }, POLL_INTERVAL_MS);

    return () => {
      clearInterval(timer);
      controller.abort();
    };
  }, [refresh]);

  const act = (orderId: string, action: (id: string) => Promise<Order>) => {
    setActing(orderId);
    setActionError(null);

    void action(orderId)
      .then(() => refresh())
      .catch((error: unknown) => {
        setActionError(
          error instanceof ApiError
            ? error.message
            : 'Não conseguimos falar com o servidor. Tente de novo.',
        );
      })
      .finally(() => {
        setActing(null);
        setConfirmingRejection(null);
      });
  };

  if (load.kind === 'loading') {
    return (
      <AppShell title="Painel da loja">
        <Body muted>Carregando a fila…</Body>
      </AppShell>
    );
  }

  if (load.kind === 'denied') {
    return (
      <AppShell title="Painel da loja">
        <Body muted>Você não opera esta loja.</Body>
        <Link href="/painel" style={styles.link}>
          ← Voltar às suas lojas
        </Link>
      </AppShell>
    );
  }

  if (load.kind === 'unavailable') {
    return (
      <AppShell title="Painel da loja">
        <Body muted>Não conseguimos carregar a fila agora. Tente de novo em instantes.</Body>
        <Link href="/painel" style={styles.link}>
          ← Voltar às suas lojas
        </Link>
      </AppShell>
    );
  }

  const queue = groupOrdersForQueue(load.orders);
  const isOwner = membership?.role === 'OWNER';

  const card = (order: Order, actions?: 'accept') => (
    <Card key={order.id}>
      <View style={styles.cardHeader}>
        <Link href={`/painel/${storeId}/pedidos/${order.id}`} style={styles.code}>
          {order.code}
        </Link>
        <Badge
          label={storeOrderStatusLabel(order)}
          tone={order.status === 'PLACED' ? 'warning' : 'accent'}
        />
      </View>

      {order.status === 'PLACED' ? (
        <Body muted>{deadlineLabel(order, now)}</Body>
      ) : (
        <Body muted>{order.contactName}</Body>
      )}

      {order.items.map((item) => (
        <Body key={item.id} muted>
          {String(item.quantity)} × {item.productName} · {item.productVariant}
        </Body>
      ))}

      <Mono>{formatCents(order.totalCents)}</Mono>

      {actions === 'accept' ? (
        <View style={styles.actions}>
          {/* Accepting is the expected move and is undone by the next
              transition, so it is one tap. Refusing moves money back, so it
              asks twice — the same rule the tutor's cancellation follows. */}
          <Button
            label={acting === order.id ? 'Aceitando…' : 'Aceitar'}
            tone="primary"
            disabled={acting !== null}
            onPress={() => {
              act(order.id, (id) => acceptStoreOrder(http, storeId, id));
            }}
          />
          {confirmingRejection === order.id ? (
            <>
              <Button
                label={acting === order.id ? 'Recusando…' : 'Confirmar recusa'}
                tone="danger"
                disabled={acting !== null}
                onPress={() => {
                  act(order.id, (id) => rejectStoreOrder(http, storeId, id));
                }}
              />
              <Button
                label="Voltar"
                disabled={acting !== null}
                onPress={() => {
                  setConfirmingRejection(null);
                }}
              />
            </>
          ) : (
            <Button
              label="Recusar"
              tone="danger"
              disabled={acting !== null}
              onPress={() => {
                setConfirmingRejection(order.id);
              }}
            />
          )}
        </View>
      ) : (
        <Link href={`/painel/${storeId}/pedidos/${order.id}`} style={styles.link}>
          Abrir pedido →
        </Link>
      )}
    </Card>
  );

  return (
    <AppShell
      title={membership?.store.name ?? 'Painel da loja'}
      subtitle={isOwner ? 'Você é a dona desta loja' : 'Você opera esta loja'}
    >
      <View style={styles.toolbar}>
        <Link href="/painel" style={styles.link}>
          ← Suas lojas
        </Link>
        {/* Only the owner: the schedule and the price are commercial decisions
            (ADR-0013 §permissões). The API refuses the operator anyway — this
            just keeps them from walking into a 403. */}
        {isOwner ? (
          <Link href={`/painel/${storeId}/horarios`} style={styles.link}>
            Horários
          </Link>
        ) : null}
        {isOwner ? (
          <Link href={`/painel/${storeId}/ofertas`} style={styles.link}>
            Prateleira
          </Link>
        ) : null}
      </View>

      {actionError ? <Body style={styles.error}>{actionError}</Body> : null}

      <Section title="Aguardando você" count={queue.waiting.length}>
        {queue.waiting.length === 0 ? (
          <Body muted>Nenhum pedido esperando agora.</Body>
        ) : (
          queue.waiting.map((order) => card(order, 'accept'))
        )}
      </Section>

      <Section title="Aceitos — separar" count={queue.accepted.length}>
        {queue.accepted.map((order) => card(order))}
      </Section>

      <Section title="Saíram para entrega" count={queue.dispatched.length}>
        {queue.dispatched.map((order) => card(order))}
      </Section>

      <Section title="Concluídos" count={queue.done.length}>
        {queue.done.map((order) => card(order))}
      </Section>
    </AppShell>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  if (count === 0 && title !== 'Aguardando você') {
    return null;
  }

  return (
    <View style={styles.section}>
      <Heading level={3}>
        {title} ({String(count)})
      </Heading>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  link: { fontSize: 14, fontWeight: '600', color: Colors.accent, alignSelf: 'flex-start' },
  toolbar: { flexDirection: 'row', gap: Spacing.lg, flexWrap: 'wrap' },
  section: { gap: Spacing.md },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    flexWrap: 'wrap',
  },
  code: { fontSize: 20, fontWeight: '700', color: Colors.accent },
  actions: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap', marginTop: Spacing.sm },
  error: { color: Colors.danger },
});
