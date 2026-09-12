import type { ComparedOffer, DeliveryAreaWithStore, Product } from '@petdots/contracts';
import { isPostalCode } from '@petdots/domain';
import { Link, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { findProductBySlug } from '../api/catalog';
import { ApiUnavailableError } from '../api/http';
import { compareOffers } from '../api/offers';
import { distinctNeighborhoods, listDeliveryAreas } from '../api/stores';
import { useSession } from '../session/session-context';
import { AppShell } from '../ui/app-shell';
import {
  Badge,
  Body,
  Card,
  Cell,
  Field,
  Heading,
  Mono,
  Table,
  TableHeader,
  TableRow,
} from '../ui/primitives';
import { Colors, formatCents, formatMinutes, Radius, Spacing } from '../ui/theme';

type Load =
  | { readonly kind: 'loading' }
  | { readonly kind: 'missing' }
  | { readonly kind: 'unavailable' }
  | { readonly kind: 'ready'; readonly product: Product; readonly areas: DeliveryAreaWithStore[] };

type Offers =
  | { readonly kind: 'loading' }
  | { readonly kind: 'unavailable' }
  | { readonly kind: 'ready'; readonly items: ComparedOffer[] };

/**
 * The second screen of J2: who sells this, delivered, and for how much.
 *
 * It mirrors the landing's `/precos/{slug}` — same copy, same empty states,
 * same rule that an invalid CEP never becomes a request (ADR-0010, A24). What
 * differs is the shape: chips instead of a `<select>`, because a native picker
 * on a phone hides the options behind a modal.
 */
export function ProductCompareScreen() {
  const { http } = useSession();
  const { productSlug } = useLocalSearchParams<{ productSlug: string }>();

  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [neighborhood, setNeighborhood] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [offers, setOffers] = useState<Offers>({ kind: 'loading' });

  useEffect(() => {
    const controller = new AbortController();

    async function resolve(): Promise<void> {
      try {
        const product = await findProductBySlug(http, productSlug, controller.signal);

        if (!product) {
          setLoad({ kind: 'missing' });
          return;
        }

        const areas = await listDeliveryAreas(http, controller.signal);
        setLoad({ kind: 'ready', product, areas });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setLoad(
          error instanceof ApiUnavailableError ? { kind: 'unavailable' } : { kind: 'missing' },
        );
      }
    }

    void resolve();

    return () => {
      controller.abort();
    };
  }, [http, productSlug]);

  // An invalid CEP is a message, not a request: the same domain function the
  // API would refuse it with runs here first (ADR-0010, A24).
  const typedPostalCode = postalCode.trim();
  const postalCodeIsValid = typedPostalCode === '' || isPostalCode(typedPostalCode);
  const usablePostalCode = postalCodeIsValid ? typedPostalCode : '';
  const hasAddress = Boolean(neighborhood || usablePostalCode);

  const product = load.kind === 'ready' ? load.product : null;
  const productId = product?.id;
  const latest = useRef(0);

  useEffect(() => {
    if (!productId) {
      return;
    }

    const stamp = ++latest.current;
    const controller = new AbortController();

    setOffers({ kind: 'loading' });

    void compareOffers(
      http,
      productId,
      { neighborhood: neighborhood || undefined, postalCode: usablePostalCode || undefined },
      controller.signal,
    )
      .then((items) => {
        if (stamp === latest.current) {
          setOffers({ kind: 'ready', items });
        }
      })
      .catch((error: unknown) => {
        if (stamp === latest.current && error instanceof ApiUnavailableError) {
          setOffers({ kind: 'unavailable' });
        }
      });

    return () => {
      controller.abort();
    };
  }, [http, productId, neighborhood, usablePostalCode]);

  if (load.kind === 'loading') {
    return (
      <AppShell title="Carregando…">
        <Body muted>Buscando o produto.</Body>
      </AppShell>
    );
  }

  if (load.kind === 'unavailable') {
    return (
      <AppShell title="Produto">
        <Body muted>Não conseguimos carregar este produto agora. Tente de novo em instantes.</Body>
        <BackToSearch />
      </AppShell>
    );
  }

  if (load.kind === 'missing') {
    return (
      <AppShell title="Produto não encontrado">
        <Body muted>Esse produto não existe no catálogo do piloto.</Body>
        <BackToSearch />
      </AppShell>
    );
  }

  const where = neighborhood || (usablePostalCode ? `CEP ${usablePostalCode}` : '');
  const cheapestOfferId = offers.kind === 'ready' ? offers.items[0]?.offerId : undefined;

  return (
    <AppShell
      title={load.product.name}
      subtitle={`${load.product.brand} · ${load.product.variant}`}
    >
      <BackToSearch />

      <Card>
        <Heading level={3}>Onde você está</Heading>

        <View style={styles.chips}>
          {distinctNeighborhoods(load.areas).map((option) => {
            const selected = neighborhood === option;

            return (
              <Pressable
                key={option}
                role="button"
                aria-label={`Bairro ${option}`}
                aria-pressed={selected}
                onPress={() => {
                  // One address at a time: a neighbourhood and a CEP that
                  // disagree would make the answer unexplainable.
                  setNeighborhood(selected ? '' : option);
                  setPostalCode('');
                }}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <Body style={selected ? styles.chipLabelSelected : undefined}>{option}</Body>
              </Pressable>
            );
          })}
        </View>

        <Field
          label="ou seu CEP"
          value={postalCode}
          onChangeText={(next) => {
            setPostalCode(next);

            if (next.trim()) {
              setNeighborhood('');
            }
          }}
          placeholder="20720-000"
          inputMode="numeric"
          maxLength={9}
          error={postalCodeIsValid ? undefined : 'CEP deve ter 8 dígitos.'}
          style={styles.postalCode}
        />
      </Card>

      {offers.kind === 'loading' ? <Body muted>Consultando as lojas…</Body> : null}

      {offers.kind === 'unavailable' ? (
        <Body muted>Não conseguimos consultar os preços agora. Tente de novo em instantes.</Body>
      ) : null}

      {offers.kind === 'ready' && offers.items.length === 0 ? (
        <Card>
          <Heading level={3}>
            {hasAddress
              ? `Nenhuma loja entrega em ${where} ainda`
              : 'Nenhuma petshop do piloto tem este item no momento'}
          </Heading>
          <Body muted>Estamos abrindo bairro por bairro no Grande Méier.</Body>
        </Card>
      ) : null}

      {offers.kind === 'ready' && offers.items.length > 0 ? (
        <>
          <Table label={`Ofertas para ${load.product.name} ${load.product.variant}`}>
            <TableHeader>
              <Cell width={4} header>
                Loja
              </Cell>
              <Cell width={2} header>
                Bairro
              </Cell>
              <Cell width={2} header align="right">
                Preço
              </Cell>
              <Cell width={2} header align="right">
                Entrega
              </Cell>
              <Cell width={2} header align="right">
                Prazo
              </Cell>
              <Cell width={2} header align="right">
                Total
              </Cell>
            </TableHeader>

            {offers.items.map((offer, index) => (
              <TableRow key={offer.offerId} zebra={index % 2 === 1}>
                <Cell width={4}>
                  <View style={styles.storeCell}>
                    <Link href={`/loja/${offer.store.id}`} style={styles.storeLink}>
                      {offer.store.name}
                    </Link>
                    {/* Only with an address: without one the ranking is by item
                        price and "cheapest" would be a claim the page cannot
                        make about the total. */}
                    {hasAddress && offer.offerId === cheapestOfferId ? (
                      <Badge label="menor preço" tone="positive" />
                    ) : null}
                  </View>
                </Cell>
                <Cell width={2}>{offer.store.neighborhood}</Cell>
                <Cell width={2} align="right">
                  <Mono>{formatCents(offer.priceCents)}</Mono>
                </Cell>
                <Cell width={2} align="right">
                  {offer.deliveryArea ? (
                    <Mono>{formatCents(offer.deliveryArea.deliveryFeeCents)}</Mono>
                  ) : (
                    <Body muted style={styles.unknown}>
                      informe seu bairro
                    </Body>
                  )}
                </Cell>
                <Cell width={2} align="right">
                  {offer.deliveryArea ? (
                    <Body>{formatMinutes(offer.deliveryArea.estimatedMinutes)}</Body>
                  ) : (
                    <Body muted style={styles.unknown}>
                      informe seu bairro
                    </Body>
                  )}
                </Cell>
                <Cell width={2} align="right">
                  {offer.landedCents === null ? (
                    <Body muted style={styles.unknown}>
                      informe seu bairro
                    </Body>
                  ) : (
                    <Mono style={styles.total}>{formatCents(offer.landedCents)}</Mono>
                  )}
                </Cell>
              </TableRow>
            ))}
          </Table>

          {hasAddress ? null : (
            <Body muted>
              Preço do item; a taxa de entrega depende do endereço. Escolha o bairro acima para ver
              o total.
            </Body>
          )}
        </>
      ) : null}
    </AppShell>
  );
}

function BackToSearch() {
  return (
    <Link href="/" style={styles.backLink}>
      ← Voltar para a busca
    </Link>
  );
}

const styles = StyleSheet.create({
  backLink: { fontSize: 14, fontWeight: '600', color: Colors.accent, alignSelf: 'flex-start' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    backgroundColor: Colors.surface,
  },
  chipSelected: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  chipLabelSelected: { color: '#FFFFFF', fontWeight: '600' },
  postalCode: { marginTop: Spacing.md, maxWidth: 220 },
  storeCell: { gap: Spacing.xs },
  storeLink: { fontSize: 14, fontWeight: '600', color: Colors.accent },
  unknown: { fontSize: 12, fontStyle: 'italic' },
  total: { fontWeight: '700' },
});
