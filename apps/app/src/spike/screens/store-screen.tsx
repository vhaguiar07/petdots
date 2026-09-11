import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useCart } from '../cart/cart-context';
import { getStore, listStoreOffers } from '../fixtures/data-source';
import type { ComparedOffer, Store } from '../fixtures/types';
import { AppShell } from '../ui/app-shell';
import { Badge, Body, Button, Card, Cell, Heading, Mono, Table, TableHeader, TableRow } from '../ui/primitives';
import { Spacing, formatCents, formatMinutes } from '../ui/theme';

/**
 * The store front. It exists so a store name in the comparator is a real link
 * with its own URL — reload and open-in-new-tab need somewhere to land (B5, B6).
 */
export function StoreScreen({ storeId }: { storeId: string }) {
  const router = useRouter();
  const { add } = useCart();
  const [store, setStore] = useState<Store | null | 'loading'>('loading');
  const [rows, setRows] = useState<ComparedOffer[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setStore('loading');
    setRows(null);

    void Promise.all([getStore(storeId), listStoreOffers(storeId)]).then(
      ([loadedStore, loadedRows]) => {
        if (!active) return;
        setStore(loadedStore);
        setRows(loadedRows);
      },
    );

    return () => {
      active = false;
    };
  }, [storeId]);

  if (store === 'loading') {
    return (
      <AppShell title="Carregando a loja…">
        <Card>
          <Body muted>Buscando a vitrine.</Body>
        </Card>
      </AppShell>
    );
  }

  if (store === null) {
    return (
      <AppShell title="Loja não encontrada">
        <Card>
          <Body>Essa loja não existe no piloto do Grande Méier.</Body>
          <View style={styles.action}>
            <Button label="Voltar ao comparador" tone="primary" onPress={() => router.push('/')} />
          </View>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell title={store.name} subtitle={`${store.neighborhood} · vitrine da loja`}>
      <Card>
        <Heading level={3}>Áreas de entrega</Heading>
        <View style={styles.areaList}>
          {store.deliveryAreas.map((area) => (
            <View key={area.id} style={styles.area}>
              <Badge label={area.label} tone="accent" />
              <Body muted style={styles.metaText}>
                {area.neighborhoods.join(' · ')} — {formatCents(area.deliveryFeeCents)} ·{' '}
                {formatMinutes(area.estimatedMinutes)}
              </Body>
            </View>
          ))}
        </View>
      </Card>

      {notice ? (
        <Card>
          <Body>{notice}</Body>
        </Card>
      ) : null}

      <Heading level={3}>
        {rows === null ? 'Carregando ofertas…' : `${rows.length} ofertas disponíveis`}
      </Heading>

      {rows !== null ? (
        <Table label={`Ofertas disponíveis em ${store.name}`}>
          <TableHeader>
            <Cell width={40} header>
              Produto
            </Cell>
            <Cell width={12} header>
              Variante
            </Cell>
            <Cell width={14} header>
              Marca
            </Cell>
            <Cell width={14} header align="right">
              Preço
            </Cell>
            <Cell width={12} header>
              Ação
            </Cell>
          </TableHeader>
          {rows.map((row, index) => (
            <TableRow key={row.offer.id} zebra={index % 2 === 1}>
              <Cell width={40}>{row.product.name}</Cell>
              <Cell width={12}>{row.product.variant}</Cell>
              <Cell width={14}>{row.product.brand}</Cell>
              <Cell width={14} align="right">
                <Mono>{formatCents(row.offer.priceCents)}</Mono>
              </Cell>
              <Cell width={12}>
                <Button
                  label="Adicionar"
                  compact
                  tone="primary"
                  onPress={() => {
                    const outcome = add(row);
                    setNotice(
                      outcome === 'store-conflict'
                        ? 'O carrinho já tem itens de outra loja. Um pedido pertence a uma loja só.'
                        : `${row.product.name} adicionado ao carrinho.`,
                    );
                  }}
                />
              </Cell>
            </TableRow>
          ))}
        </Table>
      ) : null}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  areaList: { gap: Spacing.sm, marginTop: Spacing.sm },
  area: { gap: 2 },
  metaText: { fontSize: 12 },
  action: { marginTop: Spacing.md, alignItems: 'flex-start' },
});
