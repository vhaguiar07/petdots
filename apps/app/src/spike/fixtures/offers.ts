import { PRODUCTS, STORES } from './catalog';
import type { Offer, Product } from './types';

/**
 * Deterministic pseudo-random in [0, 1). The fixtures must be identical on
 * every reload, otherwise two runs of the same manual test script compare
 * different screens.
 */
function hashUnit(seed: string): number {
  let hash = 2_166_136_261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16_777_619);
  }
  return ((hash >>> 0) % 100_000) / 100_000;
}

/** Reference price in integer cents, from category and net weight. */
function basePriceCents(product: Product): number {
  const perKilo: Record<Product['category'], number> = {
    FOOD_PREMIUM: 2_450,
    FOOD_STANDARD: 1_180,
    TREAT: 9_800,
    HYGIENE: 1_050,
    HEALTH_OTC: 480_000,
    ACCESSORY: 32_000,
  };
  const kilos = product.netWeightGrams / 1000;
  const raw = Math.round((perKilo[product.category] ?? 1_500) * kilos);
  // Packaged goods do not scale linearly: the big bag is cheaper per kilo.
  const scaleDiscount = kilos > 10 ? 0.82 : kilos > 3 ? 0.91 : 1;
  return Math.max(690, Math.round((raw * scaleDiscount) / 10) * 10);
}

/**
 * One offer per (store, product) pair that the store carries. Around 12% of the
 * pairs are skipped and another slice is marked unavailable, because a
 * comparator where every store has everything is a comfortable fixture — and a
 * comfortable fixture hides exactly the density problem the gate looks for.
 */
function buildOffers(): Offer[] {
  const offers: Offer[] = [];
  for (const store of STORES) {
    for (const product of PRODUCTS) {
      const seed = `${store.id}:${product.id}`;
      if (hashUnit(`carry:${seed}`) < 0.12) continue;

      const spread = 0.86 + hashUnit(`price:${seed}`) * 0.32;
      const priceCents = Math.round((basePriceCents(product) * spread) / 10) * 10;

      offers.push({
        id: `off-${store.id}-${product.id}`,
        storeId: store.id,
        productId: product.id,
        priceCents,
        available: hashUnit(`stock:${seed}`) > 0.08,
      });
    }
  }
  return offers;
}

export const OFFERS: readonly Offer[] = buildOffers();
