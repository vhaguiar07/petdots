import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';

import { API_PREFIX } from '../../src/openapi.js';
import { startMigratedPostgres } from './postgres.js';
import { type FixtureIds, seedFixture } from './seed-fixture.js';

export interface SeededApp {
  app: INestApplication;
  container: StartedPostgreSqlContainer;
  ids: FixtureIds;
}

/**
 * Ephemeral Postgres with the real migrations, the fixture applied, and the app
 * booted against it — the three comparator suites all need exactly this.
 *
 * The fixture is written through `seedDatabase` in process, not through
 * `prisma db seed`: the suite must control which rows exist, and the seed
 * script would insist on the placeholder catalogue.
 */
export async function startSeededApp(): Promise<SeededApp> {
  const postgres = await startMigratedPostgres();

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: postgres.url }) });
  let ids: FixtureIds;

  try {
    ids = await seedFixture(prisma);
  } finally {
    await prisma.$disconnect();
  }

  process.env.DATABASE_URL = postgres.url;
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'silent';

  // Same deferral as the waitlist suite: `ConfigModule.forRoot()` validates the
  // environment while the module file is evaluated.
  const { AppModule } = await import('../../src/app.module.js');

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

  const app = moduleRef.createNestApplication({ bufferLogs: true });
  app.setGlobalPrefix(API_PREFIX);
  await app.init();

  return { app, container: postgres.container, ids };
}

export async function stopSeededApp(seeded: SeededApp | undefined): Promise<void> {
  await seeded?.app.close();
  await seeded?.container.stop();
}
