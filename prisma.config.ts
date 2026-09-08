import { defineConfig, env } from 'prisma/config';

// Prisma 7 no longer reads `.env` on its own. Same guarded load as
// `apps/api/src/instrumentation.ts`: no file on disk is a legitimate setup
// (CI and containers inject the real variables).
try {
  process.loadEnvFile();
} catch {
  // Intentionally empty — `env('DATABASE_URL')` below reports a missing value.
}

/**
 * Prisma 7 moved the connection URL out of `schema.prisma`: Migrate reads it
 * from here, and the runtime client gets it through the driver adapter in
 * `apps/api/src/prisma/prisma.service.ts`. Keeping both pointed at the same
 * `DATABASE_URL` is what makes `prisma migrate` and the API talk to the same
 * database (ADR-0007).
 *
 * The monorepo keeps a single `.env` at the root (SYSTEM_ARCHITECTURE), which
 * is also where this file lives, so the default lookup already finds it.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
