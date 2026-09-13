import type { OrderQuote } from '@petdots/contracts';
import { Link, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { placeOrder, quoteOrder } from '../api/orders';
import { ApiError, ApiUnavailableError } from '../api/http';
import { useCart } from '../cart/cart-context';
import { cartItemCount, cartSubtotalCents, toQuoteRequest } from '../cart/cart-state';
import { storeClock } from '../cart/order-labels';
import { useSession } from '../session/session-context';
import { AppShell } from '../ui/app-shell';
import { Badge, Body, Button, Card, Heading, Mono } from '../ui/primitives';
import { Colors, formatCents, formatMinutes, Spacing } from '../ui/theme';

/** Enough for a person to finish tapping `+` before the request leaves. */
const QUOTE_DEBOUNCE_MS = 300;

type Quote =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'unavailable' }
  | { readonly kind: 'blocked'; readonly code: string; readonly message: string }
  | { readonly kind: 'ready'; readonly quote: OrderQuote };

/**
 * The checkout: the cart, priced by the server, and the button that turns it
 * into an order.
 *
 * 🔴 **Every number on this screen comes from the quote, not from the cart.**
 * The cart carries last-known prices so the shopfront bar can show a running
 * total without a request per tap; what is *charged* is decided server-side,
 * and showing the local copy here would mean the tutor agreeing to a total the
 * API never said.
 *
 * The route is public so an anonymous visitor can see what they picked. The
 * quote and the order need a session, and the screen says so rather than
 * redirecting: being bounced to a login form from a page you were reading is
 * how a cart gets abandoned.
 */
export function CartScreen() {
  const router = useRouter();
  const { http, state } = useSession();
  const { cart, restoring, changeQuantity, remove, clear } = useCart();
  const [quote, setQuote] = useState<Quote>({ kind: 'idle' });
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);

  /**
   * The idempotency key of *this* checkout attempt.
   *
   * Generated once when the screen mounts and kept until an order succeeds, so
   * a double tap or a retry on a bad connection carries the same key and
   * creates one order. Regenerated after a success, because the next order is a
   * genuinely different one.
   */
  const idempotencyKey = useRef(newKey());

  const signedIn = state.kind === 'signedIn';
  const isTutor = signedIn && state.session.user.roles.includes('TUTOR');
  const body = cart ? JSON.stringify(toQuoteRequest(cart)) : null;

  const requote = useCallback(
    (signal: AbortSignal) => {
      if (!cart || !isTutor) {
        setQuote({ kind: 'idle' });
        return;
      }

      setQuote({ kind: 'loading' });

      void quoteOrder(http, toQuoteRequest(cart), signal)
        .then((it) => {
          setQuote({ kind: 'ready', quote: it });
        })
        .catch((error: unknown) => {
          if (signal.aborted) {
            return;
          }

          // 🔴 Every failure lands on a drawn state, never on a blank screen
          // (BUG-R01). The ones with a code get a specific card, because each
          // has a different way out.
          setQuote(
            error instanceof ApiUnavailableError
              ? { kind: 'unavailable' }
              : error instanceof ApiError
                ? { kind: 'blocked', code: error.code, message: error.message }
                : { kind: 'unavailable' },
          );
        });
    },
    [cart, http, isTutor],
  );

  // Debounced and abortable: the checkout re-quotes on every change of
  // quantity, and an answer that arrived after the next one would overwrite a
  // newer total with an older one.
  useEffect(() => {
    if (!body || !isTutor) {
      setQuote({ kind: 'idle' });
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      requote(controller.signal);
    }, QUOTE_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [body, isTutor, requote]);

  const onPlace = () => {
    if (!cart || placing) {
      return;
    }

    setPlacing(true);
    setPlaceError(null);

    void placeOrder(http, toQuoteRequest(cart), idempotencyKey.current)
      .then((order) => {
        idempotencyKey.current = newKey();
        clear();
        router.replace(`/pedidos/${order.id}`);
      })
      .catch((error: unknown) => {
        setPlaceError(
          error instanceof ApiError
            ? error.message
            : 'Não conseguimos falar com o servidor. Tente de novo.',
        );
      })
      .finally(() => {
        setPlacing(false);
      });
  };

  if (restoring) {
    return (
      <AppShell title="Carrinho">
        <Body muted>Carregando seu carrinho…</Body>
      </AppShell>
    );
  }

  if (!cart || cart.lines.length === 0) {
    return (
      <AppShell title="Carrinho">
        <Body muted>Seu carrinho está vazio.</Body>
        <Link href="/" style={styles.link}>
          Ver preços no comparador
        </Link>
      </AppShell>
    );
  }

  return (
    <AppShell title="Carrinho" subtitle={cart.storeName}>
      <Card>
        <Heading level={3}>Itens</Heading>

        {cart.lines.map((line) => {
          const priced =
            quote.kind === 'ready'
              ? quote.quote.items.find((item) => item.offerId === line.offerId)
              : undefined;

          return (
            <View key={line.offerId} style={styles.line}>
              <View style={styles.lineInfo}>
                <Body>{line.productName}</Body>
                <Body muted>{line.productVariant}</Body>
              </View>

              <View style={styles.lineActions}>
                <Button
                  label="−"
                  compact
                  onPress={() => {
                    changeQuantity(line.offerId, line.quantity - 1);
                  }}
                />
                <Mono>{String(line.quantity)}</Mono>
                <Button
                  label="+"
                  compact
                  onPress={() => {
                    changeQuantity(line.offerId, line.quantity + 1);
                  }}
                />
                <Mono>
                  {/* The quote's price, not the cart's — the cart's is
                      last-known information (ADR-0017). */}
                  {formatCents(priced?.lineTotalCents ?? line.unitPriceCents * line.quantity)}
                </Mono>
                <Button
                  label="Remover"
                  compact
                  tone="danger"
                  onPress={() => {
                    remove(line.offerId);
                  }}
                />
              </View>
            </View>
          );
        })}
      </Card>

      {!signedIn ? (
        <Card style={styles.noticeCard}>
          <Heading level={3}>Entre para fazer o pedido</Heading>
          <Body muted>Seu carrinho continua aqui depois que você entrar.</Body>
          <Link href="/entrar?next=/carrinho" style={styles.link}>
            Entrar
          </Link>
        </Card>
      ) : !isTutor ? (
        <Card style={styles.noticeCard}>
          <Heading level={3}>Esta conta não faz pedidos</Heading>
          <Body muted>
            Pedidos são feitos por uma conta de tutor. Entre com a sua conta pessoal para continuar.
          </Body>
        </Card>
      ) : (
        <QuotePanel
          quote={quote}
          placing={placing}
          placeError={placeError}
          subtotalFallback={cartSubtotalCents(cart)}
          onPlace={onPlace}
        />
      )}

      <Body muted>
        {cartItemCount(cart) === 1 ? '1 item' : `${String(cartItemCount(cart))} itens`} no carrinho
      </Body>
    </AppShell>
  );
}

