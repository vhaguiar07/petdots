import type { Server } from 'node:http';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { authenticatedUserSchema, authTokensSchema } from '@petdots/contracts';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import type { Response } from 'supertest';

import { API_PREFIX } from '../src/openapi.js';
import { startMigratedPostgres } from './support/postgres.js';

const AUTH_URL = `/${API_PREFIX}/auth`;

const CREDENTIALS = { email: 'Victor@PetDots.com.br', password: 'petdots-dev-2026' };

interface ErrorEnvelope {
  error: { code: string; message: string; details: { field: string; message: string }[] };
}

/**
 * 🔴 Every response this suite sees passes through here.
 *
 * C6 is a sweep, not a spot check: the assertion is not "the register response
 * has no hash" but "no response of this module ever carried one". Collecting
 * the raw bodies as they go by is what makes a leak introduced later — a new
 * field, a spread of the row, an error that echoes the record — fail a test
 * nobody has to remember to write.
 */
const seen: string[] = [];

const capture = (response: Response): Response => {
  seen.push(JSON.stringify(response.body), response.text);
  return response;
};

describe('Identity (e2e)', () => {
  let container: StartedPostgreSqlContainer;
  let app: INestApplication;
  let prisma: PrismaClient;

  beforeAll(async () => {
    const postgres = await startMigratedPostgres();
    container = postgres.container;
    prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: postgres.url }) });

    process.env.DATABASE_URL = postgres.url;
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';

    // Same deferral as the waitlist suite: `ConfigModule.forRoot()` validates
    // the environment while the module file is evaluated.
    const { AppModule } = await import('../src/app.module.js');

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleRef.createNestApplication({ bufferLogs: true });
    app.setGlobalPrefix(API_PREFIX);
    await app.init();
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await app?.close();
    await container?.stop();
  });

  const server = (): Server => app.getHttpServer() as Server;

  const register = async (body: object): Promise<Response> =>
    capture(await request(server()).post(`${AUTH_URL}/register`).send(body));

  const login = async (body: object): Promise<Response> =>
    capture(await request(server()).post(`${AUTH_URL}/login`).send(body));

  const refresh = async (refreshToken: string): Promise<Response> =>
    capture(await request(server()).post(`${AUTH_URL}/refresh`).send({ refreshToken }));

  const logout = async (refreshToken: string): Promise<Response> =>
    capture(await request(server()).post(`${AUTH_URL}/logout`).send({ refreshToken }));

  const me = async (accessToken?: string): Promise<Response> => {
    const call = request(server()).get(`${AUTH_URL}/me`);

    return capture(await (accessToken ? call.set('Authorization', `Bearer ${accessToken}`) : call));
  };

  it('C1 — registers a user and hands back a session', async () => {
    const response = await register(CREDENTIALS);

    expect(response.status).toBe(201);

    const body = authTokensSchema.parse(response.body);
    expect(body.accessToken).toEqual(expect.any(String));
    expect(body.refreshToken).toEqual(expect.any(String));
    expect(body.expiresIn).toBeGreaterThan(0);

    // Normalised on the way in, so the account is the person and not the
    // spelling.
    expect(body.user.email).toBe('victor@petdots.com.br');
    // The role is decided by the server: registration is an open endpoint.
    expect(body.user.roles).toEqual(['TUTOR']);
    // Registration still creates a `User` and nothing else (ADR-0011, A10):
    // the phone arrives later, with the tutor profile (pd-14).
    expect(body.user.phone).toBeNull();
  });

  it('C1 — stores an argon2 hash, never the password', async () => {
    const stored = await prisma.user.findUniqueOrThrow({
      where: { email: 'victor@petdots.com.br' },
    });

    expect(stored.passwordHash).toMatch(/^\$argon2/);
    expect(stored.passwordHash).not.toContain(CREDENTIALS.password);
  });

  it('C2 — refuses a second registration for the same e-mail', async () => {
    // Differently spelled on purpose: the unique index and the check constraint
    // together are what make one person one account.
    const response = await register({ ...CREDENTIALS, email: 'VICTOR@petdots.com.br' });

    expect(response.status).toBe(409);

    const { error } = response.body as ErrorEnvelope;
    expect(error.code).toBe('EMAIL_ALREADY_REGISTERED');
  });

  it('C3 — logs in with the right password', async () => {
    const response = await login(CREDENTIALS);

    expect(response.status).toBe(200);
    expect(authTokensSchema.parse(response.body).user.email).toBe('victor@petdots.com.br');
  });

  it('C3 🔴 — a wrong password and an unknown e-mail answer identically', async () => {
    // The sentinel of the whole module: any difference here is an oracle for
    // "this address has an account", which on a neighbourhood platform is the
    // personal data itself (ADR-0011, A/step 9).
    const wrongPassword = await login({ ...CREDENTIALS, password: 'senha-errada-porem-longa' });
    const unknownEmail = await login({
      email: 'ninguem@petdots.com.br',
      password: CREDENTIALS.password,
    });
    const malformedEmail = await login({ email: 'nem-e-email', password: CREDENTIALS.password });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(malformedEmail.status).toBe(401);

    // `requestId` is the one field that legitimately differs.
    const shape = (response: Response): unknown => {
      const { error } = response.body as ErrorEnvelope & { error: { requestId?: string } };
      const { requestId: _ignored, ...rest } = error;
      return rest;
    };

    expect(shape(wrongPassword)).toEqual(shape(unknownEmail));
    expect(shape(malformedEmail)).toEqual(shape(unknownEmail));
    expect(shape(unknownEmail)).toEqual({
      code: 'UNAUTHENTICATED',
      message: 'E-mail ou senha inválidos.',
      details: [],
    });
  });

  it('C4 — refresh rotates: the token presented stops working', async () => {
    const first = authTokensSchema.parse((await login(CREDENTIALS)).body);

    const rotated = await refresh(first.refreshToken);
    expect(rotated.status).toBe(200);

    const second = authTokensSchema.parse(rotated.body);
    expect(second.refreshToken).not.toBe(first.refreshToken);

    // Replaying the burnt token fails — this is what makes a stolen copy
    // worthless after the legitimate client next renews.
    const replay = await refresh(first.refreshToken);
    expect(replay.status).toBe(401);
    expect((replay.body as ErrorEnvelope).error.code).toBe('UNAUTHENTICATED');

    // And the new one still works.
    expect((await refresh(second.refreshToken)).status).toBe(200);
  });

  it('C4 — refuses a refresh token nobody ever issued', async () => {
    expect((await refresh('nao-existe-este-token')).status).toBe(401);
  });

  it('C5 — logout revokes: the refresh token dies with the session', async () => {
    const session = authTokensSchema.parse((await login(CREDENTIALS)).body);

    const response = await logout(session.refreshToken);
    expect(response.status).toBe(204);

    expect((await refresh(session.refreshToken)).status).toBe(401);
  });

  it('C5 — logging out twice is not an error and says nothing', async () => {
    const session = authTokensSchema.parse((await login(CREDENTIALS)).body);

    expect((await logout(session.refreshToken)).status).toBe(204);
    // Idempotent, and a token nobody ever issued gets the same answer — a 404
    // would confirm which strings are real tokens.
    expect((await logout(session.refreshToken)).status).toBe(204);
    expect((await logout('nunca-foi-um-token')).status).toBe(204);
  });

  it('logging out of one session leaves the others alone', async () => {
    const phone = authTokensSchema.parse((await login(CREDENTIALS)).body);
    const laptop = authTokensSchema.parse((await login(CREDENTIALS)).body);

    expect((await logout(phone.refreshToken)).status).toBe(204);

    // Closing a browser tab must not log the person out of their phone.
    expect((await refresh(laptop.refreshToken)).status).toBe(200);
  });

  it('refuses a password below the policy, pointing at the field', async () => {
    const response = await register({ email: 'curto@petdots.com.br', password: 'curta' });

    expect(response.status).toBe(422);

    const { error } = response.body as ErrorEnvelope;
    expect(error.code).toBe('VALIDATION_FAILED');
    expect(error.details.map((detail) => detail.field)).toContain('password');
  });

  it('🔴 refuses a registration that asks for its own roles', async () => {
    // Privilege escalation attempt: the body is not where roles come from.
    const response = await register({
      email: 'escalada@petdots.com.br',
      password: 'petdots-dev-2026',
      roles: ['ADMIN'],
    });

    expect(response.status).toBe(201);

    const stored = await prisma.user.findUniqueOrThrow({
      where: { email: 'escalada@petdots.com.br' },
    });

    expect(stored.roles).toEqual(['TUTOR']);
  });

  it('C1 — /auth/me refuses a request with no token', async () => {
    const response = await me();

    expect(response.status).toBe(401);
    expect((response.body as ErrorEnvelope).error.code).toBe('UNAUTHENTICATED');
  });

  it('C1 — /auth/me answers the identity behind the token, roles and all', async () => {
    // The shop owner who also has a pet: the account whose two roles are the
    // reason `roles` is a list at all (ADR-0011, R4). Granted here directly
    // because registration never hands out anything but TUTOR.
    await prisma.user.update({
      where: { email: 'victor@petdots.com.br' },
      data: { roles: ['STORE_MEMBER', 'TUTOR'] },
    });

    const session = authTokensSchema.parse((await login(CREDENTIALS)).body);
    const response = await me(session.accessToken);

    expect(response.status).toBe(200);

    const body = authenticatedUserSchema.parse(response.body);
    expect(body.email).toBe('victor@petdots.com.br');
    expect([...body.roles].sort()).toEqual(['STORE_MEMBER', 'TUTOR']);
    expect(body.id).toBe(session.user.id);
    // Nobody has written a phone for this account; the field exists and is null
    // rather than absent, so the client never has to tell the two apart.
    expect(body.phone).toBeNull();
  });

  it('C1 🔴 — /auth/me re-reads the row: a deleted user gets 401, not their old claims', async () => {
    // The token still verifies — it is a fifteen-minute-old copy. Trusting its
    // claims instead of the table is what would keep a closed account alive.
    const response = await register({
      email: 'apagado@petdots.com.br',
      password: 'petdots-dev-2026',
    });
    const session = authTokensSchema.parse(response.body);

    expect((await me(session.accessToken)).status).toBe(200);

    await prisma.user.delete({ where: { email: 'apagado@petdots.com.br' } });

    const afterDeletion = await me(session.accessToken);
    expect(afterDeletion.status).toBe(401);
    expect((afterDeletion.body as ErrorEnvelope).error.code).toBe('UNAUTHENTICATED');
  });

  it('C6 🔴 — no response of this module ever carried the password or its hash', () => {
    // Runs last on purpose: every request above pushed its raw body here.
    expect(seen.length).toBeGreaterThan(15);

    const corpus = seen.join('\n');

    expect(corpus).not.toContain('passwordHash');
    expect(corpus).not.toContain('password_hash');
    expect(corpus).not.toContain('$argon2');
    expect(corpus).not.toContain(CREDENTIALS.password);
  });
});
