import type { Store, StoreOffer } from '@petdots/contracts';
import { Link, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ApiError, ApiUnavailableError } from '../api/http';
import { listStoreOffers } from '../api/offers';
import { findStore } from '../api/stores';
import { CartBar, CartFullNotice, StoreConflictCard, useAddToCart } from '../cart/add-to-cart';
import { isStoreOpen, openingLabel } from '../cart/order-labels';
import { useSession } from '../session/session-context';
import { AppShell } from '../ui/app-shell';
import {
  Badge,
  Body,
  Button,
  Card,
  Cell,
  Heading,
  Mono,
  Table,
  TableHeader,
  TableRow,
} from '../ui/primitives';
import { Colors, formatCents, formatMinutes, Spacing } from '../ui/theme';

type Load =
  | { readonly kind: 'loading' }
  | { readonly kind: 'missing' }
  | { readonly kind: 'unavailable' }
  | { readonly kind: 'ready'; readonly store: Store; readonly offers: StoreOffer[] };

/**
 * One store's shopfront, reached from every store name in the comparator.
 *
 * The two calls go in parallel: the page is useless with only half of it, and
 * the API answers the same `404 STORE_NOT_FOUND` from both when the store is
 * paused, so either rejection produces the same screen.
 */
export function StoreScreen() {
  const { http } = useSession();
  const { addLine, pending, confirmSwitch, keepCurrent, full } = useAddToCart();
  /**
   * `produto` is optional and only ever a hint: it says which product the
   * person was looking at when they clicked the store name in the comparator,
   * so the shopfront can point at that row instead of making them find it
   * again among dozens (`pd-15`).
   */
  const { storeId, produto } = useLocalSearchParams<{ storeId: string; produto?: string }>();
  const [load, setLoad] = useState<Load>({ kind: 'loading' });

  useEffect(() => {
    const controller = new AbortController();

    void Promise.all([
      findStore(http, storeId, controller.signal),
      listStoreOffers(http, storeId, controller.signal),
    ])
      .then(([store, offers]) => {
        setLoad({ kind: 'ready', store, offers });
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
  }, [http, storeId]);

  if (load.kind === 'loading') {
    return (
      <AppShell title="Carregando…">
        <Body muted>Buscando a loja.</Body>
      </AppShell>
    );
  }

  if (load.kind === 'unavailable') {
    return (
      <AppShell title="Loja">
        <Body muted>Não conseguimos carregar esta loja agora. Tente de novo em instantes.</Body>
        <BackToComparator />
      </AppShell>
    );
  }

  if (load.kind === 'missing') {
    return (
      <AppShell title="Loja não encontrada">
        <Body muted>Essa loja não existe no piloto do Grande Méier.</Body>
        <BackToComparator />
      </AppShell>
    );
  }

  const { store, offers } = load;
  const open = isStoreOpen(store.openingHours);
  const lineOf = (offer: StoreOffer) => ({
    offerId: offer.offerId,
    productId: offer.product.id,
    productName: offer.product.name,
    productVariant: offer.product.variant,
    unitPriceCents: offer.priceCents,
    quantity: 1,
  });

  const onAdd = (offer: StoreOffer) => {
    addLine({ id: store.id, name: store.name }, lineOf(offer));
  };

  /**
   * 🔴 The row the person came for.
   *
   * Without it they land on a shelf of dozens sorted by name and have to pick
   * the product **again** — and the pilot's catalogue has the same ração in 3 kg
   * and 15 kg, adjacent in that list. Re-deciding something you already decided
   * is where the wrong variant gets bought (`pd-15`).
   */
  const wanted = produto ? offers.find((offer) => offer.product.slug === produto) : undefined;

  return (
    <AppShell title={store.name} subtitle={`${store.neighborhood} · vitrine da loja`}>
      <BackToComparator />

      <View style={styles.openingRow}>
        <Badge label={openingLabel(store.openingHours)} tone={open ? 'positive' : 'warning'} />
        {open ? null : (
          <Body muted>Você pode montar o carrinho agora e fazer o pedido na abertura.</Body>
        )}
      </View>

      {wanted ? (
        <Card style={styles.wantedCard}>
          <Heading level={3}>{wanted.product.name}</Heading>
          <Body muted>
            {wanted.product.variant} · {wanted.product.brand}
          </Body>
          <View style={styles.wantedRow}>
            <Mono style={styles.wantedPrice}>{formatCents(wanted.priceCents)}</Mono>
            <Button
              label="Adicionar"
              tone="primary"
              onPress={() => {
                onAdd(wanted);
              }}
            />
          </View>
          <Body muted>
            É o produto que você estava comparando. A prateleira inteira vem abaixo.
          </Body>
        </Card>
      ) : null}

      {pending ? (
        <StoreConflictCard pending={pending} onConfirm={confirmSwitch} onKeep={keepCurrent} />
      ) : null}

      {full ? <CartFullNotice /> : null}

      <Card>
        <Heading level={3}>Áreas de entrega</Heading>

        {store.deliveryAreas.length === 0 ? (
          <Body muted>Esta loja ainda não configurou onde entrega.</Body>
        ) : (
          <View style={styles.areas}>
            {store.deliveryAreas.map((area) => (
              <View key={area.id} style={styles.area}>
                <Badge label={area.label} tone="accent" />
                <Body muted>
                  {area.neighborhoods.join(', ')} · {formatCents(area.deliveryFeeCents)} ·{' '}
                  {formatMinutes(area.estimatedMinutes)}
                </Body>
              </View>
            ))}
          </View>
        )}
      </Card>

      <Body muted>
        {offers.length === 1
          ? '1 oferta disponível'
          : `${String(offers.length)} ofertas disponíveis`}
      </Body>

      {offers.length === 0 ? (
        <Body muted>Esta loja não tem nenhum produto na prateleira no momento.</Body>
      ) : (
        <Table label={`Ofertas de ${store.name}`}>
          <TableHeader>
            <Cell width={5} header>
              Produto
            </Cell>
            <Cell width={2} header>
              Variante
            </Cell>
            <Cell width={2} header>
              Marca
            </Cell>
            <Cell width={2} header align="right">
              Preço
            </Cell>
            <Cell width={2} header align="right">
              Carrinho
            </Cell>
          </TableHeader>

          {offers.map((offer, index) => (
            <TableRow key={offer.offerId} zebra={index % 2 === 1}>
              <Cell width={5}>
                <View style={styles.productCell}>
                  <Link href={`/precos/${offer.product.slug}`} style={styles.productLink}>
                    {offer.product.name}
                  </Link>
                  {/* The row the person came for, marked in place too — the card
                      above can scroll out of view on a phone. */}
                  {wanted?.offerId === offer.offerId ? (
                    <Badge label="o que você procurava" tone="accent" />
                  ) : null}
                </View>
              </Cell>
              <Cell width={2}>{offer.product.variant}</Cell>
              <Cell width={2}>{offer.product.brand}</Cell>
              <Cell width={2} align="right">
                <Mono>{formatCents(offer.priceCents)}</Mono>
              </Cell>
              <Cell width={2} align="right">
                {/* Enabled even when the shop is shut: the cart can be built
                    now and ordered at opening — it is the order that is refused
                    out of hours, not the choosing (ADR-0014, C2). */}
                <Button
                  label="Adicionar"
                  compact
                  onPress={() => {
                    onAdd(offer);
                  }}
                />
              </Cell>
            </TableRow>
          ))}
        </Table>
      )}

      <CartBar currentStoreId={store.id} />
    </AppShell>
  );
}

function BackToComparator() {
  return (
    <Link href="/" style={styles.backLink}>
      ← Voltar ao comparador
    </Link>
  );
}

const styles = StyleSheet.create({
  backLink: { fontSize: 14, fontWeight: '600', color: Colors.accent, alignSelf: 'flex-start' },
  areas: { gap: Spacing.md, marginTop: Spacing.sm },
  area: { gap: Spacing.xs },
  productLink: { fontSize: 14, fontWeight: '600', color: Colors.accent },
  productCell: { gap: Spacing.xs, alignItems: 'flex-start' },
  openingRow: { gap: Spacing.sm, alignItems: 'flex-start' },
  wantedCard: { borderColor: Colors.accent, gap: Spacing.sm },
  wantedRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flexWrap: 'wrap' },
  wantedPrice: { fontSize: 20, fontWeight: '700' },
});
