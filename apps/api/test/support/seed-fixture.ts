import { type OpeningInterval, zonedPartsOf } from '@petdots/domain';
import type { PrismaClient } from '@prisma/client';

import { productSlugOf, storeSlugOf } from '../../src/seed/naming.js';
import { seedDatabase } from '../../src/seed/seed-database.js';
import type {
  SeedCommissionRate,
  SeedOffer,
  SeedProduct,
  SeedStore,
  SeedStoreCommissionRate,
} from '../../src/seed/types.js';

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
 * - **Store D is `ACTIVE` and open one hour a week**, so `409 STORE_CLOSED` has
 *   somewhere to come from without the suite depending on the wall clock.
 */
const PRICE_UPDATED_AT = new Date('2026-09-11T00:00:00.000Z');

/**
 * 🔴 Always open — seven days, `00:00`–`24:00`.
 *
 * The suites place orders at whatever time CI happens to run, and an order is
 * refused outside opening hours (ADR-0014, C2). Anything narrower would make
 * the whole order suite fail at night, in a way that reads like a bug in
 * `orders` rather than a bug in the fixture. `24:00` rather than `23:59`
 * because the latter leaves one minute of every day shut — a test failing once
 * a day for a reason nobody would find.
 */
const ALWAYS_OPEN: OpeningInterval[] = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
  weekday,
  opens: '00:00',
  closes: '24:00',
}));

/**
 * 🔴 One hour, three days from whenever the fixture is built.
 *
 * It has to be **computed** and not written down. A fixed window — "Tuesdays,
 * 10:00 to 11:00" — is open for one hour in every 168, and a suite that happens
 * to run inside it would fail with `201` where it expected `409 STORE_CLOSED`,
 * once in a while, for a reason nobody would find. There is no way to inject a
 * clock through HTTP, so the fixture moves instead: three days ahead is never
 * "now", and it still gives `nextOpeningAt` a real instant to point at.
 */
function rarelyOpen(): OpeningInterval[] {
  const today = zonedPartsOf(new Date()).weekday;

  return [{ weekday: (today + 3) % 7, opens: '10:00', closes: '11:00' }];
}

const RARELY_OPEN: OpeningInterval[] = rarelyOpen();

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
  // Still `PROSPECT`, and now it carries a second meaning: it is the store that
  // proves `409 STORE_NOT_ACTIVE` — listable in the comparator, but not taking
  // orders (DOMAIN_MODEL; ADR-0010, A12).
  status: 'PROSPECT',
  openingHours: ALWAYS_OPEN,
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
  // The one store that can actually take an order: `ACTIVE`, always open, and
  // covering the CEP the order suites give their tutors.
  status: 'ACTIVE',
  openingHours: ALWAYS_OPEN,
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
  openingHours: ALWAYS_OPEN,
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

/**
 * `ACTIVE`, delivers where B delivers, and open one hour a week. Everything
 * about an order it receives is valid except the clock, which is what makes it
 * the single-variable proof of `409 STORE_CLOSED`.
 */
const STORE_D: SeedStore = {
  name: 'Petshop D Fechada',
  neighborhood: 'Cachambi',
  status: 'ACTIVE',
  openingHours: RARELY_OPEN,
  areas: [
    {
      label: 'Faixa de CEP do Cachambi',
      neighborhoods: ['Cachambi'],
      postalCodeRanges: [{ from: '20720000', to: '20729999' }],
      deliveryFeeCents: 590,
      estimatedMinutes: 50,
      active: true,
    },
  ],
};

export const FIXTURE_PRODUCTS: readonly SeedProduct[] = [P1, P2, P3, P4, P5];
export const FIXTURE_STORES: readonly SeedStore[] = [STORE_A, STORE_B, STORE_C, STORE_D];

export const FIXTURE_SLUGS = {
  p1: productSlugOf(P1),
  p2: productSlugOf(P2),
  p3: productSlugOf(P3),
  p4: productSlugOf(P4),
  p5: productSlugOf(P5),
  a: storeSlugOf(STORE_A),
  b: storeSlugOf(STORE_B),
  c: storeSlugOf(STORE_C),
  d: storeSlugOf(STORE_D),
} as const;

