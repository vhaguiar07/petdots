import { applyBasisPoints } from '@petdots/domain';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { useCart } from '../cart/cart-context';
import { areaCovering, getOffer, getStore, normalizePostalCode } from '../fixtures/data-source';
import type { ComparedOffer, DeliveryArea, Store } from '../fixtures/types';
import { AppShell } from '../ui/app-shell';
import { Badge, Body, Button, Card, Field, Heading, Mono } from '../ui/primitives';
import { Colors, DesktopMinWidth, Spacing, formatCents, formatMinutes } from '../ui/theme';

/** Platform service fee, in basis points over the items total. */
const SERVICE_FEE_BPS = 200;

type PaymentMethod = 'PIX' | 'ON_DELIVERY';

type PixState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'waiting'; readonly secondsLeft: number }
  | { readonly kind: 'paid'; readonly code: string };

export function CheckoutScreen() {
  const { width } = useWindowDimensions();
  const desktop = width >= DesktopMinWidth;
  const router = useRouter();
  const { cart, setQuantity, remove, clear } = useCart();

  const [store, setStore] = useState<Store | null>(null);
  const [lines, setLines] = useState<{ row: ComparedOffer; quantity: number }[] | null>(null);

  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [addressTouched, setAddressTouched] = useState(false);

  const [method, setMethod] = useState<PaymentMethod>('PIX');
  const [pix, setPix] = useState<PixState>({ kind: 'idle' });

  useEffect(() => {
    if (!cart.storeId || cart.lines.length === 0) {
      setStore(null);
      setLines([]);
      return;
    }

    let active = true;
    setLines(null);

    void (async () => {
      const [loadedStore, rows] = await Promise.all([
        getStore(cart.storeId as string),
        Promise.all(cart.lines.map((line) => getOffer(line.offerId))),
      ]);
      if (!active) return;

      setStore(loadedStore);
      setLines(
        rows.flatMap((row, index) => {
          const line = cart.lines[index];
          return row && line ? [{ row, quantity: line.quantity }] : [];
        }),
      );
    })();

    return () => {
      active = false;
    };
  }, [cart]);

  const coveringArea: DeliveryArea | null = useMemo(() => {
    if (!store) return null;
    return areaCovering(store, postalCode, neighborhood);
  }, [store, postalCode, neighborhood]);

  const addressFilled =
    street.trim().length > 0 &&
    number.trim().length > 0 &&
    (neighborhood.trim().length > 0 || normalizePostalCode(postalCode).length === 8);

  const addressError =
    addressTouched && addressFilled && !coveringArea
      ? `${store?.name ?? 'A loja'} não entrega nesse endereço. As áreas ativas são: ${
          store?.deliveryAreas.map((area) => area.neighborhoods.join(', ')).join(' · ') ?? '—'
        }.`
      : undefined;

  const itemsTotalCents = (lines ?? []).reduce(
    (sum, line) => sum + line.row.offer.priceCents * line.quantity,
    0,
  );
  const deliveryFeeCents = coveringArea?.deliveryFeeCents ?? 0;
  const serviceFeeCents = applyBasisPoints(itemsTotalCents, SERVICE_FEE_BPS);
  const totalCents = itemsTotalCents + deliveryFeeCents + serviceFeeCents;

  const canPay = Boolean(coveringArea) && (lines?.length ?? 0) > 0 && pix.kind === 'idle';

  // The Pix wait is part of the test, not decoration: it is where a React
  // Native Web screen has to hold a live, changing state on desktop.
  useEffect(() => {
    if (pix.kind !== 'waiting') return;

    if (pix.secondsLeft <= 0) {
      setPix({ kind: 'paid', code: `PD-${Math.floor(4_000 + Math.random() * 900)}` });
      clear();
      return;
    }

    const timer = setTimeout(
      () => setPix({ kind: 'waiting', secondsLeft: pix.secondsLeft - 1 }),
      1_000,
    );
    return () => clearTimeout(timer);
  }, [pix, clear]);

  if (lines !== null && lines.length === 0 && pix.kind !== 'paid') {
    return (
      <AppShell title="Checkout" subtitle="Carrinho de uma loja só — é a invariante do pedido.">
        <Card>
          <Heading level={3}>Seu carrinho está vazio</Heading>
          <Body muted>
            Volte ao comparador, escolha uma oferta e clique em “Adicionar”. Um pedido pertence a
            uma única loja, então o carrinho aceita itens de uma loja por vez.
          </Body>
          <View style={styles.emptyAction}>
            <Button label="Ir para o comparador" tone="primary" onPress={() => router.push('/')} />
          </View>
        </Card>
      </AppShell>
    );
  }

  if (pix.kind === 'paid') {
    return (
      <AppShell title="Pedido pago" subtitle="O lojista já foi avisado.">
        <Card>
          <Badge label="Pagamento confirmado" tone="positive" />
          <Heading level={3}>Pedido {pix.code}</Heading>
          <Body>
            O pagamento foi confirmado e o pedido entrou na fila da loja. No produto real esta
            confirmação só vem pelo webhook do PSP, nunca pelo retorno do cliente.
          </Body>
          <View style={styles.emptyAction}>
            <Button
              label="Ver a fila do lojista"
              tone="primary"
              onPress={() => router.push('/painel')}
            />
            <Button label="Comprar de novo" onPress={() => router.push('/')} />
          </View>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Checkout"
      subtitle={store ? `Pedido em ${store.name} · ${store.neighborhood}` : 'Carregando a loja…'}
    >
      <View style={desktop ? styles.splitDesktop : styles.split}>
        <View style={styles.mainColumn}>
          <Card>
            <Heading level={3}>Itens</Heading>
            {lines === null ? (
              <Body muted>Carregando o carrinho…</Body>
            ) : (
              <View style={styles.lineList}>
                {lines.map((line) => (
                  <View key={line.row.offer.id} style={styles.line}>
                    <View style={styles.lineInfo}>
                      <Body>{line.row.product.name}</Body>
                      <Body muted style={styles.metaText}>
                        {line.row.product.brand} · {line.row.product.variant} ·{' '}
                        {formatCents(line.row.offer.priceCents)} cada
                      </Body>
                    </View>
                    <View style={styles.lineActions}>
                      <Button
                        label="−"
                        compact
                        onPress={() => setQuantity(line.row.offer.id, line.quantity - 1)}
                      />
                      <Mono>{String(line.quantity)}</Mono>
                      <Button
                        label="+"
                        compact
                        onPress={() => setQuantity(line.row.offer.id, line.quantity + 1)}
                      />
                      <Mono style={styles.lineTotal}>
                        {formatCents(line.row.offer.priceCents * line.quantity)}
                      </Mono>
                      <Button
                        label="Remover"
                        compact
                        tone="danger"
                        onPress={() => remove(line.row.offer.id)}
                      />
                    </View>
                  </View>
                ))}
              </View>
            )}
          </Card>

          <Card>
            <Heading level={3}>Endereço de entrega</Heading>
            <Body muted>
              O endereço é validado contra as áreas de entrega ativas da loja antes de o pedido
              existir.
            </Body>
            <View style={desktop ? styles.addressGridDesktop : styles.addressGrid}>
              <Field
                label="Rua"
                value={street}
                onChangeText={(next) => {
                  setStreet(next);
                  setAddressTouched(true);
                }}
                placeholder="Rua Vinte e Quatro de Maio"
                style={desktop ? styles.fieldWide : undefined}
              />
              <Field
                label="Número"
                value={number}
                onChangeText={(next) => {
                  setNumber(next);
                  setAddressTouched(true);
                }}
                placeholder="340"
                style={desktop ? styles.fieldNarrow : undefined}
              />
              <Field
                label="Bairro"
                value={neighborhood}
                onChangeText={(next) => {
                  setNeighborhood(next);
                  setAddressTouched(true);
                }}
                placeholder="Engenho Novo"
                style={desktop ? styles.fieldMedium : undefined}
              />
              <Field
                label="CEP"
                value={postalCode}
                onChangeText={(next) => {
                  setPostalCode(next);
                  setAddressTouched(true);
                }}
                placeholder="20710-000"
                error={addressError}
                style={desktop ? styles.fieldMedium : undefined}
              />
            </View>

            {coveringArea ? (
              <View style={styles.areaOk}>
                <Badge label="Entrega disponível" tone="positive" />
                <Body muted style={styles.metaText}>
                  Área “{coveringArea.label}” · {formatCents(coveringArea.deliveryFeeCents)} ·{' '}
                  {formatMinutes(coveringArea.estimatedMinutes)}
                </Body>
              </View>
            ) : null}
          </Card>

          <Card>
            <Heading level={3}>Pagamento</Heading>
            <View style={styles.methodRow}>
              <Button
                label="Pix"
                tone={method === 'PIX' ? 'primary' : 'neutral'}
                onPress={() => setMethod('PIX')}
              />
              <Button
                label="Na entrega"
                tone={method === 'ON_DELIVERY' ? 'primary' : 'neutral'}
                onPress={() => setMethod('ON_DELIVERY')}
              />
            </View>
            <Body muted>
              O Pix é o meio principal do piloto: custo menor, liquidação instantânea e sem
              chargeback.
            </Body>
          </Card>
        </View>

        <View style={desktop ? styles.asideColumn : undefined}>
          <Card>
            <Heading level={3}>Resumo</Heading>
            <SummaryLine label="Itens" cents={itemsTotalCents} />
            <SummaryLine
              label="Taxa de entrega"
              cents={deliveryFeeCents}
              muted={!coveringArea}
              hint={coveringArea ? undefined : 'informe um endereço atendido'}
            />
            <SummaryLine label="Taxa de serviço (2%)" cents={serviceFeeCents} />
            <View style={styles.totalLine}>
              <Heading level={3}>Total</Heading>
              <Mono style={styles.totalValue}>{formatCents(totalCents)}</Mono>
            </View>

            {pix.kind === 'waiting' ? (
              <PixWaiting secondsLeft={pix.secondsLeft} onCancel={() => setPix({ kind: 'idle' })} />
            ) : (
              <Button
                label={method === 'PIX' ? 'Pagar com Pix' : 'Confirmar pedido'}
                tone="primary"
                disabled={!canPay}
                onPress={() => setPix({ kind: 'waiting', secondsLeft: 8 })}
              />
            )}

            {!coveringArea && addressTouched ? (
              <Body muted style={styles.metaText}>
                O botão só libera quando o endereço estiver dentro de uma área de entrega ativa.
              </Body>
            ) : null}
          </Card>
        </View>
      </View>
    </AppShell>
  );
}

function SummaryLine({
  label,
  cents,
  muted,
  hint,
}: {
  label: string;
  cents: number;
  muted?: boolean;
  hint?: string;
}) {
  return (
    <View style={styles.summaryLine}>
      <Body muted={muted}>{hint ? `${label} — ${hint}` : label}</Body>
      <Mono>{formatCents(cents)}</Mono>
    </View>
  );
}

/** The QR is fake and the polling is simulated — the waiting state is not. */
function PixWaiting({ secondsLeft, onCancel }: { secondsLeft: number; onCancel: () => void }) {
  return (
    <View style={styles.pixBlock}>
      <Badge label="Aguardando o pagamento" tone="warning" />
      <View style={styles.qr}>
        {Array.from({ length: 64 }, (_, index) => (
          <View
            key={index}
            style={[styles.qrCell, (index * 7 + (index % 5)) % 3 === 0 && styles.qrCellOn]}
          />
        ))}
      </View>
      <Body muted style={styles.metaText}>
        Abra o app do banco, leia o QR e conclua. A confirmação chega sozinha — não feche a tela.
      </Body>
      <Mono>{`confirmando em ${secondsLeft}s`}</Mono>
      <Button label="Cancelar" compact onPress={onCancel} />
    </View>
  );
}

const styles = StyleSheet.create({
  split: { gap: Spacing.lg },
  splitDesktop: { flexDirection: 'row', gap: Spacing.lg, alignItems: 'flex-start' },
  mainColumn: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0, gap: Spacing.lg },
  asideColumn: { flexGrow: 0, flexShrink: 0, flexBasis: 360 },
  lineList: { gap: Spacing.md, marginTop: Spacing.md },
  line: {
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  lineInfo: { gap: 2 },
  lineActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  lineTotal: { fontWeight: '700', minWidth: 90, textAlign: 'right' },
  metaText: { fontSize: 12 },
  addressGrid: { gap: Spacing.md, marginTop: Spacing.md },
  addressGridDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  fieldWide: { flexGrow: 3, flexBasis: 280 },
  fieldMedium: { flexGrow: 2, flexBasis: 180 },
  fieldNarrow: { flexGrow: 1, flexBasis: 100 },
  areaOk: { marginTop: Spacing.md, gap: Spacing.xs },
  methodRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  summaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  totalLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  totalValue: { fontSize: 20, fontWeight: '700' },
  emptyAction: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md, flexWrap: 'wrap' },
  pixBlock: { gap: Spacing.sm, alignItems: 'flex-start' },
  qr: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 160,
    height: 160,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  qrCell: { width: 20, height: 20, backgroundColor: Colors.surface },
  qrCellOn: { backgroundColor: Colors.text },
});
