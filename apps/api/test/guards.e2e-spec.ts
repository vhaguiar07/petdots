import type { Server } from 'node:http';

import { Controller, Get, type INestApplication, Req, UseGuards } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import type { UserRole } from '@petdots/contracts';
import request from 'supertest';

import { HttpExceptionFilter } from '../src/common/http-exception.filter.js';
import type { AuthenticatedRequest } from '../src/common/guards/authenticated-request.js';
import { AuthGuard } from '../src/common/guards/auth.guard.js';
import { Public } from '../src/common/guards/public.decorator.js';
import { Roles } from '../src/common/guards/roles.decorator.js';
import { RolesGuard } from '../src/common/guards/roles.guard.js';

const SECRET = 'guard-suite-signing-key-not-a-secret';
const OTHER_SECRET = 'someone-elses-signing-key-not-a-secret';

const TUTOR_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

/**
 * Exercises the guards against a throwaway controller rather than a real
 * endpoint, because there is no authenticated endpoint yet: the guards ship
 * available and proven, and the first route that needs them applies them
 * (ADR-0011, passo 11).
 */
@Controller('guarded')
class GuardedController {
  @Get('any-user')
  @UseGuards(AuthGuard)
  whoAmI(@Req() request: AuthenticatedRequest): { id: string; roles: UserRole[] } {
    // Proves the guard populates the request, not merely that it lets the call
    // through: everything downstream will read `request.user`.
    const { user } = request;

    return { id: user?.id ?? '', roles: user?.roles ?? [] };
  }

  @Get('admins-only')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  adminsOnly(): { ok: true } {
    return { ok: true };
  }

  @Get('shop-side')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('STORE_MEMBER', 'ADMIN')
  shopSide(): { ok: true } {
    return { ok: true };
  }

  @Get('open')
  @UseGuards(AuthGuard)
  @Public()
  open(): { ok: true } {
    return { ok: true };
  }
}

interface ErrorEnvelope {
  error: { code: string; message: string };
}

describe('Guards (e2e)', () => {
  let app: INestApplication;
  let jwt: JwtService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: SECRET, signOptions: { expiresIn: '15m' } })],
      controllers: [GuardedController],
      providers: [{ provide: APP_FILTER, useClass: HttpExceptionFilter }],
    }).compile();

    app = moduleRef.createNestApplication({ bufferLogs: true });
    await app.init();

    jwt = app.get(JwtService);
  });

  afterAll(async () => {
    await app?.close();
  });

  const server = (): Server => app.getHttpServer() as Server;

  const tokenFor = (roles: UserRole[], sub = TUTOR_ID): Promise<string> =>
    jwt.signAsync({ sub, roles });

  describe('AuthGuard', () => {
    it('C8 — refuses a request with no Authorization header', async () => {
      const response = await request(server()).get('/guarded/any-user');

      expect(response.status).toBe(401);

      const { error } = response.body as ErrorEnvelope;
      expect(error.code).toBe('UNAUTHENTICATED');
    });

    it('C8 — accepts a valid Bearer token and publishes the caller', async () => {
      const response = await request(server())
        .get('/guarded/any-user')
        .set('Authorization', `Bearer ${await tokenFor(['TUTOR'])}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ id: TUTOR_ID, roles: ['TUTOR'] });
    });

    it('refuses the token without the Bearer scheme', async () => {
      const token = await tokenFor(['TUTOR']);

      expect(
        (await request(server()).get('/guarded/any-user').set('Authorization', token)).status,
      ).toBe(401);
      expect(
        (await request(server()).get('/guarded/any-user').set('Authorization', `Basic ${token}`))
          .status,
      ).toBe(401);
    });

    it('refuses a token signed with someone else’s key', async () => {
      const forged = new JwtService({ secret: OTHER_SECRET }).sign({
        sub: TUTOR_ID,
        roles: ['ADMIN'],
      });

      expect(
        (await request(server()).get('/guarded/any-user').set('Authorization', `Bearer ${forged}`))
          .status,
      ).toBe(401);
    });

    it('refuses an expired token', async () => {
      const expired = await jwt.signAsync(
        { sub: TUTOR_ID, roles: ['TUTOR'] },
        { expiresIn: '-1s' },
      );

      expect(
        (await request(server()).get('/guarded/any-user').set('Authorization', `Bearer ${expired}`))
          .status,
      ).toBe(401);
    });

    it('🔴 refuses a correctly signed token whose claims are not ours', async () => {
      // Authenticity is not enough: a token signed with the right key but
      // shaped differently would otherwise flow into `request.user` and be
      // believed by every guard downstream.
      const cases = [
        { sub: TUTOR_ID },
        { sub: TUTOR_ID, roles: 'ADMIN' },
        { sub: TUTOR_ID, roles: [] },
        { sub: TUTOR_ID, roles: ['SUPERUSER'] },
        { sub: 'nao-e-uuid', roles: ['TUTOR'] },
        { roles: ['ADMIN'] },
      ];

      for (const claims of cases) {
        const response = await request(server())
          .get('/guarded/any-user')
          .set('Authorization', `Bearer ${await jwt.signAsync(claims)}`);

        expect(response.status).toBe(401);
      }
    });

    it('lets a @Public() route through with no token', async () => {
      expect((await request(server()).get('/guarded/open')).status).toBe(200);
    });
  });

  describe('RolesGuard', () => {
    it('C9 — refuses a TUTOR on an @Roles(ADMIN) route', async () => {
      const response = await request(server())
        .get('/guarded/admins-only')
        .set('Authorization', `Bearer ${await tokenFor(['TUTOR'])}`);

      expect(response.status).toBe(403);

      const { error } = response.body as ErrorEnvelope;
      expect(error.code).toBe('FORBIDDEN');
      // The message must not list the roles that would have worked: that is a
      // map of the API's privilege model.
      expect(error.message).not.toContain('ADMIN');
    });

    it('C9 — accepts an ADMIN on the same route', async () => {
      expect(
        (
          await request(server())
            .get('/guarded/admins-only')
            .set('Authorization', `Bearer ${await tokenFor(['ADMIN'])}`)
        ).status,
      ).toBe(200);
    });

    it('C9 🔴 — intersects instead of comparing: two roles pass a one-role gate', async () => {
      // The shop owner who also has a pet. Equality — or reading only the first
      // entry — would lock this person out of half the product (R4).
      const bothRoles = await tokenFor(['TUTOR', 'STORE_MEMBER']);

      expect(
        (
          await request(server())
            .get('/guarded/shop-side')
            .set('Authorization', `Bearer ${bothRoles}`)
        ).status,
      ).toBe(200);

      // ...and still cannot reach what neither role allows.
      expect(
        (
          await request(server())
            .get('/guarded/admins-only')
            .set('Authorization', `Bearer ${bothRoles}`)
        ).status,
      ).toBe(403);
    });

    it('answers 401, not 403, when there is no caller at all', async () => {
      // AuthGuard runs first: an anonymous request is unauthenticated before it
      // is unauthorised, and saying 403 would confirm the route exists for
      // somebody.
      expect((await request(server()).get('/guarded/admins-only')).status).toBe(401);
    });
  });
});