/** The store names, so a suite asserts on the same spelling the seed wrote. */
export const FIXTURE_NAMES = {
  a: STORE_A.name,
  b: STORE_B.name,
  c: STORE_C.name,
  d: STORE_D.name,
} as const;

/**
 * The same six-category table the pilot seeds, so the e2e prices with the
 * numbers the manual walkthrough will see.
 */
const RATES_VALID_FROM = new Date('2026-09-01T00:00:00.000Z');

export const FIXTURE_COMMISSION_RATES: readonly SeedCommissionRate[] = [
  { category: 'FOOD_STANDARD', rateBps: 600, validFrom: RATES_VALID_FROM },
  { category: 'FOOD_PREMIUM', rateBps: 900, validFrom: RATES_VALID_FROM },
  { category: 'HYGIENE', rateBps: 800, validFrom: RATES_VALID_FROM },
  { category: 'HEALTH_OTC', rateBps: 1200, validFrom: RATES_VALID_FROM },
  { category: 'ACCESSORY', rateBps: 1200, validFrom: RATES_VALID_FROM },
  { category: 'TREAT', rateBps: 1000, validFrom: RATES_VALID_FROM },
];

/**
 * 🔴 Store B pays 5% on premium food instead of the table's 9% — the founder
 * tariff. It is here so an e2e can prove the override actually reached the
 * snapshot of a real order, not only the unit test of the pure function.
 */
export const FIXTURE_STORE_COMMISSION_RATES: readonly SeedStoreCommissionRate[] = [
  {
    storeSlug: storeSlugOf(STORE_B),
    category: 'FOOD_PREMIUM',
    rateBps: 500,
    validFrom: RATES_VALID_FROM,
  },
];

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
  // D's only offer. It exists so the closed-store case has something valid to
  // put in the cart — everything about the order is right except the clock.
  offer(FIXTURE_SLUGS.d, FIXTURE_SLUGS.p1, 3890),
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
  d: string;
  /** Offer ids, which is what a cart is actually made of. */
  offerBP1: string;
  offerBP4: string;
  offerAP1: string;
  offerAP4Unavailable: string;
  offerDP1: string;
}

/** Applies the fixture and hands back the generated ids, keyed by shorthand. */
export async function seedFixture(prisma: PrismaClient): Promise<FixtureIds> {
  await seedDatabase(prisma, {
    products: FIXTURE_PRODUCTS,
    stores: FIXTURE_STORES,
    offers: FIXTURE_OFFERS,
    commissionRates: FIXTURE_COMMISSION_RATES,
    storeCommissionRates: FIXTURE_STORE_COMMISSION_RATES,
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

  const ids = {
    p1: idOf(products, FIXTURE_SLUGS.p1),
    p2: idOf(products, FIXTURE_SLUGS.p2),
    p3: idOf(products, FIXTURE_SLUGS.p3),
    p4: idOf(products, FIXTURE_SLUGS.p4),
    p5: idOf(products, FIXTURE_SLUGS.p5),
    a: idOf(stores, FIXTURE_SLUGS.a),
    b: idOf(stores, FIXTURE_SLUGS.b),
    c: idOf(stores, FIXTURE_SLUGS.c),
    d: idOf(stores, FIXTURE_SLUGS.d),
  };

  const offers = await prisma.offer.findMany({
    select: { id: true, storeId: true, productId: true },
  });

  const offerOf = (storeId: string, productId: string): string => {
    const row = offers.find(
      (candidate) => candidate.storeId === storeId && candidate.productId === productId,
    );

    if (!row) {
      throw new Error('fixture offer was not written');
    }

    return row.id;
  };

  return {
    ...ids,
    offerBP1: offerOf(ids.b, ids.p1),
    offerBP4: offerOf(ids.b, ids.p4),
    offerAP1: offerOf(ids.a, ids.p1),
    offerAP4Unavailable: offerOf(ids.a, ids.p4),
    offerDP1: offerOf(ids.d, ids.p1),
  };
}
