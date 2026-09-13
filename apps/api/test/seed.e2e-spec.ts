import { ProductNotOfferableError } from '@petdots/domain';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '@prisma/client';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';

import { PILOT_COMMISSION_RATES } from '../src/seed/data/commission-rates.js';
import { DEV_STORE_MEMBERSHIPS, DEV_USERS } from '../src/seed/data/dev-users.js';
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
  commissionRates: PILOT_COMMISSION_RATES,
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

  it('🔴 writes one commission rate in force per category — without them no order prices', () => {
    expect(first.commissionRates).toBe(6);
  });

  it('🔴 the pilot stores are ACTIVE, otherwise no order could be placed in development', async () => {
    // pd-15: `orders` requires `ACTIVE` (DOMAIN_MODEL), and all eight were
    // `PROSPECT` until then. The comparator is unaffected — it lists `≠ PAUSED`.
    expect(await prisma.store.count({ where: { status: 'ACTIVE' } })).toBe(first.stores);
  });

  it('every pilot store carries a weekly schedule, so none of them fails closed by accident', async () => {
    const stores = await prisma.store.findMany({ select: { openingHours: true } });

    for (const store of stores) {
      expect(Array.isArray(store.openingHours)).toBe(true);
      expect((store.openingHours as unknown[]).length).toBeGreaterThan(0);
    }
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
        commissionRates: PILOT_COMMISSION_RATES,
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

  // ------------------------------------------------ the development memberships

  it('🔴 links the two development accounts to the first pilot store', async () => {
    const withMembers = await seedDatabase(prisma, {
      ...PLACEHOLDER,
      devUsers: DEV_USERS,
      devStoreMemberships: DEV_STORE_MEMBERSHIPS,
    });

    expect(withMembers.users).toBe(DEV_USERS.length);
    expect(withMembers.storeMembers).toBe(2);

    const members = await prisma.storeMember.findMany({
      include: {
        user: { select: { email: true, roles: true } },
        store: { select: { slug: true } },
      },
      // By e-mail, not by role: Postgres orders an enum by its declaration
      // order, so `role: 'asc'` would quietly depend on OWNER being written
      // before OPERATOR in the schema.
      orderBy: { user: { email: 'asc' } },
    });

    expect(members.map((member) => [member.user.email, member.role])).toEqual([
      ['lojista@dev.petdots.local', 'OWNER'],
      ['operador@dev.petdots.local', 'OPERATOR'],
    ]);

    // Both on the **same** shop: the OWNER x OPERATOR split is only walkable by
    // hand when the two accounts are looking at one queue.
    expect(new Set(members.map((member) => member.store.slug)).size).toBe(1);

    // 🔴 The half that is easy to forget. `POST /auth/register` only ever grants
    // TUTOR, so without this the global `RolesGuard` would refuse the shopkeeper
    // before `StoreScopeGuard` ever got to say yes.
    for (const member of members) {
      expect(member.user.roles).toContain('STORE_MEMBER');
    }
  });

  it('is idempotent in the memberships too: a second run still has two, not four', async () => {
    const again = await seedDatabase(prisma, {
      ...PLACEHOLDER,
      devUsers: DEV_USERS,
      devStoreMemberships: DEV_STORE_MEMBERSHIPS,
    });

    expect(again.storeMembers).toBe(2);
  });

  it('refuses a membership pointing at somebody who is not a development user', async () => {
    await expect(
      seedDatabase(prisma, {
        ...PLACEHOLDER,
        devUsers: DEV_USERS,
        devStoreMemberships: [
          {
            storeSlug: storeSlugOf(firstOf(PILOT_STORES)),
            email: 'ninguem@x.local',
            role: 'OWNER',
          },
        ],
      }),
    ).rejects.toThrow(/not a development user/);
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
  const [
    products,
    stores,
    deliveryAreas,
    offers,
    commissionRates,
    storeCommissionRates,
    users,
    storeMembers,
  ] = await prisma.$transaction([
    prisma.product.count(),
    prisma.store.count(),
    prisma.deliveryArea.count(),
    prisma.offer.count(),
    prisma.commissionRate.count(),
    prisma.storeCommissionRate.count(),
    prisma.user.count(),
    prisma.storeMember.count(),
  ]);

  return {
    products,
    stores,
    deliveryAreas,
    offers,
    commissionRates,
    storeCommissionRates,
    users,
    storeMembers,
  };
}
