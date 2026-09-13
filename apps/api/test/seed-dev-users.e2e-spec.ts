import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';

import { DEV_USER_PASSWORD, DEV_USERS } from '../src/seed/data/dev-users.js';
import { seedDatabase } from '../src/seed/seed-database.js';
import type { SeedInput } from '../src/seed/types.js';
import { startMigratedPostgres } from './support/postgres.js';

/**
 * A catalogue of one product and one store, so the suite is about the users and
 * not about the placeholder data. The point is that the catalogue **is** seeded
 * in production while the accounts are not — the refusal must be surgical.
 */
const INPUT: SeedInput = {
  products: [
    {
      name: 'Ração Sentinela',
      brand: 'Sentinela',
      category: 'FOOD_STANDARD',
      variant: '10,1 kg',
      netWeightGrams: 10_100,
      ean: null,
      imageUrl: null,
      requiresPrescription: false,
      active: true,
    },
  ],
  stores: [
    {
      name: 'Petshop Sentinela',
      neighborhood: 'Méier',
      status: 'PROSPECT',
      // This suite is about the dev users and nothing else; an empty schedule
      // is legitimate and simply means the store never opens.
      openingHours: [],
      areas: [],
    },
  ],
  offers: [],
  commissionRates: [],
  devUsers: DEV_USERS,
  // Pointing at this suite's own store rather than at `DEV_STORE_MEMBERSHIPS`,
  // which names a pilot shop this input does not create. The link is here for
  // the same reason the accounts are: it must not survive the production
  // refusal either (ADR-0018, A14).
  devStoreMemberships: [
    { storeSlug: 'petshop-sentinela', email: 'lojista@dev.petdots.local', role: 'OWNER' },
    { storeSlug: 'petshop-sentinela', email: 'operador@dev.petdots.local', role: 'OPERATOR' },
  ],
};

describe('Seed of development users (e2e)', () => {
  let container: StartedPostgreSqlContainer;
  let prisma: PrismaClient;
  const nodeEnv = process.env.NODE_ENV;

  beforeAll(async () => {
    const postgres = await startMigratedPostgres();
    container = postgres.container;
    prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: postgres.url }) });
  }, 180_000);

  afterAll(async () => {
    process.env.NODE_ENV = nodeEnv;
    await prisma?.$disconnect();
    await container?.stop();
  });

  describe('🔴 C7 — with NODE_ENV=production', () => {
    let summary: Awaited<ReturnType<typeof seedDatabase>>;
    const warnings: string[] = [];
    // Swapped by hand rather than with `jest.spyOn`: under ESM the `jest`
    // object is not a global, and importing it from `@jest/globals` would
    // collide with the `@types/jest` globals the rest of the suites use.
    const realWarn = console.warn.bind(console);

    beforeAll(async () => {
      process.env.NODE_ENV = 'production';
      console.warn = (...args: unknown[]): void => {
        warnings.push(args.map(String).join(' '));
      };

      summary = await seedDatabase(prisma, INPUT);
    });

    afterAll(() => {
      console.warn = realWarn;
      process.env.NODE_ENV = nodeEnv;
    });

    it('creates no user at all', async () => {
      // The sentinel that makes P2 acceptable: the password of these accounts
      // is in a versioned file in a public repository, and that is tolerable
      // only while these rows cannot exist anywhere real (ADR-0011, A8).
      expect(summary.users).toBe(0);
      expect(await prisma.user.count()).toBe(0);
    });

    it('🔴 and therefore no store membership either', async () => {
      // One refusal, both halves. The memberships point at the accounts by
      // e-mail, so applying them here would either fail loudly or — worse —
      // link a shop to somebody production never created (ADR-0018, A14).
      expect(summary.storeMembers).toBe(0);
      expect(await prisma.storeMember.count()).toBe(0);
    });

    it('still seeds the catalogue', () => {
      // The refusal must not take the rest of the seed down with it: the
      // catalogue does have to be written in production.
      expect(summary.products).toBe(1);
      expect(summary.stores).toBe(1);
    });

    it('says why, instead of failing silently', () => {
      expect(warnings.join('\n')).toContain('NODE_ENV=production');
    });
  });

  describe('outside production', () => {
    beforeAll(async () => {
      process.env.NODE_ENV = 'test';
      await seedDatabase(prisma, INPUT);
    });

    it('creates the four accounts the manual test script uses', async () => {
      const emails = (await prisma.user.findMany({ orderBy: { email: 'asc' } })).map(
        (user) => user.email,
      );

      expect(emails).toEqual([
        'admin@dev.petdots.local',
        'lojista@dev.petdots.local',
        'operador@dev.petdots.local',
        'tutor@dev.petdots.local',
      ]);
    });

    it('links the shopkeeper and the counter to the same shop, in different roles', async () => {
      const members = await prisma.storeMember.findMany({
        include: { user: { select: { email: true } } },
        // By e-mail: an enum sorts by declaration order in Postgres.
        orderBy: { user: { email: 'asc' } },
      });

      expect(members.map((member) => [member.user.email, member.role])).toEqual([
        ['lojista@dev.petdots.local', 'OWNER'],
        ['operador@dev.petdots.local', 'OPERATOR'],
      ]);
    });

    it('🔴 grants STORE_MEMBER to the operator, or the RolesGuard would refuse them', async () => {
      const operador = await prisma.user.findUniqueOrThrow({
        where: { email: 'operador@dev.petdots.local' },
      });

      expect(operador.roles).toEqual(['STORE_MEMBER']);
    });

    it('stores argon2 hashes, never the password in the file', async () => {
      const users = await prisma.user.findMany();

      for (const user of users) {
        expect(user.passwordHash).toMatch(/^\$argon2/);
        expect(user.passwordHash).not.toContain(DEV_USER_PASSWORD);
      }
    });

    it('gives the shopkeeper both roles, because one human accumulates them', async () => {
      const lojista = await prisma.user.findUniqueOrThrow({
        where: { email: 'lojista@dev.petdots.local' },
      });

      expect(lojista.roles).toEqual(['STORE_MEMBER', 'TUTOR']);
    });

    it('is idempotent: a second run creates nobody new, and no second membership', async () => {
      const second = await seedDatabase(prisma, INPUT);

      expect(second.users).toBe(DEV_USERS.length);
      expect(second.storeMembers).toBe(2);
    });

    it('refuses a development user whose password the API would refuse', async () => {
      // A seeded account below the policy is an account that stops working the
      // day someone changes its password through the API.
      await expect(
        seedDatabase(prisma, {
          ...INPUT,
          devUsers: [{ email: 'fraco@dev.petdots.local', password: 'curta', roles: ['TUTOR'] }],
        }),
      ).rejects.toThrow(/password/);

      expect(await prisma.user.count()).toBe(DEV_USERS.length);
    });
  });
});
