import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import { buildPlaceholderOffers, PILOT_STORES } from './data/pilot.js';
import { PRODUCTS } from './data/products.js';
import { seedDatabase } from './seed-database.js';

/**
 * Entry point of `npm run db:seed`. No Nest: the seed is a script, not a
 * request, and booting the whole application to write rows would drag in the
 * HTTP layer and the telemetry SDK for nothing.
 *
 * It runs compiled, like everything in `apps/api` — `npm run build` first.
 */
async function main(): Promise<void> {
  // Same guarded load as `prisma.config.ts`: no file on disk is a legitimate
  // setup, because CI and containers inject the real variables.
  try {
    process.loadEnvFile();
  } catch {
    // Intentionally empty — the missing variable is reported below.
  }

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  try {
    const summary = await seedDatabase(prisma, {
      products: PRODUCTS,
      stores: PILOT_STORES,
      offers: buildPlaceholderOffers(PILOT_STORES, PRODUCTS),
    });

    console.log(
      `seed applied: ${String(summary.products)} products, ${String(summary.stores)} stores, ` +
        `${String(summary.deliveryAreas)} delivery areas, ${String(summary.offers)} offers`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
