// DEV-ONLY — usuários de desenvolvimento com senha conhecida, em repositório
// PÚBLICO. Só existem porque `seedDevUsers` se RECUSA a rodar com
// NODE_ENV=production (ADR-0011, A8 / C7). Se essa recusa cair, a senha abaixo
// vira credencial real exposta e precisa ser trocada na hora.

import type { SeedUser } from '../types.js';

/**
 * The one password for all three, decided by the Victor at the gate (P2). One
 * password rather than three because the daily friction of looking up which
 * account has which secret buys nothing in a pilot where the file is public
 * anyway.
 */
export const DEV_USER_PASSWORD = 'petdots-dev-2026';

/**
 * The three accounts that answer the question this whole task came from: "how
 * do I log in during development?"
 *
 * The `.local` domain is deliberate. It is not routable, so none of these can
 * ever collide with a real person's address, and a message sent to one of them
 * goes nowhere instead of to a stranger.
 *
 * One per role, and one of them with two roles: `lojista@` is `STORE_MEMBER`
 * *and* `TUTOR`, because the shop owner who also has a pet is the case that
 * breaks a `RolesGuard` written with equality instead of intersection
 * (DOMAIN_MODEL §Usuário; ADR-0011, R4).
 */
export const DEV_USERS: readonly SeedUser[] = [
  { email: 'tutor@dev.petdots.local', password: DEV_USER_PASSWORD, roles: ['TUTOR'] },
  {
    email: 'lojista@dev.petdots.local',
    password: DEV_USER_PASSWORD,
    roles: ['STORE_MEMBER', 'TUTOR'],
  },
  { email: 'admin@dev.petdots.local', password: DEV_USER_PASSWORD, roles: ['ADMIN'] },
];
