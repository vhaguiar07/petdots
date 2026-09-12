import type { PrismaClient } from '@prisma/client';

import { productSlugOf, storeSlugOf } from '../../src/seed/naming.js';
import { seedDatabase } from '../../src/seed/seed-database.js';
import type { SeedOffer, SeedProduct, SeedStore } from '../../src/seed/types.js';

/**
 * A small, explicit fixture — deliberately not the placeholder catalogue.
 *
 * The e2e suites assert exact prices, exact store lists and exact orderings;
 * 354 generated offers would make every assertion a lucky guess. Each row here
 * exists to prove one rule:
 *
 * - **Store C is `PAUSED` and covers everything, at the cheapest price.** If the
 *   listing filter ever breaks, C leads every ranking and every test fails
 *   loudly instead of quietly.
 * - **Store A covers by neighbourhood only, B by postal range only**, so the two
 *   halves of `areaCoversAddress` are exercised separately.
 * - **P3 is inactive** and must never surface in a search; **P2 requires a
 *   prescription** and must never carry an offer; **A's P4 offer is
 *   unavailable**, which is different from not existing.
 */
const PRICE_UPDATED_AT = new Date('2026-09-11T00:00:00.000Z');

const product = (
  fields: Pick<SeedProduct, 'brand' | 'name' | 'variant' | 'category' | 'netWeightGrams'> &
    Partial<SeedProduct>,
): SeedProduct => ({
  ean: null,
  imageUrl: null,
  requiresPrescription: false,
  active: true,
  ...fields,
});

const P1 = product({
  brand: 'Golden',
  name: 'Golden Ração Cães Adultos',
  variant: '15 kg',
  category: 'FOOD_PREMIUM',
  netWeightGrams: 15000,
});

const P2 = product({
  brand: 'Elanco',
  name: 'Elanco Vermífugo Sob Receita',
  variant: '3 comprimidos',
  category: 'HEALTH_OTC',
  netWeightGrams: 18,
  requiresPrescription: true,
});

const P3 = product({
  brand: 'Golden',
  name: 'Golden Ração Cães Filhotes',
  variant: '3 kg',
  category: 'FOOD_PREMIUM',
  netWeightGrams: 3000,
  active: false,
});

const P4 = product({
  brand: 'Pipicat',
  name: 'Pipicat Areia Sanitária',
  variant: '4 kg',
  category: 'HYGIENE',
  netWeightGrams: 4000,
});

const P5 = product({
  brand: 'Golden',
  name: 'Golden Petisco Bifinho',
  variant: '500 g',
  category: 'TREAT',
  netWeightGrams: 500,
});

const STORE_A: SeedStore = {
  name: 'Petshop A do Méier',
  neighborhood: 'Méier',
  status: 'PROSPECT',
  areas: [
    {
      label: 'Méier',
      neighborhoods: ['Méier'],
      postalCodeRanges: [],
      deliveryFeeCents: 690,
      estimatedMinutes: 45,
      active: true,
    },
    // Switched off, and covering a neighbourhood no active area reaches: an
    // inactive area is not a promise the store is making, so it must be absent
    // from the listing *and* from the store's own page (pd-13, A15).
    {
      label: 'Engenho Novo (desativada)',
      neighborhoods: ['Engenho Novo'],
      postalCodeRanges: [],
      deliveryFeeCents: 100,
      estimatedMinutes: 20,
      active: false,
    },
  ],
};

const STORE_B: SeedStore = {
  name: 'Petshop B do Cachambi',
  neighborhood: 'Cachambi',
  status: 'ACTIVE',
  areas: [
    {
      label: 'Faixa de CEP do Cachambi',
      neighborhoods: ['Cachambi'],
      postalCodeRanges: [{ from: '20720000', to: '20729999' }],
      deliveryFeeCents: 490,
      estimatedMinutes: 60,
      active: true,
    },
  ],
};

const STORE_C: SeedStore = {
  name: 'Petshop C Pausada',
  neighborhood: 'Méier',
  status: 'PAUSED',
  areas: [
    {
      label: 'Cidade inteira',
      neighborhoods: ['Méier', 'Cachambi'],
      postalCodeRanges: [{ from: '00000000', to: '99999999' }],
      deliveryFeeCents: 0,
      estimatedMinutes: 10,
      active: true,
    },
  ],
};

export const FIXTURE_PRODUCTS: readonly SeedProduct[] = [P1, P2, P3, P4, P5];
export const FIXTURE_STORES: readonly SeedStore[] = [STORE_A, STORE_B, STORE_C];

export const FIXTURE_SLUGS = {
  p1: productSlugOf(P1),
  p2: productSlugOf(P2),
  p3: productSlugOf(P3),
  p4: productSlugOf(P4),
  p5: productSlugOf(P5),
  a: storeSlugOf(STORE_A),
  b: storeSlugOf(STORE_B),
  c: storeSlugOf(STORE_C),
} as const;

/** The store names, so a suite asserts on the same spelling the seed wrote. */
export const FIXTURE_NAMES = {
  a: STORE_A.name,
  b: STORE_B.name,
  c: STORE_C.name,
} as const;

const offer = (
  storeSlug: string,
  productSlug: string,
  priceCents: number,
  available = true,
): SeedOffer => ({
  storeSlug,
  productSlug,
  priceCents,
  available,
  priceUpdatedAt: PRICE_UPDATED_AT,
});

export const FIXTURE_OFFERS: readonly SeedOffer[] = [
  offer(FIXTURE_SLUGS.a, FIXTURE_SLUGS.p1, 3990),
  offer(FIXTURE_SLUGS.b, FIXTURE_SLUGS.p1, 3790),
  // Cheapest of all, and must never be listed: the store is paused.
  offer(FIXTURE_SLUGS.c, FIXTURE_SLUGS.p1, 2990),
  offer(FIXTURE_SLUGS.a, FIXTURE_SLUGS.p4, 1590, false),
  offer(FIXTURE_SLUGS.b, FIXTURE_SLUGS.p4, 1690),
];

export interface FixtureIds {
  p1: string;
  p2: string;
  p3: string;
  p4: string;
  p5: string;
  a: string;
  b: string;
  c: string;
}

/** Applies the fixture and hands back the generated ids, keyed by shorthand. */
export async function seedFixture(prisma: PrismaClient): Promise<FixtureIds> {
  await seedDatabase(prisma, {
    products: FIXTURE_PRODUCTS,
    stores: FIXTURE_STORES,
    offers: FIXTURE_OFFERS,
  });

  const [products, stores] = await Promise.all([
    prisma.product.findMany({ select: { id: true, slug: true } }),
    prisma.store.findMany({ select: { id: true, slug: true } }),
  ]);

  const idOf = (rows: { id: string; slug: string }[], slug: string): string => {
    const row = rows.find((candidate) => candidate.slug === slug);

    if (!row) {
      throw new Error(`fixture row "${slug}" was not written`);
    }

    return row.id;
  };

  return {
    p1: idOf(products, FIXTURE_SLUGS.p1),
    p2: idOf(products, FIXTURE_SLUGS.p2),
    p3: idOf(products, FIXTURE_SLUGS.p3),
    p4: idOf(products, FIXTURE_SLUGS.p4),
    p5: idOf(products, FIXTURE_SLUGS.p5),
    a: idOf(stores, FIXTURE_SLUGS.a),
    b: idOf(stores, FIXTURE_SLUGS.b),
    c: idOf(stores, FIXTURE_SLUGS.c),
  };
}
