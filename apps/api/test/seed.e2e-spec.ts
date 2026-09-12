import { ProductNotOfferableError } from '@petdots/domain';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '@prisma/client';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';

import { buildPlaceholderOffers, PILOT_STORES } from '../src/seed/data/pilot.js';
import { PRODUCTS } from '../src/seed/data/products.js';
import { productSlugOf, storeSlugOf } from '../src/seed/naming.js';
import { seedDatabase } from '../src/seed/seed-database.js';
import type { SeedProduct, SeedSummary } from '../src/seed/types.js';
import { startMigratedPostgres } from './support/postgres.js';

const PLACEHOLDER = {
  products: PRODUCTS,
  stores: PILOT_STORES,
  offers: buildPlaceholderOffers(PILOT_STORES, PRODUCTS),
};

describe('Seed (e2e)', () => {
  let container: StartedPostgreSqlContainer;
  let prisma: PrismaClient;
  let first: SeedSummary;

  beforeAll(async () => {
    const postgres = await startMigratedPostgres();
    container = postgres.container;
    prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: postgres.url }) });

    first = await seedDatabase(prisma, PLACEHOLDER);
  }, 180_000);

  afterAll(async () => {
    await prisma?.$disconnect();
    await container?.stop();
  });

  it('writes a catalogue big enough to judge the comparator on', () => {
    expect(first.stores).toBeGreaterThanOrEqual(8);
    expect(first.products).toBeGreaterThanOrEqual(40);
    expect(first.offers).toBeGreaterThanOrEqual(250);
  });

  it('is idempotent: a second run changes nothing', async () => {
    const second = await seedDatabase(prisma, PLACEHOLDER);

    expect(second).toEqual(first);
  });

  it('validates before writing: a prescription product with an offer aborts the run', async () => {
    const before = await counts(prisma);

    const prescription: SeedProduct = {
      brand: 'Elanco',
      name: 'Produto Sob Receita',
      variant: '3 comprimidos',
      category: 'HEALTH_OTC',
      netWeightGrams: 18,
      ean: null,
      imageUrl: null,
      requiresPrescription: true,
      active: true,
    };

    await expect(
      seedDatabase(prisma, {
        products: [...PRODUCTS, prescription],
        stores: PILOT_STORES,
        offers: [
          ...PLACEHOLDER.offers,
          {
            storeSlug: storeSlugOf(firstOf(PILOT_STORES)),
            productSlug: productSlugOf(prescription),
            priceCents: 1990,
            available: true,
            priceUpdatedAt: new Date('2026-09-11T00:00:00.000Z'),
          },
        ],
      }),
    ).rejects.toThrow(ProductNotOfferableError);

    // Not one row moved: the rule is checked before the transaction opens.
    expect(await counts(prisma)).toEqual(before);
  });

  it('refuses a second offer for the same store and product', async () => {
    // The sentinel of "one price per store per product": without the unique
    // index the comparator would show the same store twice, at two prices.
    const existing = await prisma.offer.findFirstOrThrow();

    expect.assertions(2);

    try {
      await prisma.offer.create({
        data: {
          storeId: existing.storeId,
          productId: existing.productId,
          priceCents: existing.priceCents + 100,
          available: true,
          priceUpdatedAt: new Date(),
        },
      });
    } catch (error) {
      expect(error).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
      expect((error as Prisma.PrismaClientKnownRequestError).code).toBe('P2002');
    }
  });

  it('refuses an offer priced at zero', async () => {
    // The sentinel of "money is a positive integer of cents" (ADR-0004 #11):
    // the database is what sustains it, not the code that happens to write.
    const product = await prisma.product.create({
      data: {
        slug: 'produto-sentinela-do-check',
        name: 'Produto Sentinela',
        brand: 'Sentinela',
        category: 'ACCESSORY',
        variant: 'único',
        netWeightGrams: 100,
        searchText: 'sentinela produto sentinela unico',
      },
    });
    const store = await prisma.store.findFirstOrThrow();

    const free = prisma.offer.create({
      data: {
        storeId: store.id,
        productId: product.id,
        priceCents: 0,
        available: true,
        priceUpdatedAt: new Date(),
      },
    });

    await expect(free).rejects.toThrow(/offers_price_cents_check/);
  });
});

function firstOf<T>(items: readonly T[]): T {
  const [first] = items;

  if (!first) {
    throw new Error('the seed data is empty');
  }

  return first;
}

async function counts(prisma: PrismaClient): Promise<SeedSummary> {
  const [products, stores, deliveryAreas, offers, users] = await prisma.$transaction([
    prisma.product.count(),
    prisma.store.count(),
    prisma.deliveryArea.count(),
    prisma.offer.count(),
    prisma.user.count(),
  ]);

  return { products, stores, deliveryAreas, offers, users };
}
