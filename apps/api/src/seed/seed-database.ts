import {
  commissionRateSchema,
  deliveryAreaSchema,
  openingHoursSchema,
  productSchema,
  storeStatusSchema,
  userRoleSchema,
} from '@petdots/contracts';
import {
  assertPasswordIsAcceptable,
  assertProductCanBeOffered,
  normalizeEmail,
} from '@petdots/domain';
import { hash } from '@node-rs/argon2';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';

import { productSearchTextOf, productSlugOf, storeSlugOf } from './naming.js';
import type {
  SeedCommissionRate,
  SeedInput,
  SeedProduct,
  SeedStore,
  SeedStoreCommissionRate,
  SeedSummary,
  SeedUser,
} from './types.js';

/** The database has no interactive user; a few hundred upserts need room. */
const TRANSACTION_TIMEOUT_MS = 120_000;

const seedProductSchema = productSchema.omit({ id: true, slug: true });
const seedDeliveryAreaSchema = deliveryAreaSchema.omit({ id: true, storeId: true });
const seedStoreSchema = z.object({
  name: z.string().min(2).max(120),
  neighborhood: z.string().min(2).max(80),
  status: storeStatusSchema,
  openingHours: openingHoursSchema,
});
/** `validTo` is never seeded; `id` is generated. */
const seedCommissionRateSchema = commissionRateSchema
  .omit({ id: true, validFrom: true, validTo: true })
  .extend({ validFrom: z.date() });
const seedUserSchema = z.object({
  email: z.string().max(255),
  password: z.string(),
  roles: z.array(userRoleSchema).min(1),
});

interface ValidatedInput {
  products: { slug: string; searchText: string; product: SeedProduct }[];
  stores: { slug: string; store: SeedStore }[];
  commissionRates: SeedCommissionRate[];
  storeCommissionRates: SeedStoreCommissionRate[];
  devUsers: SeedUser[];
}

/**
 * Writes the catalogue, the pilot stores and their offers, idempotently.
 *
 * This is the interim answer to "who fills in the offers?" — there is no store
 * panel and no admin console, and the comparator cannot exist without data
 * (ADR-0010, A14). Git is the audit trail of who changed which price, which is
 * why the data lives in versioned files and not in a spreadsheet.
 *
 * Everything is validated **before** the first write, with the same functions
 * the API and the contracts use: a run either applies completely or leaves the
 * database untouched. Rows are upserted by natural key — product by `slug`,
 * store by `slug`, area by (store, label), offer by (store, product) — so
 * running it twice changes nothing.
 */
