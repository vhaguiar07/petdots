import { spawnSync } from 'node:child_process';

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';

import { REPO_ROOT } from '../../src/config/paths.js';

export interface MigratedPostgres {
  container: StartedPostgreSqlContainer;
  url: string;
}

/**
 * Starts an ephemeral Postgres and applies the real migrations to it.
 *
 * Applying `prisma/migrations` instead of pushing the schema is deliberate
 * (TESTING_STRATEGY): the constraints are the rules — the unique index on
 * `phone` *is* the "one lead, one phone" invariant — and a test that mocks them
 * proves nothing about what production will do. It also exercises the
 * migrations themselves against an empty database on every run.
 */
export async function startMigratedPostgres(): Promise<MigratedPostgres> {
  const container = await new PostgreSqlContainer('postgres:16-alpine').start();
  const url = container.getConnectionUri();

  // `shell: true` for the same reason as `scripts/jest.mjs`: on Windows the
  // binary on PATH is `prisma.cmd`, which `spawnSync` cannot exec directly.
  const result = spawnSync('prisma', ['migrate', 'deploy'], {
    cwd: REPO_ROOT,
    shell: true,
    encoding: 'utf8',
    env: { ...process.env, DATABASE_URL: url },
  });

  if (result.status !== 0) {
    await container.stop();

    throw new Error(
      `prisma migrate deploy failed (status ${String(result.status)})\n` +
        `stdout:\n${result.stdout ?? ''}\nstderr:\n${result.stderr ?? ''}`,
    );
  }

  return { container, url };
}
