import type { Server } from 'node:http';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  authenticatedUserSchema,
  authTokensSchema,
  petSchema,
  tutorProfileSchema,
} from '@petdots/contracts';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import type { Response } from 'supertest';

import { API_PREFIX } from '../src/openapi.js';
import { startMigratedPostgres } from './support/postgres.js';

const AUTH_URL = `/${API_PREFIX}/auth`;
const TUTORS_URL = `/${API_PREFIX}/tutors`;
const PETS_URL = `${TUTORS_URL}/me/pets`;

const PASSWORD = 'petdots-dev-2026';

const PROFILE = {
  name: 'Victor',
  phone: '(21) 99999-0001',
  address: {
    street: 'Rua Dias da Cruz',
    number: '100',
    neighborhood: 'Méier',
    postalCode: '20720-000',
  },
};

const THOR = { name: 'Thor', species: 'DOG', birthDate: '2021-03-12', weightGrams: 12_500 };

interface ErrorEnvelope {
  error: { code: string; message: string; details: { field: string; message: string }[] };
}

/** Same sweep as the identity suite: every body this suite sees passes through here. */
const seen: string[] = [];

const capture = (response: Response): Response => {
  seen.push(JSON.stringify(response.body), response.text);
  return response;
};

describe('Tutors (e2e)', () => {
  let container: StartedPostgreSqlContainer;
  let app: INestApplication;
  let prisma: PrismaClient;

  /** Tutor A and tutor B — the two accounts the ownership tests need. */
  let tokenA = '';
  let tokenB = '';
  let userIdA = '';
  let tokenAdmin = '';

  beforeAll(async () => {
    const postgres = await startMigratedPostgres();
    container = postgres.container;
    prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: postgres.url }) });

    process.env.DATABASE_URL = postgres.url;
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';

    // Same deferral as the identity suite: `ConfigModule.forRoot()` validates
    // the environment while the module file is evaluated.
    const { AppModule } = await import('../src/app.module.js');

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleRef.createNestApplication({ bufferLogs: true });
    app.setGlobalPrefix(API_PREFIX);
    await app.init();

    const a = await register('tutor-a@petdots.com.br');
    tokenA = a.accessToken;
    userIdA = a.userId;

    tokenB = (await register('tutor-b@petdots.com.br')).accessToken;
    tokenAdmin = await registerAdmin('admin@petdots.com.br');
  }, 180_000);

  afterAll(async () => {
    await prisma?.$disconnect();
    await app?.close();
    await container?.stop();
  });

  const server = (): Server => app.getHttpServer() as Server;

  async function register(email: string): Promise<{ accessToken: string; userId: string }> {
    const response = capture(
      await request(server()).post(`${AUTH_URL}/register`).send({ email, password: PASSWORD }),
    );
    const session = authTokensSchema.parse(response.body);

    return { accessToken: session.accessToken, userId: session.user.id };
  }

  /**
   * An account with `ADMIN` and **without** `TUTOR`. Registration only ever
   * hands out `TUTOR`, so the roles are replaced directly — the same thing the
   * identity suite does to build the two-role account.
   */
  async function registerAdmin(email: string): Promise<string> {
    const { userId } = await register(email);

    await prisma.user.update({ where: { id: userId }, data: { roles: ['ADMIN'] } });

    // The token carries the roles as they were at login, so it is minted after
    // the change.
    const response = capture(
      await request(server()).post(`${AUTH_URL}/login`).send({ email, password: PASSWORD }),
    );

    return authTokensSchema.parse(response.body).accessToken;
  }

  const authed = (token?: string) => ({
    get: async (path: string): Promise<Response> => send(request(server()).get(path), token),
    put: async (path: string, body: object): Promise<Response> =>
      send(request(server()).put(path).send(body), token),
    post: async (path: string, body: object): Promise<Response> =>
      send(request(server()).post(path).send(body), token),
    patch: async (path: string, body: object): Promise<Response> =>
      send(request(server()).patch(path).send(body), token),
    delete: async (path: string): Promise<Response> => send(request(server()).delete(path), token),
  });

  async function send(call: request.Test, token?: string): Promise<Response> {
    return capture(await (token ? call.set('Authorization', `Bearer ${token}`) : call));
  }

  const codeOf = (response: Response): string => (response.body as ErrorEnvelope).error.code;
  const fieldsOf = (response: Response): string[] =>
    (response.body as ErrorEnvelope).error.details.map((detail) => detail.field);

  it('T1 — GET /tutors/me refuses a request with no token', async () => {
    const response = await authed().get(`${TUTORS_URL}/me`);

    expect(response.status).toBe(401);
    expect(codeOf(response)).toBe('UNAUTHENTICATED');
  });

  it('T2 — an account with no profile yet gets 404 TUTOR_NOT_FOUND', async () => {
    // Not an error condition: registering creates a `User` and nothing else
    // (ADR-0011, A10), so this is what every account answers until it does not.
    // It is what tells the app to start the onboarding.
    const response = await authed(tokenA).get(`${TUTORS_URL}/me`);

    expect(response.status).toBe(404);
    expect(codeOf(response)).toBe('TUTOR_NOT_FOUND');
  });

  it('T3 — PUT /tutors/me saves the profile, normalising the CEP and the phone', async () => {
    const response = await authed(tokenA).put(`${TUTORS_URL}/me`, PROFILE);

    expect(response.status).toBe(200);

    const profile = tutorProfileSchema.parse(response.body);
    // Normalised in the use case, not at the border: `20720-000` and
    // `20720000` have to be one address, because the delivery areas are matched
    // against the bare digits.
    expect(profile.address.postalCode).toBe('20720000');
    expect(profile.phone).toBe('+5521999990001');
    // Left blank on the way in, `null` on the way out — never absent.
    expect(profile.address.complement).toBeNull();
    expect(profile.address.reference).toBeNull();
    expect(profile.name).toBe('Victor');
  });

  it('T3 — the phone reached the identity, so /auth/me carries it', async () => {
    // The profile form collects it and `identity` owns it: the proof that the
    // cross-module write actually landed (ADR-0015, A4).
    const response = await authed(tokenA).get(`${AUTH_URL}/me`);

    expect(response.status).toBe(200);
    expect(authenticatedUserSchema.parse(response.body).phone).toBe('+5521999990001');
  });

  it('T4 — PUT is idempotent: a second save is the same row, not a second one', async () => {
    const first = tutorProfileSchema.parse((await authed(tokenA).get(`${TUTORS_URL}/me`)).body);

    const response = await authed(tokenA).put(`${TUTORS_URL}/me`, {
      ...PROFILE,
      name: 'Victor Aguiar',
    });

    expect(response.status).toBe(200);

    const second = tutorProfileSchema.parse(response.body);
    expect(second.id).toBe(first.id);
    expect(second.name).toBe('Victor Aguiar');
    expect(await prisma.tutor.count({ where: { userId: userIdA } })).toBe(1);
  });

  it('T5 — a malformed CEP and a landline are 422, each pointing at its field', async () => {
    const badPostalCode = await authed(tokenA).put(`${TUTORS_URL}/me`, {
      ...PROFILE,
      address: { ...PROFILE.address, postalCode: '2072' },
    });

    expect(badPostalCode.status).toBe(422);
    expect(codeOf(badPostalCode)).toBe('VALIDATION_FAILED');
    // The path is nested, and the screen maps it back to the CEP field (R8).
    expect(fieldsOf(badPostalCode)).toContain('address.postalCode');

    const landline = await authed(tokenA).put(`${TUTORS_URL}/me`, {
      ...PROFILE,
      phone: '2133334444',
    });

    expect(landline.status).toBe(422);
    expect(fieldsOf(landline)).toContain('phone');
  });

  it('T6 🔴 — an ADMIN without the TUTOR role is forbidden', async () => {
    // The first real `@Roles()` check in the API. The account authenticates
    // perfectly well; what it lacks is the role, so the answer is 403 and not
    // 401 — and it names no role that would have worked (ERROR_MODEL).
    const read = await authed(tokenAdmin).get(`${TUTORS_URL}/me`);
    const write = await authed(tokenAdmin).put(`${TUTORS_URL}/me`, PROFILE);

    expect(read.status).toBe(403);
    expect(write.status).toBe(403);
    expect(codeOf(write)).toBe('FORBIDDEN');
  });

  it('T7 — registering a pet with no profile yet is 404 TUTOR_NOT_FOUND', async () => {
    // A pet hangs off the `Tutor`, not off the `User`. Distinct from
    // PET_NOT_FOUND because the app reacts differently: this one means
    // "finish the onboarding first".
    const response = await authed(tokenB).post(PETS_URL, THOR);

    expect(response.status).toBe(404);
    expect(codeOf(response)).toBe('TUTOR_NOT_FOUND');
  });

  it('T8 — POST /tutors/me/pets creates the pet, with Location and an exact birth date', async () => {
    const response = await authed(tokenA).post(PETS_URL, THOR);

    expect(response.status).toBe(201);

    const pet = petSchema.parse(response.body);
    expect(response.headers.location).toBe(`/${API_PREFIX}/tutors/me/pets/${pet.id}`);
    expect(pet.name).toBe('Thor');
    expect(pet.weightGrams).toBe(12_500);
    // 🔴 The round trip through `@db.Date` is exact. Building the column in the
    // local zone would store — and read back — 11/03 for anyone west of
    // Greenwich (R1).
    expect(pet.birthDate).toBe('2021-03-12');
  });

  it('T9 — refuses an impossible weight, an unknown species and a birth date in the future', async () => {
    const zeroWeight = await authed(tokenA).post(PETS_URL, { ...THOR, weightGrams: 0 });
    expect(zeroWeight.status).toBe(422);
    expect(fieldsOf(zeroWeight)).toContain('weightGrams');

    const bird = await authed(tokenA).post(PETS_URL, { ...THOR, species: 'BIRD' });
    expect(bird.status).toBe(422);
    expect(fieldsOf(bird)).toContain('species');

    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    const unborn = await authed(tokenA).post(PETS_URL, { ...THOR, birthDate: tomorrow });
    expect(unborn.status).toBe(422);
    expect(fieldsOf(unborn)).toContain('birthDate');
  });

  it('T9 — a pet whose birth date nobody knows is accepted, and reads back null', async () => {
    const { birthDate: _birthDate, ...withoutBirthDate } = THOR;

    const response = await authed(tokenA).post(PETS_URL, {
      ...withoutBirthDate,
      name: 'Sem data',
    });

    expect(response.status).toBe(201);
    expect(petSchema.parse(response.body).birthDate).toBeNull();

    // Housekeeping: the ownership tests below count on A having exactly Thor.
    await prisma.pet.delete({ where: { id: petSchema.parse(response.body).id } });
  });

  it('T10 — each tutor lists their own pets and nobody else’s', async () => {
    const mine = await authed(tokenA).get(PETS_URL);

    expect(mine.status).toBe(200);
    expect((mine.body as { items: unknown[] }).items).toHaveLength(1);

    // B now has a profile, and therefore a list — an empty one.
    expect(
      (await authed(tokenB).put(`${TUTORS_URL}/me`, { ...PROFILE, phone: '(21) 98888-0002' }))
        .status,
    ).toBe(200);

    const theirs = await authed(tokenB).get(PETS_URL);
    expect(theirs.status).toBe(200);
    expect((theirs.body as { items: unknown[] }).items).toEqual([]);
  });

  it('T11 🔴 — tutor B cannot read, edit or delete tutor A’s pet: 404 on all three', async () => {
    // The first ownership test of the API, and the pattern `orders` copies.
    // 404 and not 403 on purpose: 403 would confirm the id is real and belongs
    // to someone, which is the fact a stranger must not be able to probe for.
    const thor = onlyPetOf(await authed(tokenA).get(PETS_URL));
    const url = `${PETS_URL}/${thor.id}`;

    const read = await authed(tokenB).get(url);
    const edit = await authed(tokenB).patch(url, { weightGrams: 1_000 });
    const remove = await authed(tokenB).delete(url);

    for (const response of [read, edit, remove]) {
      expect(response.status).toBe(404);
      expect(codeOf(response)).toBe('PET_NOT_FOUND');
    }

    // And the attempt changed nothing: the refusal is not a silent no-op that
    // happened to have already written.
    const afterwards = await authed(tokenA).get(url);
    expect(afterwards.status).toBe(200);
    expect(petSchema.parse(afterwards.body).weightGrams).toBe(12_500);
  });

  it('T12 — PATCH changes only what it carries, and an empty body is refused', async () => {
    const thor = onlyPetOf(await authed(tokenA).get(PETS_URL));

    const response = await authed(tokenA).patch(`${PETS_URL}/${thor.id}`, {
      weightGrams: 13_000,
    });

    expect(response.status).toBe(200);

    const updated = petSchema.parse(response.body);
    expect(updated.weightGrams).toBe(13_000);
    expect(updated.name).toBe('Thor');
    expect(updated.birthDate).toBe('2021-03-12');

    const empty = await authed(tokenA).patch(`${PETS_URL}/${thor.id}`, {});
    expect(empty.status).toBe(422);
  });

  it('T13 — DELETE answers 204, and the pet is gone for good', async () => {
    const thor = onlyPetOf(await authed(tokenA).get(PETS_URL));
    const url = `${PETS_URL}/${thor.id}`;

    expect((await authed(tokenA).delete(url)).status).toBe(204);
    expect((await authed(tokenA).get(url)).status).toBe(404);
    // Deleting twice is a 404, unlike logout: there is nothing to hide from the
    // owner, who knows perfectly well they just deleted it.
    expect((await authed(tokenA).delete(url)).status).toBe(404);
  });

  describe('T14 — the constraints are the rules', () => {
    it('refuses a second tutor profile for the same user', async () => {
      // This is what makes `PUT /tutors/me` an upsert with nothing to
      // reconcile. Written through Prisma directly, because the route can no
      // longer produce the attempt.
      await expect(
        prisma.tutor.create({
          data: {
            userId: userIdA,
            name: 'Segundo perfil',
            street: 'Rua Dias da Cruz',
            streetNumber: '100',
            neighborhood: 'Méier',
            postalCode: '20720000',
          },
        }),
      ).rejects.toMatchObject({ code: 'P2002' });
    });

    it('refuses a pet of zero grams', async () => {
      const tutor = await prisma.tutor.findUniqueOrThrow({ where: { userId: userIdA } });

      await expect(
        prisma.pet.create({
          data: { tutorId: tutor.id, name: 'Fantasma', species: 'DOG', weightGrams: 0 },
        }),
      ).rejects.toThrow();
    });

    it('refuses a CEP that is eight characters but not eight digits', async () => {
      const { userId } = await register('tutor-cep@petdots.com.br');

      await expect(
        prisma.tutor.create({
          data: {
            userId,
            name: 'CEP torto',
            street: 'Rua Dias da Cruz',
            streetNumber: '100',
            neighborhood: 'Méier',
            // CHAR(8) accepts this happily; the check constraint is what makes
            // the column mean "a CEP" rather than "eight characters".
            postalCode: '2072-000',
          },
        }),
      ).rejects.toThrow();
    });
  });

  it('🔴 no response of this module ever carried the password or its hash', () => {
    // Runs last: every request above pushed its raw body here. This module is
    // the first that writes the personal data of a person outside the team, so
    // the sweep also checks that a profile response never drags the identity
    // along with it.
    expect(seen.length).toBeGreaterThan(20);

    const corpus = seen.join('\n');

    expect(corpus).not.toContain('passwordHash');
    expect(corpus).not.toContain('password_hash');
    expect(corpus).not.toContain('$argon2');
    expect(corpus).not.toContain(PASSWORD);
    // The profile belongs to a tutor, and the tutor's response has no business
    // naming the identity behind it.
    expect(corpus).not.toContain('"userId"');
    expect(corpus).not.toContain('"tutorId"');
  });
});

/**
 * The single pet tutor A has at this point in the suite. Raising instead of
 * returning `undefined` keeps a bookkeeping mistake in the fixtures from
 * reading as a passing ownership test.
 */
function onlyPetOf(response: Response): { id: string } {
  const [pet] = (response.body as { items: { id: string }[] }).items;

  if (!pet) {
    throw new Error('expected the tutor to have exactly one pet at this point');
  }

  return pet;
}