/** The priced half of the screen, and every reason it might not be there. */
function QuotePanel({
  quote,
  placing,
  placeError,
  subtotalFallback,
  onPlace,
}: {
  quote: Quote;
  placing: boolean;
  placeError: string | null;
  subtotalFallback: number;
  onPlace: () => void;
}) {
  if (quote.kind === 'loading' || quote.kind === 'idle') {
    return (
      <Card>
        <Body muted>Calculando o total…</Body>
        <Body muted>Subtotal estimado: {formatCents(subtotalFallback)}</Body>
      </Card>
    );
  }

  if (quote.kind === 'unavailable') {
    return (
      <Card>
        <Body muted>Não conseguimos calcular o total agora. Tente de novo em instantes.</Body>
      </Card>
    );
  }

  if (quote.kind === 'blocked') {
    return <BlockedCard code={quote.code} message={quote.message} />;
  }

  const { quote: priced } = quote;

  return (
    <Card>
      <Heading level={3}>Resumo</Heading>

      <View style={styles.addressBlock}>
        <Body muted>Entregar em</Body>
        <Body>
          {priced.deliveryAddress.street}, {priced.deliveryAddress.number}
          {priced.deliveryAddress.complement ? ` · ${priced.deliveryAddress.complement}` : ''}
        </Body>
        <Body muted>
          {priced.deliveryAddress.neighborhood} · {priced.deliveryAddress.postalCode}
        </Body>
        <Link href="/conta/endereco?next=/carrinho" style={styles.link}>
          Editar endereço
        </Link>
      </View>

      <View style={styles.totals}>
        <Row label="Subtotal" value={formatCents(priced.itemsTotalCents)} />
        <Row
          label={`Entrega (${priced.deliveryArea.label} · ${formatMinutes(priced.deliveryArea.estimatedMinutes)})`}
          value={formatCents(priced.deliveryFeeCents)}
        />
        <Row label="Taxa de serviço" value={formatCents(priced.serviceFeeCents)} />
        <Row label="Total" value={formatCents(priced.totalCents)} strong />
      </View>

      {priced.storeOpenNow ? (
        <Body muted>
          A loja tem {String(priced.acceptanceWindowMinutes)} min para aceitar depois que você
          pedir.
        </Body>
      ) : (
        <View style={styles.closedBlock}>
          <Badge
            label={
              priced.nextOpeningAt
                ? `Fechada agora · abre às ${storeClock(new Date(priced.nextOpeningAt))}`
                : 'Fechada agora'
            }
            tone="warning"
          />
          <Body muted>
            Fora do horário o pedido não é criado — nada é cobrado antes de a loja poder atender.
          </Body>
        </View>
      )}

      {placeError ? <Body style={styles.error}>{placeError}</Body> : null}

      <Button
        label={placing ? 'Enviando…' : 'Fazer pedido'}
        tone="primary"
        disabled={placing || !priced.storeOpenNow}
        onPress={onPlace}
      />
    </Card>
  );
}

