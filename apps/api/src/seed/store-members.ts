import type { StoreRole } from '@petdots/contracts';
import { normalizeEmail } from '@petdots/domain';
import type { PrismaClient } from '@prisma/client';

export interface GrantStoreMembershipInput {
  storeSlug: string;
  email: string;
  role: StoreRole;
}

export interface GrantedStoreMembership {
  storeId: string;
  userId: string;
  role: StoreRole;
  /** True when this run is what added `STORE_MEMBER` to the account. */
  roleGranted: boolean;
}

/**
 * 🔴 Links a person to a store — the whole of store onboarding, in one function.
 *
 * ADR-0013 B5 took the invitation screen out of the MVP: the link is created by
 * the founder, the way the catalogue is seeded today, and the trigger for a
 * screen is the first store asking for a second login. So this is called from
 * exactly two places, and they must not drift: `npm run store:add-member` for a
 * real shop, and the development seed for `lojista@` and `operador@`.
 *
 * **Two writes, one transaction, and the second is the one that is easy to
 * forget.** A row in `store_members` is not enough: `POST /auth/register` only
 * ever grants `TUTOR`, so somebody who signed up through the screen has no
 * `STORE_MEMBER` in `users.roles` — and the global `RolesGuard` would refuse
 * them at the door, before `StoreScopeGuard` ever got to say yes. Dropping this
 * half is a red proof of the e2e for precisely that reason.
 *
 * **It refuses to invent anybody.** The person must already have an account: the
 * flow is "they sign up at `/cadastro`, then the founder runs this", which keeps
 * a real e-mail out of a versioned file in a public repository — the LGPD reason
 * the address is an argument here and not a row in `pilot.ts` (ADR-0018, A1).
 *
 * **Idempotent by the unique pair.** Running it again with a different `--role`
 * changes the role; it never produces a second row.
 *
 * ⚠️ The new role reaches the caller's **token** only on the next login or
 * refresh (up to 15 minutes): `RefreshTokensUseCase` re-reads the roles from the
 * database, but an access token already minted does not change. Whoever is
 * granted a membership has to sign in again to see the panel.
 */
export async function grantStoreMembership(
  prisma: PrismaClient,
  input: GrantStoreMembershipInput,
): Promise<GrantedStoreMembership> {
  const email = normalizeEmail(input.email);

  const store = await prisma.store.findUnique({
    where: { slug: input.storeSlug },
    select: { id: true },
  });

  if (!store) {
    throw new Error(`store "${input.storeSlug}" does not exist — check the slug`);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, roles: true },
  });

  if (!user) {
    throw new Error(
      `user ${email} is not registered — ask them to sign up at /cadastro first, then run this again`,
    );
  }

  const roleGranted = !user.roles.includes('STORE_MEMBER');

  await prisma.$transaction(async (tx) => {
    await tx.storeMember.upsert({
      where: { storeId_userId: { storeId: store.id, userId: user.id } },
      create: { storeId: store.id, userId: user.id, role: input.role },
      // Re-running with another role is how the founder corrects a mistake.
      update: { role: input.role },
    });

    if (roleGranted) {
      await tx.user.update({
        where: { id: user.id },
        data: { roles: [...user.roles, 'STORE_MEMBER'] },
      });
    }
  });

  return { storeId: store.id, userId: user.id, role: input.role, roleGranted };
}
