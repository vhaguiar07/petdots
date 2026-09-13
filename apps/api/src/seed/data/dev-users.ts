// DEV-ONLY — usuários de desenvolvimento com senha conhecida, em repositório
// PÚBLICO. Só existem porque `seedDevUsers` se RECUSA a rodar com
// NODE_ENV=production (ADR-0011, A8 / C7). Se essa recusa cair, a senha abaixo
// vira credencial real exposta e precisa ser trocada na hora.

import { storeSlugOf } from '../naming.js';
import type { SeedStoreMembership, SeedUser } from '../types.js';
import { PILOT_STORES } from './pilot.js';

/**
 * The one password for all three, decided by the Victor at the gate (P2). One
 * password rather than three because the daily friction of looking up which
 * account has which secret buys nothing in a pilot where the file is public
 * anyway.
 */
export const DEV_USER_PASSWORD = 'petdots-dev-2026';

/**
 * The accounts that answer the question this whole task came from: "how do I log
 * in during development?"
 *
 * The `.local` domain is deliberate. It is not routable, so none of these can
 * ever collide with a real person's address, and a message sent to one of them
 * goes nowhere instead of to a stranger.
 *
 * One per role, and one of them with two roles: `lojista@` is `STORE_MEMBER`
 * *and* `TUTOR`, because the shop owner who also has a pet is the case that
 * breaks a `RolesGuard` written with equality instead of intersection
 * (DOMAIN_MODEL §Usuário; ADR-0011, R4).
 *
 * `operador@` joins them in pd-16. Without a second store account the
 * `OWNER` × `OPERATOR` split of ADR-0013 could not be walked by hand: the whole
 * point of "o operador não vê Horários" is that two different people log in and
 * see two different panels of the **same** shop.
 */
export const DEV_USERS: readonly SeedUser[] = [
  { email: 'tutor@dev.petdots.local', password: DEV_USER_PASSWORD, roles: ['TUTOR'] },
  {
    email: 'lojista@dev.petdots.local',
    password: DEV_USER_PASSWORD,
    roles: ['STORE_MEMBER', 'TUTOR'],
  },
  { email: 'operador@dev.petdots.local', password: DEV_USER_PASSWORD, roles: ['STORE_MEMBER'] },
  { email: 'admin@dev.petdots.local', password: DEV_USER_PASSWORD, roles: ['ADMIN'] },
];

/**
 * The two development memberships, both on the **first pilot store**.
 *
 * The same shop for both on purpose: the roles are only comparable when they
 * look at one queue. `lojista@` owns it and sees Horários and the price field;
 * `operador@` works its counter, accepts and refuses orders, and does not.
 *
 * ⚠️ DEV-ONLY, like the accounts they point at: `seedDatabase` applies these
 * only when it applied the dev users, so `NODE_ENV=production` drops both
 * halves together. A real store is linked with `npm run store:add-member`,
 * which takes the e-mail as an argument and never puts it in this file.
 */
export const DEV_STORE_MEMBERSHIPS: readonly SeedStoreMembership[] = PILOT_STORES[0]
  ? [
      {
        storeSlug: storeSlugOf(PILOT_STORES[0]),
        email: 'lojista@dev.petdots.local',
        role: 'OWNER',
      },
      {
        storeSlug: storeSlugOf(PILOT_STORES[0]),
        email: 'operador@dev.petdots.local',
        role: 'OPERATOR',
      },
    ]
  : [];
