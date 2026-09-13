import type { ComparedOffer, DeliveryAreaWithStore, Product } from '@petdots/contracts';
import { isPostalCode } from '@petdots/domain';
import { Link, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { findProductBySlug } from '../api/catalog';
import { ApiUnavailableError } from '../api/http';
import { compareOffers } from '../api/offers';
import { distinctNeighborhoods, listDeliveryAreas } from '../api/stores';
import { findMyProfile } from '../api/tutors';
import { CartBar, CartFullNotice, StoreConflictCard, useAddToCart } from '../cart/add-to-cart';
import { isStoreOpen, reopeningLabel } from '../cart/order-labels';
import { useSession } from '../session/session-context';
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
  const { http, state } = useSession();
  const { addLine, pending, confirmSwitch, keepCurrent, full } = useAddToCart();
  const { productSlug } = useLocalSearchParams<{ productSlug: string }>();

  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [neighborhood, setNeighborhood] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [offers, setOffers] = useState<Offers>({ kind: 'loading' });

  /**
   * Whether the person has said where they are. Once they have, the pre-fill
   * must never overwrite it — including by clearing the field on purpose (B2).
   */
  const touched = useRef(false);

  const signedInTutor = state.kind === 'signedIn' && state.session.user.roles.includes('TUTOR');

  useEffect(() => {
    if (!signedInTutor) {
      return;
    }

    const controller = new AbortController();

    // 🔴 The payoff of having saved an address (ADR-0015, A10): someone who
    // just finished the onboarding opens a product and immediately sees who
    // delivers to their home and for how much — which is the value of first
    // use the pd-14 can deliver without inventing the consumption rule.
    //
    // The **CEP** and not the neighbourhood: a CEP is exact, while a
    // neighbourhood only works if it happens to match one of the chips
    // letter for letter.
    void findMyProfile(http, controller.signal)
      .then((profile) => {
        if (profile && !touched.current) {
          setPostalCode(profile.address.postalCode);
        }
      })
      .catch(() => {
        // No profile, or the call failed: the screen simply stays as it is.
        // This is a convenience, and it must never be the reason a public
        // comparator shows an error.
      });

    return () => {
      controller.abort();
    };
  }, [http, signedInTutor]);

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
                  touched.current = true;
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
            touched.current = true;
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
              <Cell width={2} header align="right">
                Carrinho
              </Cell>
            </TableHeader>

            {offers.items.map((offer, index) => (
              <TableRow key={offer.offerId} zebra={index % 2 === 1}>
                <Cell width={4}>
                  <View style={styles.storeCell}>
                    {/* 🔴 The product travels with the link. Without it the
                        shopfront is a shelf of dozens sorted by name, and the
                        person has to pick the variant again — with 3 kg and
                        15 kg of the same ração adjacent in that list (pd-15). */}
                    <Link
                      href={`/loja/${offer.store.id}?produto=${productSlug}`}
                      style={styles.storeLink}
                    >
                      {offer.store.name}
                    </Link>
                    {/* Only with an address: without one the ranking is by item
                        price and "cheapest" would be a claim the page cannot
                        make about the total. */}
                    {hasAddress && offer.offerId === cheapestOfferId ? (
                      <Badge label="menor preço" tone="positive" />
                    ) : null}
                    <ClosedNotice openingHours={offer.store.openingHours} />
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
                <Cell width={2} align="right">
                  {/* 🔴 The shortest path there is between "this one is cheapest"
                      and "it is in the cart". Adding from here also removes the
                      variant ambiguity by construction: it is the very offer
                      being compared, not one picked again from a shelf. */}
                  <Button
                    label="Adicionar"
                    compact
                    onPress={() => {
                      addLine(
                        { id: offer.store.id, name: offer.store.name },
                        {
                          offerId: offer.offerId,
                          productId: load.product.id,
                          productName: load.product.name,
                          productVariant: load.product.variant,
                          unitPriceCents: offer.priceCents,
                          quantity: 1,
                        },
                      );
                    }}
                  />
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

          {pending ? (
            <StoreConflictCard pending={pending} onConfirm={confirmSwitch} onKeep={keepCurrent} />
          ) : null}

          {full ? <CartFullNotice /> : null}

          <CartBar />
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

/**
 * "Fechada · abre segunda às 08:00" numa linha do comparador.
 *
 * 🔴 **Só aparece quando a loja está fechada.** A ausência é o estado normal, e
 * carimbar "Aberta" em todas as linhas transformaria o sinal útil — a exceção —
 * em ruído, numa tabela que já carrega o selo de "menor preço". É o padrão que
 * o tutor já viu em todo aplicativo de entrega.
 *
 * ⚠️ **A loja fechada continua listada, com preço, taxa e prazo** (ADR-0010,
 * A12): horário governa o **pedido**, nunca a vitrine, e quem quer comprar
 * amanhã precisa enxergar o preço de hoje. O que isto remove é a viagem perdida
 * — adicionar ao carrinho para descobrir no checkout que a loja está fechada.
 *
 * A ordenação **não** muda: segue por preço entregue (ADR-0010, A11). Rebaixar
 * loja fechada faria a resposta do comparador depender do minuto em que a
 * página foi aberta, e ela também é indexada por buscador. Decisão do Victor em
 * 13/09/2026, escolhendo "só o selo" entre as duas opções apresentadas.
 */
function ClosedNotice({ openingHours }: { openingHours: ComparedOffer['store']['openingHours'] }) {
  // Recalculado a cada render, contra o relógio de quem lê — nunca um booleano
  // que veio pronto do servidor e envelheceu no caminho.
  if (isStoreOpen(openingHours)) {
    return null;
  }

  const reopening = reopeningLabel(openingHours);

  return (
    <View style={styles.closedNotice}>
      <Badge label="Fechada" tone="neutral" />
      {reopening ? <Body muted>{reopening}</Body> : null}
    </View>
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
  closedNotice: { gap: 2, alignItems: 'flex-start' },
  storeLink: { fontSize: 14, fontWeight: '600', color: Colors.accent },
  unknown: { fontSize: 12, fontStyle: 'italic' },
  total: { fontWeight: '700' },
});
