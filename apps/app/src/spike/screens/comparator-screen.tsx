import { Link, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { useCart } from '../cart/cart-context';
import { NEIGHBORHOODS } from '../fixtures/catalog';
import { compareProduct, searchOffers } from '../fixtures/data-source';
import type { ComparedOffer } from '../fixtures/types';
import { AppShell } from '../ui/app-shell';
import {
  Badge,
  Body,
  Button,
  Card,
  Cell,
  Field,
  Heading,
  Mono,
  Table,
  TableHeader,
  TableRow,
} from '../ui/primitives';
import { Colors, DesktopMinWidth, Spacing, formatCents, formatMinutes } from '../ui/theme';

/** Column weights, shared by the header and every row so they stay aligned. */
const COLUMNS = {
  product: 32,
  variant: 9,
  store: 20,
  price: 12,
  delivery: 11,
  eta: 9,
  landed: 13,
  action: 10,
} as const;

export function ComparatorScreen() {
  const { width } = useWindowDimensions();
  const desktop = width >= DesktopMinWidth;
  const router = useRouter();
  const { add } = useCart();

  const [term, setTerm] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [rows, setRows] = useState<ComparedOffer[] | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [sideBySide, setSideBySide] = useState<ComparedOffer[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Every request is stamped so a slow answer cannot overwrite a newer one —
  // with simulated latency between 150 ms and 600 ms this actually happens.
  const requestId = useRef(0);

  useEffect(() => {
    const id = (requestId.current += 1);
    setRows(null);

    const timer = setTimeout(() => {
      void searchOffers({ term, postalCode, neighborhood }).then((result) => {
        if (requestId.current === id) setRows(result);
      });
    }, 220);

    return () => clearTimeout(timer);
  }, [term, postalCode, neighborhood]);

  useEffect(() => {
    if (!selectedProductId) {
      setSideBySide(null);
      return;
    }
    let active = true;
    setSideBySide(null);
    void compareProduct(selectedProductId, { postalCode, neighborhood }).then((result) => {
      if (active) setSideBySide(result);
    });
    return () => {
      active = false;
    };
  }, [selectedProductId, postalCode, neighborhood]);

  const onAdd = useCallback(
    (row: ComparedOffer) => {
      const outcome = add(row);
      setNotice(
        outcome === 'store-conflict'
          ? `O carrinho já tem itens de outra loja. Um pedido pertence a uma loja só — finalize ou esvazie o carrinho antes de adicionar de ${row.store.name}.`
          : `${row.product.name} (${row.product.variant}) adicionado — ${row.store.name}.`,
      );
    },
    [add],
  );

  const cheapestByProduct = useMemo(() => {
    const best = new Map<string, number>();
    for (const row of rows ?? []) {
      const current = best.get(row.product.id);
      if (current === undefined || row.landedCents < current) {
        best.set(row.product.id, row.landedCents);
      }
    }
    return best;
  }, [rows]);

  const selected = sideBySide;

  return (
    <AppShell
      title="Comparador de preços do bairro"
      subtitle="Ofertas das lojas que entregam no seu endereço, da mais barata para a mais cara — preço do item mais a taxa de entrega."
    >
      <Card>
        <View style={desktop ? styles.filtersDesktop : styles.filters}>
          <Field
            label="Produto ou marca"
            value={term}
            onChangeText={setTerm}
            placeholder="ração, areia, antipulgas, Golden…"
            style={desktop ? styles.filterWide : undefined}
          />
          <Field
            label="CEP"
            value={postalCode}
            onChangeText={setPostalCode}
            placeholder="20710-000"
            hint="Só as lojas que entregam nesse CEP aparecem."
            style={desktop ? styles.filterNarrow : undefined}
          />
          <Field
            label="Bairro"
            value={neighborhood}
            onChangeText={setNeighborhood}
            placeholder="Engenho Novo"
            hint={`${NEIGHBORHOODS.length} bairros atendidos no piloto.`}
            style={desktop ? styles.filterNarrow : undefined}
          />
        </View>
        <View style={styles.chipRow}>
          {NEIGHBORHOODS.slice(0, 8).map((name) => (
            <Button
              key={name}
              label={name}
              compact
              onPress={() => setNeighborhood(neighborhood === name ? '' : name)}
            />
          ))}
        </View>
      </Card>

      {notice ? (
        <Card style={styles.notice}>
          <Body>{notice}</Body>
        </Card>
      ) : null}

      <View style={desktop ? styles.splitDesktop : styles.split}>
        <View style={styles.listColumn}>
          <View style={styles.listHeader}>
            <Heading level={3}>
              {rows === null ? 'Buscando ofertas…' : `${rows.length} ofertas encontradas`}
            </Heading>
            {rows !== null && rows.length > 0 ? (
              <Body muted>Clique numa linha para comparar o mesmo produto entre as lojas.</Body>
            ) : null}
          </View>

          {rows === null ? (
            <SkeletonRows />
          ) : rows.length === 0 ? (
            <Card>
              <Body>
                Nenhuma oferta para esses filtros. Tente outro termo, ou limpe o CEP e o bairro para
                ver todas as lojas do piloto.
              </Body>
            </Card>
          ) : (
            <Table label="Ofertas das lojas que entregam no endereço, da mais barata para a mais cara">
              <TableHeader>
                <Cell width={COLUMNS.product} header>
                  Produto
                </Cell>
                <Cell width={COLUMNS.variant} header>
                  Variante
                </Cell>
                <Cell width={COLUMNS.store} header>
                  Loja
                </Cell>
                <Cell width={COLUMNS.price} header align="right">
                  Preço
                </Cell>
                <Cell width={COLUMNS.delivery} header align="right">
                  Entrega
                </Cell>
                <Cell width={COLUMNS.eta} header align="right">
                  Prazo
                </Cell>
                <Cell width={COLUMNS.landed} header align="right">
                  Total
                </Cell>
                <Cell width={COLUMNS.action} header>
                  Ação
                </Cell>
              </TableHeader>

              {rows.map((row, index) => (
                <OfferRow
                  key={row.offer.id}
                  row={row}
                  zebra={index % 2 === 1}
                  best={cheapestByProduct.get(row.product.id) === row.landedCents}
                  onSelect={() => setSelectedProductId(row.product.id)}
                  onAdd={() => onAdd(row)}
                />
              ))}
            </Table>
          )}
        </View>

        {desktop ? (
          <View style={styles.asideColumn}>
            <SideBySide
              rows={selected}
              hasSelection={selectedProductId !== null}
              onAdd={onAdd}
              onCheckout={() => router.push('/checkout')}
            />
          </View>
        ) : selectedProductId ? (
          <SideBySide
            rows={selected}
            hasSelection
            onAdd={onAdd}
            onCheckout={() => router.push('/checkout')}
          />
        ) : null}
      </View>
    </AppShell>
  );
}

function OfferRow({
  row,
  zebra,
  best,
  onSelect,
  onAdd,
}: {
  row: ComparedOffer;
  zebra: boolean;
  best: boolean;
  onSelect: () => void;
  onAdd: () => void;
}) {
  return (
    <TableRow
      zebra={zebra}
      onPress={onSelect}
      label={`${row.product.name}, ${row.product.variant}, ${row.store.name}, total ${formatCents(row.landedCents)}`}
    >
      <Cell width={COLUMNS.product}>
        <View style={styles.productCell}>
          <Body numberOfLines={2}>{row.product.name}</Body>
          <View style={styles.productMeta}>
            <Body muted style={styles.metaText}>
              {row.product.brand}
            </Body>
            {best ? <Badge label="menor preço" tone="positive" /> : null}
          </View>
        </View>
      </Cell>
      <Cell width={COLUMNS.variant}>{row.product.variant}</Cell>
      <Cell width={COLUMNS.store}>
        <View>
          {/* A real <a href> on the web: right-click → open in new tab (B6). */}
          <Link href={`/loja/${row.store.id}`} style={styles.storeLink}>
            {row.store.name}
          </Link>
          <Body muted style={styles.metaText}>
            {row.store.neighborhood}
          </Body>
        </View>
      </Cell>
      <Cell width={COLUMNS.price} align="right">
        <Mono>{formatCents(row.offer.priceCents)}</Mono>
      </Cell>
      <Cell width={COLUMNS.delivery} align="right">
        <Mono>{formatCents(row.deliveryFeeCents)}</Mono>
      </Cell>
      <Cell width={COLUMNS.eta} align="right">
        <Body muted style={styles.metaText}>
          {formatMinutes(row.estimatedMinutes)}
        </Body>
      </Cell>
      <Cell width={COLUMNS.landed} align="right">
        <Mono style={styles.landed}>{formatCents(row.landedCents)}</Mono>
      </Cell>
      <Cell width={COLUMNS.action}>
        <Button label="Adicionar" compact tone="primary" onPress={onAdd} />
      </Cell>
    </TableRow>
  );
}

function SideBySide({
  rows,
  hasSelection,
  onAdd,
  onCheckout,
}: {
  rows: ComparedOffer[] | null;
  hasSelection: boolean;
  onAdd: (row: ComparedOffer) => void;
  onCheckout: () => void;
}) {
  if (!hasSelection) {
    return (
      <Card>
        <Heading level={3}>Comparação lado a lado</Heading>
        <Body muted>
          Selecione uma oferta na lista para ver o mesmo produto em todas as lojas que entregam no
          endereço informado.
        </Body>
      </Card>
    );
  }

  if (rows === null) {
    return (
      <Card>
        <Heading level={3}>Comparação lado a lado</Heading>
        <Body muted>Carregando as lojas…</Body>
      </Card>
    );
  }

  const first = rows[0];
  if (!first) {
    return (
      <Card>
        <Heading level={3}>Comparação lado a lado</Heading>
        <Body muted>Nenhuma outra loja entrega esse produto no endereço informado.</Body>
      </Card>
    );
  }

  const cheapest = first.landedCents;

  return (
    <Card>
      <Heading level={3}>{first.product.name}</Heading>
      <Body muted>
        {first.product.brand} · {first.product.variant} · {rows.length}{' '}
        {rows.length === 1 ? 'loja entrega' : 'lojas entregam'} aqui
      </Body>

      <View style={styles.compareList}>
        {rows.map((row) => {
          const delta = row.landedCents - cheapest;
          return (
            <View key={row.offer.id} style={styles.compareItem}>
              <View style={styles.compareHead}>
                <Link href={`/loja/${row.store.id}`} style={styles.storeLink}>
                  {row.store.name}
                </Link>
                {delta === 0 ? (
                  <Badge label="menor preço" tone="positive" />
                ) : (
                  <Badge label={`+ ${formatCents(delta)}`} tone="neutral" />
                )}
              </View>
              <View style={styles.compareNumbers}>
                <Body muted style={styles.metaText}>
                  item {formatCents(row.offer.priceCents)} · entrega{' '}
                  {formatCents(row.deliveryFeeCents)} · {formatMinutes(row.estimatedMinutes)}
                </Body>
                <Mono style={styles.landed}>{formatCents(row.landedCents)}</Mono>
              </View>
              <Button label="Adicionar ao carrinho" compact onPress={() => onAdd(row)} />
            </View>
          );
        })}
      </View>

      <Button label="Ir para o checkout" tone="primary" onPress={onCheckout} />
    </Card>
  );
}

/** Loading state with the shape of the content, not a spinner over a blank page. */
function SkeletonRows() {
  return (
    <Table label="Carregando ofertas">
      {Array.from({ length: 10 }, (_, index) => (
        <TableRow key={index} zebra={index % 2 === 1}>
          <Cell width={COLUMNS.product}>
            <View style={[styles.skeleton, styles.skeletonWide]} />
          </Cell>
          <Cell width={COLUMNS.variant}>
            <View style={styles.skeleton} />
          </Cell>
          <Cell width={COLUMNS.store}>
            <View style={styles.skeleton} />
          </Cell>
          <Cell width={COLUMNS.price}>
            <View style={styles.skeleton} />
          </Cell>
          <Cell width={COLUMNS.delivery}>
            <View style={styles.skeleton} />
          </Cell>
          <Cell width={COLUMNS.eta}>
            <View style={styles.skeleton} />
          </Cell>
          <Cell width={COLUMNS.landed}>
            <View style={styles.skeleton} />
          </Cell>
          <Cell width={COLUMNS.action}>
            <View style={styles.skeleton} />
          </Cell>
        </TableRow>
      ))}
    </Table>
  );
}

const styles = StyleSheet.create({
  filters: { gap: Spacing.md },
  filtersDesktop: { flexDirection: 'row', gap: Spacing.lg, alignItems: 'flex-start' },
  filterWide: { flexGrow: 3, flexBasis: 320 },
  filterNarrow: { flexGrow: 1, flexBasis: 180 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.md },
  notice: { backgroundColor: Colors.accentSoft, borderColor: Colors.accent },
  split: { gap: Spacing.lg },
  splitDesktop: { flexDirection: 'row', gap: Spacing.lg, alignItems: 'flex-start' },
  listColumn: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0, gap: Spacing.sm },
  asideColumn: { flexGrow: 0, flexShrink: 0, flexBasis: 380 },
  listHeader: { gap: 2 },
  productCell: { gap: 2 },
  productMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  metaText: { fontSize: 12 },
  storeLink: { fontSize: 14, fontWeight: '600', color: Colors.accent },
  landed: { fontWeight: '700' },
  compareList: { gap: Spacing.md, marginTop: Spacing.md, marginBottom: Spacing.md },
  compareItem: {
    gap: Spacing.xs,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  compareHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  compareNumbers: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  skeleton: { height: 12, borderRadius: 4, backgroundColor: Colors.surfaceAlt, width: '70%' },
  skeletonWide: { width: '90%' },
});
