import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Guard for a failure that is invisible until it is expensive.
 *
 * `nestjs-zod` runs outside its declared peer range (ADR-0007) and is hoisted
 * to the repository root, while `@nestjs/*` are direct dependencies of
 * `apps/api`. npm resolves that by hoisting some packages and nesting others —
 * and if the root and the workspace ever ask for different versions, the tree
 * ends up with **two copies of Nest**: `nestjs-zod` decorating classes from one
 * and the app wiring classes from the other.
 *
 * Nothing throws when that happens. Decorator metadata simply does not match,
 * DI tokens silently miss, and the symptom shows up as an unrelated runtime
 * error much later. Measured on 08/09/2026: that exact tree existed mid-task,
 * with root at 11.2.3 and `apps/api` at 12.0.1.
 *
 * The arrangement that avoids it is the root pin in `package.json`
 * (`devDependencies` + `overrides`). This test fails the moment it drifts.
 */

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(currentDir, '..', '..', '..');

/** Every place a package could sit, nearest resolution first. */
const CANDIDATE_ROOTS = [
  path.join(repoRoot, 'apps', 'api', 'node_modules'),
  path.join(repoRoot, 'node_modules'),
];

const SHARED_BY_NESTJS_ZOD = ['@nestjs/common', '@nestjs/core', '@nestjs/swagger'];

function installedCopies(pkg: string): { root: string; version: string }[] {
  return CANDIDATE_ROOTS.flatMap((root) => {
    const manifest = path.join(root, pkg, 'package.json');

    if (!existsSync(manifest)) {
      return [];
    }

    const { version } = JSON.parse(readFileSync(manifest, 'utf8')) as { version: string };

    return [{ root, version }];
  });
}

describe('Nest is installed exactly once', () => {
  it.each(SHARED_BY_NESTJS_ZOD)('%s has a single copy in the tree', (pkg) => {
    const copies = installedCopies(pkg);

    expect(copies.length).toBeGreaterThan(0);
    expect(
      copies.map(({ root, version }) => `${path.relative(repoRoot, root)} -> ${version}`),
    ).toHaveLength(1);
  });
});
