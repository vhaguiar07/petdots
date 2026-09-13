// PLACEHOLDER — lojas fictícias do spike da pd-08. Substituir pelos dados de
// campo (Trilha B, item B4) ANTES de qualquer deploy público. Nenhum nome aqui
// corresponde a uma petshop real.

import type { OpeningInterval } from '@petdots/domain';

import { productSlugOf, storeSlugOf } from '../naming.js';
import type { SeedOffer, SeedProduct, SeedStore } from '../types.js';

/**
 * ⚠️ **The schedules below are placeholder too**, and for the same reason the
 * names are: nobody has been asked what time they open. They exist so the pilot
 * database can exercise the acceptance deadline — a clock that only runs while
 * the store is open (ADR-0014, C2) — and so the manual walkthrough has a store
 * that is shut at some point of the day and one that closes for lunch.
 *
 * `weekday` is 0 = Sunday. The seed is the only writer today; the `OWNER` gets
 * an editor with the pd-16 panel (ADR-0013, B4).
 */
const MONDAY_TO_SATURDAY: OpeningInterval[] = [1, 2, 3, 4, 5, 6].map((weekday) => ({
  weekday,
  opens: '08:00',
  closes: '19:00',
}));

/** The shop that shuts for lunch — the case the schedule format exists to allow. */
const WITH_LUNCH_BREAK: OpeningInterval[] = [1, 2, 3, 4, 5, 6].flatMap((weekday) => [
  { weekday, opens: '08:00', closes: '12:00' },
  { weekday, opens: '14:00', closes: '19:00' },
]);

/** One store open on Sunday morning, so the week is not uniform. */
const WITH_SUNDAY_MORNING: OpeningInterval[] = [
  { weekday: 0, opens: '09:00', closes: '13:00' },
  ...MONDAY_TO_SATURDAY,
];

/**
 * Eight stores on the Grande Méier axis — the pilot territory. The
 * neighbourhoods and the postal ranges are real so the comparator is judged on
 * real column widths; the store names are not, and must not reach a public
 * deploy.
 *
 * ⚠️ **They are `ACTIVE` since pd-15, and that is development data, not a
 * claim.** Until then every one was `PROSPECT` — nobody has signed anything —
 * and that was correct for the comparator, because `ACTIVE` governs placing an
 * order and not appearing in a price guide (ADR-0010, A12 / P1). But `orders`
 * requires `ACTIVE` (DOMAIN_MODEL), so with all eight as `PROSPECT` **no order
 * could be created in development at all**. Marking them here was the honest
 * choice: the checkout keeps the right rule and the fixture carries the dev
 * data, rather than the rule being loosened to `≠ PAUSED` to fit the seed
 * (decisão do Victor, 13/09/2026 — ADR-0017, P5).
 *
 * ⚠️ The `DOMAIN_MODEL` invariant "`ACTIVE` exige `psp_recipient_id`" is **not
 * verifiable yet** — the column does not exist until J6/pd-17 — so nothing
 * enforces it here.
 */
