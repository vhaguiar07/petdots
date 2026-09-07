import path from 'node:path';

/**
 * Repository root, resolved from the compiled `dist` and from `src` alike —
 * both sit three levels below it (apps/api/{src,dist}).
 *
 * The monorepo keeps a single `.env` and a single `prisma/` at the root
 * (SYSTEM_ARCHITECTURE), so the API must look outside its own workspace no
 * matter which directory the command was started from.
 */
export const REPO_ROOT = path.join(__dirname, '..', '..', '..', '..');

export const ROOT_ENV_FILE = path.join(REPO_ROOT, '.env');
