import type { Product, StoreMembership, StoreOffer } from '@petdots/contracts';
import { Link, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { searchProducts } from '../api/catalog';
import { ApiError, ApiUnavailableError } from '../api/http';
import {
  createStoreOffer,
  listMyStoreMemberships,
  listStoreOffersForPanel,
  updateOfferAvailability,
  updateOfferPrice,
} from '../api/store-panel';
import { useSession } from '../session/session-context';
import { AppShell } from '../ui/app-shell';
import { Badge, Body, Button, Card, Field, Heading, Mono } from '../ui/primitives';
import { Colors, formatCents, Spacing } from '../ui/theme';

type Load =
  | { readonly kind: 'loading' }
  | { readonly kind: 'missing' }
  | { readonly kind: 'unavailable' }
  | { readonly kind: 'ready'; readonly offers: StoreOffer[] };

/** `"39,90"` and `"3990"` both mean the same thing to a shopkeeper in a hurry. */
function parseCents(typed: string): number | null {
  const digits = typed.replace(/[^\d,.]/g, '').replace(',', '.');

  if (!digits) {
    return null;
  }

  const value = Number(digits);

  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  return Math.round(value * 100);
}

/**
 * The shelf: what this shop sells, for how much, and whether it has it today.
 *
 * 🔴 This is the first screen in the project through which a **price** is
 * written by anybody other than the seed — the price the comparator ranks on.
 *
 * The two roles differ here, visibly: `OWNER` edits the price and adds products,
 * `OPERATOR` only toggles "tenho" / "não tenho". That split is ADR-0013 — stock
 * is what the counter knows, margin is a commercial decision — and the API
 * enforces it regardless of what this screen renders.
 *
 * The list comes from the **public** shelf route with `?unavailable=true`: a
 * price is public, and an unavailable offer is only the shop saying "não tenho".
 */
export function StoreShelfScreen() {
  const { http } = useSession();
  const { storeId } = useLocalSearchParams<{ storeId: string }>();
  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [membership, setMembership] = useState<StoreMembership | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prices, setPrices] = useState<Record<string, string>>({});

  const [query, setQuery] = useState('');
  const [found, setFound] = useState<Product[]>([]);
  const [newPrice, setNewPrice] = useState<Record<string, string>>({});

  const refresh = useCallback(
    (signal?: AbortSignal) =>
      listStoreOffersForPanel(http, storeId, signal)
        .then((offers) => {
          setLoad({ kind: 'ready', offers });
          // The typed prices are reseeded from what came back, so a failed save
          // never leaves the field showing a number the shelf does not have.
          setPrices(
            Object.fromEntries(
              offers.map((offer) => [offer.offerId, (offer.priceCents / 100).toFixed(2)]),
            ),
          );
        })
        .catch((failure: unknown) => {
          if (signal?.aborted) {
            return;
          }

          setLoad(
            failure instanceof ApiUnavailableError ? { kind: 'unavailable' } : { kind: 'missing' },
          );
        }),
    [http, storeId],
  );

  useEffect(() => {
    const controller = new AbortController();

    void refresh(controller.signal);

    void listMyStoreMemberships(http, controller.signal)
      .then((memberships) => {
        setMembership(memberships.find((entry) => entry.store.id === storeId) ?? null);
      })
      .catch(() => {
        // The shelf below reports the real failure.
      });

    return () => {
      controller.abort();
    };
  }, [http, storeId, refresh]);

  const act = (key: string, action: () => Promise<unknown>) => {
    setBusy(key);
    setError(null);

    void action()
      .then(() => refresh())
      .catch((failure: unknown) => {
        setError(
          failure instanceof ApiError
            ? failure.message
            : 'Não conseguimos falar com o servidor. Tente de novo.',
        );
      })
      .finally(() => {
        setBusy(null);
      });
  };

  const onSearch = () => {
    void searchProducts(http, { q: query })
      .then((page) => {
        setFound(page.items);
      })
      .catch(() => {
        setFound([]);
      });
  };

  const backToQueue = (
    <Link href={`/painel/${storeId}`} style={styles.link}>
      ← Voltar à fila
    </Link>
  );

  if (load.kind === 'loading') {
    return (
      <AppShell title="Prateleira">
        <Body muted>Carregando a prateleira…</Body>
      </AppShell>
    );
  }

  if (load.kind === 'unavailable' || load.kind === 'missing') {
    return (
      <AppShell title="Prateleira">
        <Body muted>Não conseguimos carregar a prateleira agora. Tente de novo em instantes.</Body>
        {backToQueue}
      </AppShell>
    );
  }

  const isOwner = membership?.role === 'OWNER';
  const onShelf = new Set(load.offers.map((offer) => offer.product.id));

  return (
    <AppShell title="Prateleira" subtitle={membership?.store.name ?? undefined}>
      {backToQueue}

      {error ? <Body style={styles.error}>{error}</Body> : null}

      {isOwner ? (
        <Card>
          <Heading level={3}>Adicionar à prateleira</Heading>
          <Body muted>Procure no catálogo o que você vende e diga por quanto.</Body>

          <View style={styles.searchRow}>
            <Field
              label="Produto"
              value={query}
              onChangeText={setQuery}
              placeholder="Ex.: golden 15"
              onSubmitEditing={onSearch}
              returnKeyType="search"
              style={styles.grow}
            />
            <Button label="Procurar" onPress={onSearch} />
          </View>

          {found
            .filter((product) => !onShelf.has(product.id))
            .slice(0, 8)
            .map((product) => (
              <View key={product.id} style={styles.line}>
                <View style={styles.lineInfo}>
                  <Body>{product.name}</Body>
                  <Body muted>
                    {product.brand} · {product.variant}
                  </Body>
                </View>
                <View style={styles.lineRight}>
                  <Field
                    label="Preço"
                    value={newPrice[product.id] ?? ''}
                    onChangeText={(value) => {
                      setNewPrice((current) => ({ ...current, [product.id]: value }));
                    }}
                    placeholder="39,90"
                    inputMode="decimal"
                    style={styles.price}
                  />
                  <Button
                    label={busy === product.id ? 'Adicionando…' : 'Adicionar'}
                    compact
                    disabled={busy !== null || parseCents(newPrice[product.id] ?? '') === null}
                    onPress={() => {
                      const priceCents = parseCents(newPrice[product.id] ?? '');

                      if (priceCents === null) {
                        return;
                      }

                      act(product.id, () =>
                        createStoreOffer(http, storeId, {
                          productId: product.id,
                          priceCents,
                          available: true,
                        }),
                      );
                    }}
                  />
                </View>
              </View>
            ))}
        </Card>
      ) : null}

      <Card>
        <Heading level={3}>O que você vende ({String(load.offers.length)})</Heading>

        {load.offers.length === 0 ? (
          <Body muted>Sua prateleira está vazia.</Body>
        ) : (
          load.offers.map((offer) => (
            <View key={offer.offerId} style={styles.line}>
              <View style={styles.lineInfo}>
                <Body>{offer.product.name}</Body>
                <Body muted>
                  {offer.product.brand} · {offer.product.variant}
                </Body>
                {offer.available ? null : <Badge label="Não tenho" tone="danger" />}
              </View>

              <View style={styles.lineRight}>
                {isOwner ? (
                  <>
                    <Field
                      label="Preço"
                      value={prices[offer.offerId] ?? ''}
                      onChangeText={(value) => {
                        setPrices((current) => ({ ...current, [offer.offerId]: value }));
                      }}
                      inputMode="decimal"
                      style={styles.price}
                    />
                    <Button
                      label={busy === offer.offerId ? 'Salvando…' : 'Salvar preço'}
                      compact
                      disabled={busy !== null || parseCents(prices[offer.offerId] ?? '') === null}
                      onPress={() => {
                        const priceCents = parseCents(prices[offer.offerId] ?? '');

                        if (priceCents === null) {
                          return;
                        }

                        act(offer.offerId, () =>
                          updateOfferPrice(http, storeId, offer.offerId, priceCents),
                        );
                      }}
                    />
                  </>
                ) : (
                  // The operator sees the price and cannot change it: hiding it
                  // would make the shelf unreadable to the person using it most.
                  <Mono>{formatCents(offer.priceCents)}</Mono>
                )}

                <Button
                  label={offer.available ? 'Marcar "não tenho"' : 'Marcar "tenho"'}
                  compact
                  disabled={busy !== null}
                  onPress={() => {
                    act(offer.offerId, () =>
                      updateOfferAvailability(http, storeId, offer.offerId, !offer.available),
                    );
                  }}
                />
              </View>
            </View>
          ))
        )}
      </Card>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  link: { fontSize: 14, fontWeight: '600', color: Colors.accent, alignSelf: 'flex-start' },
  searchRow: { flexDirection: 'row', gap: Spacing.md, flexWrap: 'wrap', alignItems: 'flex-end' },
  grow: { flexGrow: 1, minWidth: 200 },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
    flexWrap: 'wrap',
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  lineInfo: { gap: 2, flexShrink: 1, minWidth: 180 },
  lineRight: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm, flexWrap: 'wrap' },
  price: { minWidth: 110 },
  error: { color: Colors.danger },
});