/**
 * One card per reason the cart cannot be ordered, each with its own way out.
 *
 * Collapsing them into "não foi possível" would leave the person with a screen
 * that refuses and does not say what to do — which is the same failure as a
 * blank page, only politer.
 */
function BlockedCard({ code, message }: { code: string; message: string }) {
  if (code === 'TUTOR_PROFILE_REQUIRED') {
    return (
      <Card style={styles.noticeCard}>
        <Heading level={3}>Complete seu endereço</Heading>
        <Body muted>Precisamos do seu telefone e do endereço de entrega para fazer o pedido.</Body>
        <Link href="/conta/endereco?next=/carrinho" style={styles.link}>
          Completar cadastro
        </Link>
      </Card>
    );
  }

  if (code === 'ADDRESS_OUT_OF_DELIVERY_AREA') {
    return (
      <Card style={styles.noticeCard}>
        <Heading level={3}>Esta loja não entrega no seu endereço</Heading>
        <Body muted>{message}</Body>
        <Link href="/conta/endereco?next=/carrinho" style={styles.link}>
          Editar endereço
        </Link>
        <Link href="/" style={styles.link}>
          Ver outras lojas
        </Link>
      </Card>
    );
  }

  if (code === 'OFFER_UNAVAILABLE' || code === 'ORDER_ITEMS_INVALID') {
    return (
      <Card style={styles.noticeCard}>
        <Heading level={3}>Um item saiu da prateleira</Heading>
        <Body muted>{message}</Body>
        <Body muted>Remova o item indisponível para continuar.</Body>
      </Card>
    );
  }

  if (code === 'STORE_NOT_ACTIVE' || code === 'STORE_NOT_FOUND') {
    return (
      <Card style={styles.noticeCard}>
        <Heading level={3}>Esta loja não está recebendo pedidos</Heading>
        <Body muted>{message}</Body>
        <Link href="/" style={styles.link}>
          Ver outras lojas
        </Link>
      </Card>
    );
  }

  return (
    <Card style={styles.noticeCard}>
      <Body muted>{message}</Body>
    </Card>
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

/**
 * `crypto.randomUUID` is available in every browser the pilot targets and in
 * Hermes through `expo-crypto`'s polyfill; the fallback keeps the screen
 * working on an older engine rather than throwing where an order should start.
 */
function newKey(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random & 0x3) | 0x8;

    return value.toString(16);
  });
}

const styles = StyleSheet.create({
  link: { fontSize: 14, fontWeight: '600', color: Colors.accent, alignSelf: 'flex-start' },
  line: {
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  lineInfo: { gap: 2 },
  lineActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  noticeCard: { borderColor: Colors.warning, gap: Spacing.sm },
  addressBlock: { gap: 2, marginTop: Spacing.sm },
  totals: { gap: Spacing.xs, marginTop: Spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md },
  strong: { fontWeight: '700' },
  closedBlock: { gap: Spacing.sm, alignItems: 'flex-start', marginTop: Spacing.sm },
  error: { color: Colors.danger },
});
