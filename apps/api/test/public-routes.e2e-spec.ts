import type { Server } from 'node:http';

import request from 'supertest';

import { API_PREFIX } from '../src/openapi.js';
import { type SeededApp, startSeededApp, stopSeededApp } from './support/seeded-app.js';

/**
 * 🔴 The net under the guard inversion (pd-13, C2).
 *
 * Since the guards became global (`APP_GUARD` in `IdentityModule`), every route
 * of this API is closed unless it carries `@Public()`. That is the desired
 * default — but the cost of getting it wrong is not a 500 somebody notices, it
 * is the **public comparator answering 401 to every visitor**, which is exactly
 * the regression ADR-0011 refused to risk when it left the guards per-route.
 *
 * So the assertion here is not "these routes work". It is **"none of these
 * routes ever answers 401 without an Authorization header"** — the one status
 * that would mean a `@Public()` went missing. What each route replies beyond
 * that is its own suite's business.
 */
describe('Public routes (e2e)', () => {
  let seeded: SeededApp;

  beforeAll(async () => {
    seeded = await startSeededApp();
  }, 180_000);

  afterAll(async () => {
    await stopSeededApp(seeded);
  });

  const server = (): Server => seeded.app.getHttpServer() as Server;
  const url = (path: string): string => `/${API_PREFIX}${path}`;

  it('answers every open GET with no token at all', async () => {
    const routes: { path: string; query?: Record<string, string>; expected: number }[] = [
      { path: '/health', expected: 200 },
      { path: '/products', expected: 200 },
      { path: `/products/${seeded.ids.p1}`, expected: 200 },
      { path: '/delivery-areas', expected: 200 },
      { path: '/offers', query: { productId: seeded.ids.p1 }, expected: 200 },
      { path: `/stores/${seeded.ids.a}`, expected: 200 },
      { path: `/stores/${seeded.ids.a}/offers`, expected: 200 },
    ];

    for (const route of routes) {
      const response = await request(server())
        .get(url(route.path))
        .query(route.query ?? {});

      expect({ path: route.path, status: response.status }).toEqual({
        path: route.path,
        status: route.expected,
      });
    }
  });

  it('answers the open POSTs without a token — a validation error, never a 401', async () => {
    // A deliberately invalid body: the point is *which* refusal comes back. A
    // 422 proves the request reached the handler; a 401 would mean the guard
    // stopped it at the door.
    const waitlist = await request(server()).post(url('/waitlist-entries')).send({});
    expect(waitlist.status).toBe(422);

    // `login` and `refresh` are asked with a body their schema refuses, on
    // purpose: a 401 from these routes would be ambiguous — it is also what a
    // wrong password answers. A 422 can only come from the handler, so it is
    // the one status that proves the guard let the request through.
    const login = await request(server()).post(url('/auth/login')).send({ email: 'x' });
    expect(login.status).toBe(422);

    const refresh = await request(server()).post(url('/auth/refresh')).send({});
    expect(refresh.status).toBe(422);

    const register = await request(server()).post(url('/auth/register')).send({});
    expect(register.status).toBe(422);

    // Logout answers 204 for anything, by design — including with no session.
    expect(
      (await request(server()).post(url('/auth/logout')).send({ refreshToken: 'nada' })).status,
    ).toBe(204);
  });

  it('🔴 keeps the closed routes closed — the inversion has to cut both ways', async () => {
    // Without this, a `@Public()` accidentally placed on a controller class
    // would make every assertion above pass while opening the routes that must
    // stay shut. `/tutors/*` joined the list in pd-14: they are the first
    // routes that read and write the personal data of a person outside the
    // team, so an accidental `@Public()` there is the expensive one.
    for (const path of [
      '/auth/me',
      '/tutors/me',
      '/tutors/me/pets',
      // pd-14: um endpoint aberto que repassa um parâmetro de caminho para um
      // terceiro é um proxy que qualquer um aponta para ele, no nosso IP.
      '/postal-codes/20720000',
    ]) {
      expect({ path, status: (await request(server()).get(url(path))).status }).toEqual({
        path,
        status: 401,
      });
    }
  });
});
