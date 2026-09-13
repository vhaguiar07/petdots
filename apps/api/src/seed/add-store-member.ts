import { parseArgs } from 'node:util';

import { storeRoleSchema } from '@petdots/contracts';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import { grantStoreMembership } from './store-members.js';

/**
 * 🔴 `npm run store:add-member -- --store <slug> --email <e-mail> --role OWNER|OPERATOR`
 *
 * The whole of store onboarding, and the reason there is no invitation screen
 * (ADR-0013 B5, ADR-0018 A1). The shop owner signs up at `/cadastro` like
 * anybody else, tells the founder the address they used, and this links the two.
 *
 * ⚠️ **Unlike the development accounts, this does NOT refuse to run in
 * production** — production is precisely where a real store gets linked. What is
 * DEV-ONLY is the `.local` accounts of the seed, whose password is in a public
 * file; this script invents nobody and carries no secret.
 *
 * The e-mail is not echoed back beyond what the operator just typed: the ids are
 * enough to confirm the write, and a terminal scrollback is not a place to
 * accumulate other people's addresses (SECURITY §LGPD).
 *
 * Runs compiled, like everything else in `apps/api` — `npm run build` first.
 */
async function main(): Promise<void> {
  // The same guarded load as `seed.ts` and `prisma.config.ts`: no file on disk
  // is a legitimate setup, because CI and containers inject the real variables.
  try {
    process.loadEnvFile();
  } catch {
    // Intentionally empty — the missing variable is reported below.
  }

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  const { values } = parseArgs({
    options: {
      store: { type: 'string' },
      email: { type: 'string' },
      role: { type: 'string' },
    },
  });

  const { store, email, role } = values;

  if (!store || !email || !role) {
    throw new Error(
      'usage: npm run store:add-member -- --store <slug> --email <e-mail> --role OWNER|OPERATOR',
    );
  }

  // Validated with the same schema the API uses: a typo in the role must fail
  // here, not become a membership nobody can explain later.
  const parsedRole = storeRoleSchema.safeParse(role);

  if (!parsedRole.success) {
    throw new Error(`--role must be OWNER or OPERATOR, not "${role}"`);
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  try {
    const granted = await grantStoreMembership(prisma, {
      storeSlug: store,
      email,
      role: parsedRole.data,
    });

    console.log(
      `membership granted (storeId=${granted.storeId}, userId=${granted.userId}, ` +
        `role=${granted.role}, roleGranted=${String(granted.roleGranted)})`,
    );

    if (granted.roleGranted) {
      // The access token in their browser predates the role. `RefreshTokens`
      // re-reads the roles from the database, so it arrives within fifteen
      // minutes on its own — but telling them to sign in again is instant.
      console.log('ask them to sign in again: the new role reaches the token on the next login');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
