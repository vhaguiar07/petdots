import { deliveryAreaSchema, productSchema, storeStatusSchema } from '@petdots/contracts';
import { assertProductCanBeOffered } from '@petdots/domain';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';

import { productSearchTextOf, productSlugOf, storeSlugOf } from './naming.js';
import type { SeedInput, SeedProduct, SeedStore, SeedSummary } from './types.js';

/** The database has no interactive user; a few hundred upserts need room. */
const TRANSACTION_TIMEOUT_MS = 120_000;

const seedProductSchema = productSchema.omit({ id: true, slug: true });
const seedDeliveryAreaSchema = deliveryAreaSchema.omit({ id: true, storeId: true });
const seedStoreSchema = z.object({
  name: z.string().min(2).max(120),
  neighborhood: z.string().min(2).max(80),
  status: storeStatusSchema,
});

interface ValidatedInput {
  products: { slug: string; searchText: string; product: SeedProduct }[];
  stores: { slug: string; store: SeedStore }[];
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

      const storeIdBySlug = new Map<string, string>();

      for (const { slug, store } of validated.stores) {
        const fields = { name: store.name, neighborhood: store.neighborhood, status: store.status };

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
    },
    { timeout: TRANSACTION_TIMEOUT_MS },
  );

  // Counted from the database, not from the input: that is what makes two runs
  // comparable, and what would expose a duplicate the upserts failed to catch.
  const [products, stores, deliveryAreas, offers] = await prisma.$transaction([
    prisma.product.count(),
    prisma.store.count(),
    prisma.deliveryArea.count(),
    prisma.offer.count(),
  ]);

  return { products, stores, deliveryAreas, offers };
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

  return { products, stores };
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