export async function seedDatabase(prisma: PrismaClient, input: SeedInput): Promise<SeedSummary> {
  const validated = validate(input);

  await prisma.$transaction(
    async (tx) => {
      const productIdBySlug = new Map<string, string>();

      for (const { slug, searchText, product } of validated.products) {
        const fields = {
          ean: product.ean,
          name: product.name,
          brand: product.brand,
          category: product.category,
          variant: product.variant,
          netWeightGrams: product.netWeightGrams,
          imageUrl: product.imageUrl,
          requiresPrescription: product.requiresPrescription,
          active: product.active,
          searchText,
        };

        const row = await tx.product.upsert({
          where: { slug },
          create: { slug, ...fields },
          update: fields,
        });

        productIdBySlug.set(slug, row.id);
      }

      // The commission table first: an order cannot be priced without a rate in
      // force for its category, so seeding the stores before the rates would
      // leave a window where the database looks ready and the checkout is not.
      for (const rate of validated.commissionRates) {
        const fields = { rateBps: rate.rateBps };

        await tx.commissionRate.upsert({
          where: {
            category_validFrom: { category: rate.category, validFrom: rate.validFrom },
          },
          create: { category: rate.category, validFrom: rate.validFrom, ...fields },
          update: fields,
        });
      }

      const storeIdBySlug = new Map<string, string>();

      for (const { slug, store } of validated.stores) {
        const fields = {
          name: store.name,
          neighborhood: store.neighborhood,
          status: store.status,
          // Rebuilt as plain literals for the same reason the postal ranges
          // are: an interface never satisfies Prisma's `InputJsonValue`.
          openingHours: store.openingHours.map((interval) => ({
            weekday: interval.weekday,
            opens: interval.opens,
            closes: interval.closes,
          })),
        };

        const row = await tx.store.upsert({
          where: { slug },
          create: { slug, ...fields },
          update: fields,
        });

        storeIdBySlug.set(slug, row.id);

        for (const area of store.areas) {
          const areaFields = {
            neighborhoods: area.neighborhoods,
            // Rebuilt as plain literals: `PostalCodeRange` is an interface, and
            // an interface never satisfies Prisma's `InputJsonValue` (only
            // anonymous object types get an implicit index signature).
            postalCodeRanges: area.postalCodeRanges.map((range) => ({
              from: range.from,
              to: range.to,
            })),
            deliveryFeeCents: area.deliveryFeeCents,
            estimatedMinutes: area.estimatedMinutes,
            active: area.active,
          };

          await tx.deliveryArea.upsert({
            where: { storeId_label: { storeId: row.id, label: area.label } },
            create: { storeId: row.id, label: area.label, ...areaFields },
            update: areaFields,
          });
        }
      }

      for (const offer of input.offers) {
        const storeId = storeIdBySlug.get(offer.storeSlug);
        const productId = productIdBySlug.get(offer.productSlug);

        // `validate` already refused an offer pointing at nothing; this only
        // convinces the type checker.
        if (!storeId || !productId) {
          continue;
        }

        const fields = {
          priceCents: offer.priceCents,
          available: offer.available,
          priceUpdatedAt: offer.priceUpdatedAt,
        };

        await tx.offer.upsert({
          where: { storeId_productId: { storeId, productId } },
          create: { storeId, productId, ...fields },
          update: fields,
        });
      }

      for (const rate of validated.storeCommissionRates) {
        const storeId = storeIdBySlug.get(rate.storeSlug);

        // `validate` already refused a rate pointing at nothing.
        if (!storeId) {
          continue;
        }

        await tx.storeCommissionRate.upsert({
          where: {
            storeId_category_validFrom: {
              storeId,
              category: rate.category,
              validFrom: rate.validFrom,
            },
          },
          create: {
            storeId,
            category: rate.category,
            validFrom: rate.validFrom,
            rateBps: rate.rateBps,
          },
          update: { rateBps: rate.rateBps },
        });
      }
    },
    { timeout: TRANSACTION_TIMEOUT_MS },
  );

  await seedDevUsers(prisma, validated.devUsers);

  // Counted from the database, not from the input: that is what makes two runs
  // comparable, and what would expose a duplicate the upserts failed to catch.
  const [products, stores, deliveryAreas, offers, commissionRates, storeCommissionRates, users] =
    await prisma.$transaction([
      prisma.product.count(),
      prisma.store.count(),
      prisma.deliveryArea.count(),
      prisma.offer.count(),
      prisma.commissionRate.count(),
      prisma.storeCommissionRate.count(),
      prisma.user.count(),
    ]);

  return {
    products,
    stores,
    deliveryAreas,
    offers,
    commissionRates,
    storeCommissionRates,
    users,
  };
}

/**
 * 🔴 Writes the development accounts — and refuses to, in production.
 *
 * The refusal is the whole reason these accounts may exist at all. Their
 * password is in a versioned file in a **public** repository, which is
 * tolerable only while the rows cannot come into being anywhere real; without
 * this check the seed would carry a known credential into production, which is
 * precisely the risk that made the analysis reject an auth bypass in the first
 * place (ADR-0011, A8 / C7).
 *
 * It is not an error, and it must not abort the run: the catalogue *does* get
 * seeded in production, and failing here would take it down with it.
 */
async function seedDevUsers(prisma: PrismaClient, users: SeedUser[]): Promise<void> {
  if (users.length === 0) {
    return;
  }

  if (process.env.NODE_ENV === 'production') {
    console.warn(
      `seed: refusing to create ${String(users.length)} development users with NODE_ENV=production`,
    );
    return;
  }

  for (const user of users) {
    const email = normalizeEmail(user.email);
    // Hashed one at a time, outside a transaction: argon2 is deliberately slow
    // (~50ms each), and holding a transaction open across it would lock rows
    // for no reason. Three accounts, and the upsert makes each one idempotent.
    const passwordHash = await hash(user.password);

    await prisma.user.upsert({
      where: { email },
      create: { email, passwordHash, roles: user.roles },
      // The hash is rewritten on every run, on purpose: the password in the
      // file is the source of truth, so changing it there is enough to change
      // the login — no stale hash survives from a previous value.
      update: { passwordHash, roles: user.roles },
    });
  }
}

