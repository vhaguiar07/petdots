import { defineConfig } from 'prisma/config';

// Prisma 7 no longer reads `.env` on its own. Same guarded load as
// `apps/api/src/instrumentation.ts`: no file on disk is a legitimate setup
// (CI and containers inject the real variables).
try {
  process.loadEnvFile();
} catch {
  // Intentionally empty — see the comment on `datasource` below.
}

const databaseUrl = process.env.DATABASE_URL;

/**
 * Prisma 7 moved the connection URL out of `schema.prisma`: Migrate reads it
 * from here, and the runtime client gets it through the driver adapter in
 * `apps/api/src/prisma/prisma.service.ts`. Keeping both pointed at the same
 * `DATABASE_URL` is what makes `prisma migrate` and the API talk to the same
 * database (ADR-0007).
 *
 * The URL is attached **only when it exists**, on purpose. `prisma generate`
 * touches no database, and the CI runs it before any `DATABASE_URL` is in the
 * environment — declaring the datasource unconditionally (with the `env()`
 * helper, which throws on a missing variable) failed the build for a
 * connection nobody was going to open. A `migrate` without the variable still
 * fails, with Prisma's own message about the missing datasource.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    // The seed runs compiled, like everything else in `apps/api` — it needs
    // `npm run build` first (ADR-0010, A14; DEVELOPMENT_GUIDE).
    seed: 'node apps/api/dist/seed/seed.js',
  },
  ...(databaseUrl ? { datasource: { url: databaseUrl } } : {}),
});
