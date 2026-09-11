import { PRODUCTS, STORES } from './catalog';
import { OFFERS } from './offers';
import { ORDERS } from './orders';
import type { ComparedOffer, DeliveryArea, Offer, Order, Product, Store } from './types';

/**
 * Every fixture is served through an async function with simulated latency,
 * never imported synchronously (ADR-0008, D5). Loading states, skeletons and
 * the Pix wait are where a React Native Web screen gives itself away on
 * desktop — a synchronous fixture would hide exactly what the gate measures.
 */
const MIN_LATENCY_MS = 150;
const MAX_LATENCY_MS = 600;

function latency(): Promise<void> {
  const ms = MIN_LATENCY_MS + Math.random() * (MAX_LATENCY_MS - MIN_LATENCY_MS);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const PRODUCT_BY_ID = new Map(PRODUCTS.map((product) => [product.id, product]));
const STORE_BY_ID = new Map(STORES.map((store) => [store.id, store]));

export function normalizePostalCode(input: string): string {
  return input.replace(/\D/g, '').slice(0, 8);
}

/** The delivery area of a store that covers an address, or null. */
export function areaCovering(
  store: Store,
  postalCode: string,
  neighborhood: string,
): DeliveryArea | null {
  const digits = normalizePostalCode(postalCode);
  const wanted = neighborhood.trim().toLocaleLowerCase('pt-BR');

  for (const area of store.deliveryAreas) {
    if (!area.active) continue;

    const byNeighborhood =
      wanted.length > 0 &&
      area.neighborhoods.some((name) => name.toLocaleLowerCase('pt-BR') === wanted);

    const byPostalCode =
      digits.length === 8 &&
      area.postalCodeRanges.some((range) => digits >= range.from && digits <= range.to);

    if (byNeighborhood || byPostalCode) return area;
  }
  return null;
}

function compare(offer: Offer, product: Product, store: Store, area: DeliveryArea): ComparedOffer {
  return {
    offer,
    product,
    store,
    deliveryFeeCents: area.deliveryFeeCents,
    estimatedMinutes: area.estimatedMinutes,
    landedCents: offer.priceCents + area.deliveryFeeCents,
  };
}

export type ComparatorQuery = {
  readonly term: string;
  readonly postalCode: string;
  readonly neighborhood: string;
};

/**
 * J2 — the comparator. Returns every available offer whose store delivers to
 * the given address, cheapest landed price first. With no address, nothing is
 * filtered out: the tutor still gets to browse.
 */
export async function searchOffers(query: ComparatorQuery): Promise<ComparedOffer[]> {
  await latency();

  const term = query.term.trim().toLocaleLowerCase('pt-BR');
  const hasAddress =
    normalizePostalCode(query.postalCode).length === 8 || query.neighborhood.trim().length > 0;

  const rows: ComparedOffer[] = [];
  for (const offer of OFFERS) {
    if (!offer.available) continue;

    const product = PRODUCT_BY_ID.get(offer.productId);
    const store = STORE_BY_ID.get(offer.storeId);
    if (!product || !store) continue;

    if (term.length > 0) {
      const haystack = `${product.name} ${product.brand} ${product.variant}`.toLocaleLowerCase(
        'pt-BR',
      );
      if (!haystack.includes(term)) continue;
    }

    const area = hasAddress
      ? areaCovering(store, query.postalCode, query.neighborhood)
      : (store.deliveryAreas[0] ?? null);
    if (!area) continue;

    rows.push(compare(offer, product, store, area));
  }

  return rows.sort(
    (a, b) =>
      a.landedCents - b.landedCents || a.product.name.localeCompare(b.product.name, 'pt-BR'),
  );
}

/** The same product across every store that delivers there — the side-by-side. */
export async function compareProduct(
  productId: string,
  query: Pick<ComparatorQuery, 'postalCode' | 'neighborhood'>,
): Promise<ComparedOffer[]> {
  await latency();

  const product = PRODUCT_BY_ID.get(productId);
  if (!product) return [];

  const hasAddress =
    normalizePostalCode(query.postalCode).length === 8 || query.neighborhood.trim().length > 0;

  const rows: ComparedOffer[] = [];
  for (const offer of OFFERS) {
    if (offer.productId !== productId || !offer.available) continue;

    const store = STORE_BY_ID.get(offer.storeId);
    if (!store) continue;

    const area = hasAddress
      ? areaCovering(store, query.postalCode, query.neighborhood)
      : (store.deliveryAreas[0] ?? null);
    if (!area) continue;

    rows.push(compare(offer, product, store, area));
  }

  return rows.sort((a, b) => a.landedCents - b.landedCents);
}

export async function getStore(storeId: string): Promise<Store | null> {
  await latency();
  return STORE_BY_ID.get(storeId) ?? null;
}

export async function listStoreOffers(storeId: string): Promise<ComparedOffer[]> {
  await latency();

  const store = STORE_BY_ID.get(storeId);
  const area = store?.deliveryAreas[0];
  if (!store || !area) return [];

  return OFFERS.filter((offer) => offer.storeId === storeId && offer.available)
    .flatMap((offer) => {
      const product = PRODUCT_BY_ID.get(offer.productId);
      return product ? [compare(offer, product, store, area)] : [];
    })
    .sort((a, b) => a.product.name.localeCompare(b.product.name, 'pt-BR'));
}

export async function getOffer(offerId: string): Promise<ComparedOffer | null> {
  await latency();

  const offer = OFFERS.find((candidate) => candidate.id === offerId);
  if (!offer) return null;

  const product = PRODUCT_BY_ID.get(offer.productId);
  const store = STORE_BY_ID.get(offer.storeId);
  const area = store?.deliveryAreas[0];
  if (!product || !store || !area) return null;

  return compare(offer, product, store, area);
}

/** J4 — the shopkeeper queue. */
export async function listOrders(): Promise<Order[]> {
  await latency();
  return [...ORDERS];
}

export function getProduct(productId: string): Product | undefined {
  return PRODUCT_BY_ID.get(productId);
}

export { PRODUCTS, STORES } from './catalog';
export { OFFERS } from './offers';