export const PILOT_STORES: readonly SeedStore[] = [
  {
    name: 'Petshop Amigo Fiel',
    neighborhood: 'Méier',
    status: 'ACTIVE',
    openingHours: MONDAY_TO_SATURDAY,
    areas: [
      {
        label: 'Méier e vizinhos',
        neighborhoods: ['Méier', 'Todos os Santos', 'Engenho de Dentro'],
        postalCodeRanges: [{ from: '20710000', to: '20775999' }],
        deliveryFeeCents: 690,
        estimatedMinutes: 45,
        active: true,
      },
      {
        label: 'Borda norte',
        neighborhoods: ['Cachambi', 'Abolição'],
        postalCodeRanges: [{ from: '20775000', to: '20785999' }],
        deliveryFeeCents: 990,
        estimatedMinutes: 70,
        active: true,
      },
    ],
  },
  {
    name: 'Mundo Pet Engenho Novo',
    neighborhood: 'Engenho Novo',
    status: 'ACTIVE',
    openingHours: WITH_LUNCH_BREAK,
    areas: [
      {
        label: 'Engenho Novo e Riachuelo',
        neighborhoods: ['Engenho Novo', 'Riachuelo', 'Rocha', 'Sampaio'],
        postalCodeRanges: [{ from: '20710000', to: '20960999' }],
        deliveryFeeCents: 590,
        estimatedMinutes: 40,
        active: true,
      },
    ],
  },
  {
    name: 'Casa dos Bichos Cachambi',
    neighborhood: 'Cachambi',
    status: 'ACTIVE',
    openingHours: MONDAY_TO_SATURDAY,
    areas: [
      {
        label: 'Cachambi e Méier',
        neighborhoods: ['Cachambi', 'Méier', 'Todos os Santos', 'Jacaré'],
        postalCodeRanges: [{ from: '20720000', to: '20785999' }],
        deliveryFeeCents: 750,
        estimatedMinutes: 55,
        active: true,
      },
    ],
  },
  {
    name: 'Ração & Cia Todos os Santos',
    neighborhood: 'Todos os Santos',
    status: 'ACTIVE',
    openingHours: WITH_LUNCH_BREAK,
    areas: [
      {
        label: 'Todos os Santos e entorno',
        neighborhoods: ['Todos os Santos', 'Méier', 'Engenho de Dentro', 'Água Santa'],
        postalCodeRanges: [{ from: '20720000', to: '20770999' }],
        deliveryFeeCents: 490,
        estimatedMinutes: 60,
        active: true,
      },
    ],
  },
  {
    name: 'Pet Lins',
    neighborhood: 'Lins de Vasconcelos',
    status: 'ACTIVE',
    openingHours: MONDAY_TO_SATURDAY,
    areas: [
      {
        label: 'Lins e encosta',
        neighborhoods: ['Lins de Vasconcelos', 'Engenho Novo', 'Água Santa'],
        postalCodeRanges: [{ from: '20710000', to: '20735999' }],
        deliveryFeeCents: 890,
        estimatedMinutes: 50,
        active: true,
      },
    ],
  },
  {
    name: 'Petshop Bicho Solto',
    neighborhood: 'Piedade',
    status: 'ACTIVE',
    openingHours: MONDAY_TO_SATURDAY,
    areas: [
      {
        label: 'Piedade e Encantado',
        neighborhoods: ['Piedade', 'Encantado', 'Água Santa', 'Pilares'],
        postalCodeRanges: [{ from: '20740000', to: '20775999' }],
        deliveryFeeCents: 690,
        estimatedMinutes: 65,
        active: true,
      },
    ],
  },
  {
    name: 'Agropet Engenho de Dentro',
    neighborhood: 'Engenho de Dentro',
    status: 'ACTIVE',
    openingHours: WITH_SUNDAY_MORNING,
    areas: [
      {
        label: 'Engenho de Dentro e Méier',
        neighborhoods: ['Engenho de Dentro', 'Méier', 'Cachambi', 'Abolição'],
        postalCodeRanges: [{ from: '20720000', to: '20785999' }],
        deliveryFeeCents: 590,
        estimatedMinutes: 45,
        active: true,
      },
    ],
  },
  {
    name: 'Focinho Feliz Riachuelo',
    neighborhood: 'Riachuelo',
    status: 'ACTIVE',
    openingHours: MONDAY_TO_SATURDAY,
    areas: [
      {
        label: 'Riachuelo, Rocha e Sampaio',
        neighborhoods: ['Riachuelo', 'Rocha', 'Sampaio', 'Jacaré'],
        postalCodeRanges: [{ from: '20770000', to: '20960999' }],
        deliveryFeeCents: 790,
        estimatedMinutes: 55,
        active: true,
      },
    ],
  },
];

/** The prices are frozen, so re-running the seed never rewrites a timestamp. */
const PRICE_UPDATED_AT = new Date('2026-09-11T00:00:00.000Z');

/**
 * Deterministic pseudo-random in [0, 1). Two runs of the seed must produce the
 * same prices, otherwise the manual test script compares different screens.
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
function basePriceCents(product: SeedProduct): number {
  const perKilo: Record<SeedProduct['category'], number> = {
    FOOD_PREMIUM: 2_450,
    FOOD_STANDARD: 1_180,
    TREAT: 9_800,
    HYGIENE: 1_050,
    HEALTH_OTC: 480_000,
    ACCESSORY: 32_000,
  };
  const kilos = product.netWeightGrams / 1000;
  const raw = Math.round(perKilo[product.category] * kilos);
  // Packaged goods do not scale linearly: the big bag is cheaper per kilo.
  const scaleDiscount = kilos > 10 ? 0.82 : kilos > 3 ? 0.91 : 1;
  return Math.max(690, Math.round((raw * scaleDiscount) / 10) * 10);
}

/**
 * One offer per (store, product) pair the store carries.
 *
 * About 12% of the pairs are skipped and another slice is marked unavailable,
 * because a comparator where every store has everything is a comfortable
 * fixture — and a comfortable fixture hides exactly what the comparator is for.
 */
export function buildPlaceholderOffers(
  stores: readonly SeedStore[],
  products: readonly SeedProduct[],
): SeedOffer[] {
  const offers: SeedOffer[] = [];

  for (const store of stores) {
    const storeSlug = storeSlugOf(store);

    for (const product of products) {
      const productSlug = productSlugOf(product);
      const seed = `${storeSlug}:${productSlug}`;

      if (hashUnit(`carry:${seed}`) < 0.12) {
        continue;
      }

      const spread = 0.86 + hashUnit(`price:${seed}`) * 0.32;

      offers.push({
        storeSlug,
        productSlug,
        priceCents: Math.round((basePriceCents(product) * spread) / 10) * 10,
        available: hashUnit(`stock:${seed}`) > 0.08,
        priceUpdatedAt: PRICE_UPDATED_AT,
      });
    }
  }

  return offers;
}
