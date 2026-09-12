import type { Store, StoreOffer } from '@petdots/contracts';
import { Link, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ApiError, ApiUnavailableError } from '../api/http';
import { listStoreOffers } from '../api/offers';
import { findStore } from '../api/stores';
import { useSession } from '../session/session-context';
import { AppShell } from '../ui/app-shell';
import {
  Badge,
  Body,
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
  const { storeId } = useLocalSearchParams<{ storeId: string }>();
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

  return (
    <AppShell title={store.name} subtitle={`${store.neighborhood} · vitrine da loja`}>
      <BackToComparator />

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
          </TableHeader>

          {offers.map((offer, index) => (
            <TableRow key={offer.offerId} zebra={index % 2 === 1}>
              <Cell width={5}>
                <Link href={`/precos/${offer.product.slug}`} style={styles.productLink}>
                  {offer.product.name}
                </Link>
              </Cell>
              <Cell width={2}>{offer.product.variant}</Cell>
              <Cell width={2}>{offer.product.brand}</Cell>
              <Cell width={2} align="right">
                <Mono>{formatCents(offer.priceCents)}</Mono>
              </Cell>
            </TableRow>
          ))}
        </Table>
      )}
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
});