function validate(input: SeedInput): ValidatedInput {
  const products = input.products.map((product, index) => {
    const parsed = seedProductSchema.safeParse(product);

    if (!parsed.success) {
      throw new Error(`seed product #${String(index)} is invalid: ${issuesOf(parsed.error)}`);
    }

    return {
      slug: productSlugOf(product),
      searchText: productSearchTextOf(product),
      product,
    };
  });

  assertUnique(
    products.map(({ slug }) => slug),
    'two products derive the same slug — give them distinct names or variants',
  );

  const stores = input.stores.map((store, index) => {
    const parsed = seedStoreSchema.safeParse(store);

    if (!parsed.success) {
      throw new Error(`seed store #${String(index)} is invalid: ${issuesOf(parsed.error)}`);
    }

    for (const area of store.areas) {
      const parsedArea = seedDeliveryAreaSchema.safeParse(area);

      if (!parsedArea.success) {
        throw new Error(
          `delivery area "${area.label}" of "${store.name}" is invalid: ${issuesOf(parsedArea.error)}`,
        );
      }
    }

    assertUnique(
      store.areas.map((area) => area.label),
      `store "${store.name}" has two delivery areas with the same label`,
    );

    return { slug: storeSlugOf(store), store };
  });

  assertUnique(
    stores.map(({ slug }) => slug),
    'two stores derive the same slug — give them distinct names',
  );

  const productBySlug = new Map(products.map(({ slug, product }) => [slug, product]));
  const storeSlugs = new Set(stores.map(({ slug }) => slug));
  const pairs: string[] = [];

  for (const offer of input.offers) {
    const product = productBySlug.get(offer.productSlug);

    if (!product) {
      throw new Error(`offer points at unknown product "${offer.productSlug}"`);
    }

    if (!storeSlugs.has(offer.storeSlug)) {
      throw new Error(`offer points at unknown store "${offer.storeSlug}"`);
    }

    // The cross-table invariant Postgres cannot express: a prescription product
    // has no offer in the MVP (DOMAIN_MODEL, ADR-0010 A17). Raises
    // `ProductNotOfferableError`, before a single row is written.
    assertProductCanBeOffered(product);

    if (!Number.isInteger(offer.priceCents) || offer.priceCents <= 0) {
      throw new Error(
        `offer ${offer.storeSlug}/${offer.productSlug} has a non-positive price in cents`,
      );
    }

    pairs.push(`${offer.storeSlug}/${offer.productSlug}`);
  }

  assertUnique(pairs, 'two offers describe the same store and product');

  const commissionRates = input.commissionRates.map((rate, index) => {
    const parsed = seedCommissionRateSchema.safeParse(rate);

    if (!parsed.success) {
      throw new Error(
        `seed commission rate #${String(index)} is invalid: ${issuesOf(parsed.error)}`,
      );
    }

    return rate;
  });

  // 🔴 One rate in force per category, and no more. Two open-ended rows for the
  // same category would make "which take rate applies?" depend on a tie-break
  // nobody decided, on the money of the partner we can least afford to get
  // wrong (ADR-0003). The domain picks the most recent `validFrom`, but a seed
  // that produced the ambiguity in the first place is a seed that should fail.
  assertUnique(
    commissionRates.map((rate) => rate.category),
    'two commission rates are in force for the same category',
  );

  const storeSlugsForRates = new Set(stores.map(({ slug }) => slug));
  const storeCommissionRates = (input.storeCommissionRates ?? []).map((rate, index) => {
    const parsed = seedCommissionRateSchema.safeParse(rate);

    if (!parsed.success) {
      throw new Error(
        `seed store commission rate #${String(index)} is invalid: ${issuesOf(parsed.error)}`,
      );
    }

    if (!storeSlugsForRates.has(rate.storeSlug)) {
      throw new Error(`store commission rate points at unknown store "${rate.storeSlug}"`);
    }

    return rate;
  });

  assertUnique(
    storeCommissionRates.map((rate) => `${rate.storeSlug}/${rate.category}`),
    'two commission exceptions are in force for the same store and category',
  );

  const devUsers = (input.devUsers ?? []).map((user, index) => {
    const parsed = seedUserSchema.safeParse(user);

    if (!parsed.success) {
      throw new Error(`seed user #${String(index)} is invalid: ${issuesOf(parsed.error)}`);
    }

    // The same two domain rules the API applies at registration. A seeded
    // account that the password policy would refuse is an account whose
    // password stops working the day someone reuses it through the API.
    normalizeEmail(user.email);
    assertPasswordIsAcceptable(user.password);

    return user;
  });

  assertUnique(
    devUsers.map((user) => normalizeEmail(user.email)),
    'two development users share an e-mail',
  );

  return { products, stores, commissionRates, storeCommissionRates, devUsers };
}

function assertUnique(values: string[], message: string): void {
  const seen = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      throw new Error(`${message} (duplicate: "${value}")`);
    }

    seen.add(value);
  }
}

function issuesOf(error: z.ZodError): string {
  return error.issues.map((issue) => `${issue.path.join('.')} ${issue.message}`).join('; ');
}
