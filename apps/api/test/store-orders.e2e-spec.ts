import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';

import {
  authTokensSchema,
  orderListSchema,
  orderSchema,
  storeMembershipListSchema,
  storeOfferSchema,
  storeSchema,
} from '@petdots/contracts';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import type { Response } from 'supertest';

import { ExpireOverdueOrdersUseCase } from '../src/modules/orders/application/expire-overdue-orders.use-case.js';
import { API_PREFIX } from '../src/openapi.js';
import { grantStoreMembership } from '../src/seed/store-members.js';
import { FIXTURE_SLUGS } from './support/seed-fixture.js';
import { type SeededApp, startSeededApp, stopSeededApp } from './support/seeded-app.js';

const AUTH_URL = `/${API_PREFIX}/auth`;
const TUTORS_URL = `/${API_PREFIX}/tutors`;
const ORDERS_URL = `/${API_PREFIX}/orders`;
const STORES_URL = `/${API_PREFIX}/stores`;
const MEMBERSHIPS_URL = `/${API_PREFIX}/store-memberships`;

const PASSWORD = 'petdots-dev-2026';

/** Inside store B's postal range (20720000–20729999), so B delivers. */
const PROFILE = {
  name: 'Victor',
  phone: '(21) 99999-0001',
  address: {
    street: 'Rua Dias da Cruz',
    number: '100',
    neighborhood: 'Cachambi',
    postalCode: '20720-000',
  },
};

interface ErrorEnvelope {
  error: { code: string; message: string; details: { field: string; message: string }[] };
}

/** Every body this suite sees passes through here, for the sweep at the end. */
const seen: string[] = [];

const capture = (response: Response): Response => {
  seen.push(JSON.stringify(response.body), response.text);
  return response;
};

/**
 * 🔴 The store's half of the order: the panel's API, the scope guard, and the
 * promise this whole task exists for — **an accepted order is not auto-rejected**.
 *
 * The suite is built around four accounts on purpose. The owner and the operator
 * of store B prove the ADR-0013 role split; the owner of store D proves that
 * operating *a* store is not operating *this* one; and a `STORE_MEMBER` with no
 * membership at all proves the role alone opens nothing.
 */
describe('Store orders (e2e)', () => {
  let seeded: SeededApp;
  let prisma: PrismaClient;

  /** The tutor who places every order in this suite. */
  let tokenTutor = '';
  /** Store B: the owner and the operator. */
  let tokenOwner = '';
  let tokenOperator = '';
  let userIdOwner = '';
  let userIdOperator = '';
  /** Store D: a shopkeeper of another shop. */
  let tokenOtherStore = '';
  /** `STORE_MEMBER` in the token, no row in `store_members`. */
  let tokenUnlinked = '';
  /** The owner's token **before** the membership was granted. */
  let tokenOwnerBeforeGrant = '';

  beforeAll(async () => {
    seeded = await startSeededApp();
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }),
    });

    const tutor = await register('tutor-panel@petdots.com.br');
    tokenTutor = tutor.accessToken;
    await authed(tokenTutor).put(`${TUTORS_URL}/me`, PROFILE);

    // 🔴 Registered first, linked second — which is the real onboarding order
    // (ADR-0013, B5). The token minted here has only TUTOR, and S1 asserts that
    // it is refused before the grant and accepted after a fresh login.
    const owner = await register('dona-b@petdots.com.br');
    userIdOwner = owner.userId;
    tokenOwnerBeforeGrant = owner.accessToken;

    const operator = await register('operador-b@petdots.com.br');
    userIdOperator = operator.userId;

    await register('dona-d@petdots.com.br');

    await grantStoreMembership(prisma, {
      storeSlug: FIXTURE_SLUGS.b,
      email: 'dona-b@petdots.com.br',
      role: 'OWNER',
    });
    await grantStoreMembership(prisma, {
      storeSlug: FIXTURE_SLUGS.b,
      email: 'operador-b@petdots.com.br',
      role: 'OPERATOR',
    });
    await grantStoreMembership(prisma, {
      storeSlug: FIXTURE_SLUGS.d,
      email: 'dona-d@petdots.com.br',
      role: 'OWNER',
    });

    // The role reaches the token only on a new login (or a refresh).
    tokenOwner = await login('dona-b@petdots.com.br');
    tokenOperator = await login('operador-b@petdots.com.br');
    tokenOtherStore = await login('dona-d@petdots.com.br');

    // The role by hand and no membership at all: the coarse guard says yes, the
    // fine one has to say no.
    const unlinked = await register('sem-vinculo@petdots.com.br');
    await prisma.user.update({
      where: { id: unlinked.userId },
      data: { roles: ['STORE_MEMBER'] },
    });
    tokenUnlinked = await login('sem-vinculo@petdots.com.br');
  }, 300_000);

  afterAll(async () => {
    await prisma?.$disconnect();
    await stopSeededApp(seeded);
  });

  const server = (): Server => seeded.app.getHttpServer() as Server;
  const ids = () => seeded.ids;

  async function register(email: string): Promise<{ accessToken: string; userId: string }> {
    const response = capture(
      await request(server()).post(`${AUTH_URL}/register`).send({ email, password: PASSWORD }),
    );
    const session = authTokensSchema.parse(response.body);

    return { accessToken: session.accessToken, userId: session.user.id };
  }

  async function login(email: string): Promise<string> {
    const response = capture(
      await request(server()).post(`${AUTH_URL}/login`).send({ email, password: PASSWORD }),
    );

    return authTokensSchema.parse(response.body).accessToken;
  }

  const authed = (token?: string) => ({
    get: async (path: string): Promise<Response> => send(request(server()).get(path), token),
    put: async (path: string, body: object): Promise<Response> =>
      send(request(server()).put(path).send(body), token),
    patch: async (path: string, body: object): Promise<Response> =>
      send(request(server()).patch(path).send(body), token),
    post: async (path: string, body: object = {}, idempotencyKey?: string): Promise<Response> => {
      const call = request(server()).post(path).send(body);

      return send(idempotencyKey ? call.set('Idempotency-Key', idempotencyKey) : call, token);
    },
  });

  async function send(call: request.Test, token?: string): Promise<Response> {
    return capture(await (token ? call.set('Authorization', `Bearer ${token}`) : call));
  }

  const codeOf = (response: Response): string => (response.body as ErrorEnvelope).error.code;
  const fieldsOf = (response: Response): string[] =>
    (response.body as ErrorEnvelope).error.details.map((detail) => detail.field);

  /** Two Golden and one Pipicat from store B — the cart the suite uses. */
  const cartOfB = () => ({
    storeId: ids().b,
    items: [
      { offerId: ids().offerBP1, quantity: 2 },
      { offerId: ids().offerBP4, quantity: 1 },
    ],
  });

  /** A fresh `PLACED` order of store B, and its id. */
  async function placeOrder(body: object = cartOfB()): Promise<string> {
    const response = await authed(tokenTutor).post(ORDERS_URL, body, randomUUID());

    expect(response.status).toBe(201);

    return orderSchema.parse(response.body).id;
  }

  const queueOf = (storeId: string, query = ''): string =>
    `${STORES_URL}/${storeId}/orders${query}`;
  const orderOf = (storeId: string, orderId: string): string =>
    `${STORES_URL}/${storeId}/orders/${orderId}`;

  const auditOf = async (orderId: string) =>
    prisma.auditLog.findMany({ where: { entityId: orderId }, orderBy: { createdAt: 'asc' } });
  const refundsOf = async (orderId: string) => prisma.refund.findMany({ where: { orderId } });

  // -------------------------------------------------------------- S1 · guards

  describe('S1 — the guards', () => {
    it('refuses an anonymous request to the queue', async () => {
      const response = await authed().get(queueOf(ids().b));

      expect(response.status).toBe(401);
      expect(codeOf(response)).toBe('UNAUTHENTICATED');
    });

    it('refuses a tutor: the coarse guard answers first, with the generic FORBIDDEN', async () => {
      const response = await authed(tokenTutor).get(queueOf(ids().b));

      expect(response.status).toBe(403);
      expect(codeOf(response)).toBe('FORBIDDEN');
    });

    it('🔴 refuses a STORE_MEMBER with no membership at all', async () => {
      // The whole reason the fine guard exists: the role says "some store", and
      // "some store" is not "this store".
      const response = await authed(tokenUnlinked).get(queueOf(ids().b));

      expect(response.status).toBe(403);
      expect(codeOf(response)).toBe('STORE_SCOPE_DENIED');
    });

    it('🔴 refuses the owner of another store on this store URL', async () => {
      const response = await authed(tokenOtherStore).get(queueOf(ids().b));

      expect(response.status).toBe(403);
      expect(codeOf(response)).toBe('STORE_SCOPE_DENIED');
    });

    it('says the same 403 for an insufficient role, naming no role that would work', async () => {
      const response = await authed(tokenOperator).put(`${STORES_URL}/${ids().b}/opening-hours`, {
        openingHours: [],
      });

      expect(response.status).toBe(403);
      expect(codeOf(response)).toBe('STORE_SCOPE_DENIED');
      expect(JSON.stringify(response.body)).not.toContain('OWNER');
    });

    it('🔴 refuses a storeId that is not a uuid as a 422, not a 500', async () => {
      // Guards run before pipes, so the raw parameter would otherwise reach
      // Prisma and come back as an internal error.
      const response = await authed(tokenOwner).get(queueOf('nao-e-uuid'));

      expect(response.status).toBe(422);
      expect(fieldsOf(response)).toEqual(['storeId']);
    });

    it('🔴 S1b — the account was refused before the grant and passes after it', async () => {
      // The token minted at registration carries only TUTOR: `POST /auth/register`
      // never grants STORE_MEMBER, so the link has to write the role too.
      const before = await authed(tokenOwnerBeforeGrant).get(queueOf(ids().b));

      expect(before.status).toBe(403);
      expect(codeOf(before)).toBe('FORBIDDEN');

      const after = await authed(tokenOwner).get(queueOf(ids().b));

      expect(after.status).toBe(200);
    });
  });

  // --------------------------------------------------------------- S2 · queue

  describe('S2 — the queue', () => {
    let orderId = '';

    beforeAll(async () => {
      orderId = await placeOrder();
    });

    it('lists the order waiting for the store', async () => {
      const response = await authed(tokenOwner).get(queueOf(ids().b));

      expect(response.status).toBe(200);

      const { items } = orderListSchema.parse(response.body);

      expect(items.map((order) => order.id)).toContain(orderId);
      expect(items.every((order) => order.store.id === ids().b)).toBe(true);
    });

    it('filters by a comma-separated list of statuses', async () => {
      const matching = await authed(tokenOwner).get(queueOf(ids().b, '?status=PLACED,ACCEPTED'));
      const other = await authed(tokenOwner).get(queueOf(ids().b, '?status=DELIVERED'));

      expect(orderListSchema.parse(matching.body).items.map((order) => order.id)).toContain(
        orderId,
      );
      expect(orderListSchema.parse(other.body).items.map((order) => order.id)).not.toContain(
        orderId,
      );
    });

    it('🔴 refuses an unknown status, instead of answering an empty queue', async () => {
      const response = await authed(tokenOwner).get(queueOf(ids().b, '?status=FOO'));

      expect(response.status).toBe(422);
      // `status.0`, not `status`: the filter is a list, and the envelope names
      // the entry that failed — the same shape `ORDER_ITEMS_INVALID` uses when
      // one line of a cart is wrong (`items.0.offerId`).
      expect(fieldsOf(response)).toEqual(['status.0']);
    });

    it('names the offending entry when only one of several is wrong', async () => {
      const response = await authed(tokenOwner).get(queueOf(ids().b, '?status=PLACED,FOO'));

      expect(response.status).toBe(422);
      expect(fieldsOf(response)).toEqual(['status.1']);
    });

    it("🔴 the order does not appear in the other store's queue", async () => {
      const response = await authed(tokenOtherStore).get(queueOf(ids().d));

      expect(response.status).toBe(200);
      expect(orderListSchema.parse(response.body).items.map((order) => order.id)).not.toContain(
        orderId,
      );
    });

    it('the operator sees the same queue as the owner', async () => {
      const response = await authed(tokenOperator).get(queueOf(ids().b));

      expect(response.status).toBe(200);
      expect(orderListSchema.parse(response.body).items.map((order) => order.id)).toContain(
        orderId,
      );
    });
  });

  // -------------------------------------------------------------- S3 · accept

  describe('S3 — the acceptance', () => {
    let orderId = '';

    beforeAll(async () => {
      orderId = await placeOrder();
    });

    it('accepts the order and stamps accepted_at', async () => {
      const response = await authed(tokenOwner).post(`${orderOf(ids().b, orderId)}/acceptance`);

      expect(response.status).toBe(200);

      const order = orderSchema.parse(response.body);

      expect(order.status).toBe('ACCEPTED');
      expect(order.acceptedAt).not.toBeNull();
    });

    it('writes one audit line, with the store role and no personal data', async () => {
      const lines = await auditOf(orderId);

      expect(lines).toHaveLength(1);
      expect(lines[0]).toMatchObject({
        action: 'order.accepted',
        actorKind: 'USER',
        actorUserId: userIdOwner,
        entityType: 'order',
        storeId: ids().b,
      });
      expect(lines[0]?.payload).toMatchObject({
        from: 'PLACED',
        to: 'ACCEPTED',
        storeRole: 'OWNER',
      });

      const payload = JSON.stringify(lines[0]?.payload);

      expect(payload).not.toContain(PROFILE.name);
      expect(payload).not.toContain('99999');
      expect(payload).not.toContain(PROFILE.address.street);
    });

    it('moves no money', async () => {
      expect(await refundsOf(orderId)).toHaveLength(0);
    });

    it('refuses a second acceptance as a conflict of state', async () => {
      const response = await authed(tokenOwner).post(`${orderOf(ids().b, orderId)}/acceptance`);

      expect(response.status).toBe(409);
      expect(codeOf(response)).toBe('ORDER_INVALID_TRANSITION');
    });

    it('the tutor sees ACCEPTED, and can no longer cancel', async () => {
      const read = await authed(tokenTutor).get(`${ORDERS_URL}/${orderId}`);

      expect(orderSchema.parse(read.body).status).toBe('ACCEPTED');

      const cancel = await authed(tokenTutor).post(`${ORDERS_URL}/${orderId}/cancellation`);

      expect(cancel.status).toBe(409);
    });
  });

  // ---------------------------------------------- S4 · the promise of the task

  describe('🔴 S4 — an accepted order is never auto-rejected', () => {
    let accepted = '';
    let untouched = '';

    beforeAll(async () => {
      accepted = await placeOrder();
      await authed(tokenOwner).post(`${orderOf(ids().b, accepted)}/acceptance`);

      // The control: same shop, same overdue deadline, never accepted.
      untouched = await placeOrder();

      const overdue = new Date(Date.now() - 60 * 60 * 1000);

      await prisma.order.updateMany({
        where: { id: { in: [accepted, untouched] } },
        data: { acceptanceDeadlineAt: overdue },
      });
    });

    it('the sweep leaves the accepted order alone and expires the other', async () => {
      const sweeper = seeded.app.get(ExpireOverdueOrdersUseCase);
      const { expired } = await sweeper.execute(new Date());

      // Exactly the control order. `findOverdue` filters on `status = 'PLACED'`,
      // and that filter is what this test exists to hold in place — removing it
      // is one of the red proofs.
      expect(expired).toBe(1);

      const [after, control] = await Promise.all([
        prisma.order.findUniqueOrThrow({ where: { id: accepted } }),
        prisma.order.findUniqueOrThrow({ where: { id: untouched } }),
      ]);

      expect(after.status).toBe('ACCEPTED');
      expect(control.status).toBe('REJECTED');
      expect(control.rejectionReason).toBe('ACCEPTANCE_EXPIRED');
    });

    it('the accepted order owes nothing back, and carries only the acceptance line', async () => {
      expect(await refundsOf(accepted)).toHaveLength(0);
      expect((await auditOf(accepted)).map((line) => line.action)).toEqual(['order.accepted']);
    });
  });

  // -------------------------------------------------------------- S5 · refuse

  describe('S5 — the refusal', () => {
    let orderId = '';

    beforeAll(async () => {
      orderId = await placeOrder();
    });

    it('the operator may refuse, and everything goes back', async () => {
      const response = await authed(tokenOperator).post(`${orderOf(ids().b, orderId)}/rejection`);

      expect(response.status).toBe(200);

      const order = orderSchema.parse(response.body);

      expect(order.status).toBe('REJECTED');
      expect(order.rejectionReason).toBe('STORE_REJECTED');

      const refunds = await refundsOf(orderId);

      expect(refunds).toHaveLength(1);
      expect(refunds[0]?.reason).toBe('STORE_REJECTED');
      expect(refunds[0]?.amountCents).toBe(order.totalCents);
    });

    it('the audit line says the operator did it', async () => {
      const lines = await auditOf(orderId);

      expect(lines).toHaveLength(1);
      expect(lines[0]?.action).toBe('order.rejected');
      expect(lines[0]?.actorUserId).toBe(userIdOperator);
      expect(lines[0]?.payload).toMatchObject({ storeRole: 'OPERATOR' });
    });

    it('🔴 the tutor can tell this from "nobody answered"', async () => {
      const read = await authed(tokenTutor).get(`${ORDERS_URL}/${orderId}`);
      const order = orderSchema.parse(read.body);

      expect(order.rejectionReason).toBe('STORE_REJECTED');
      expect(order.rejectionReason).not.toBe('ACCEPTANCE_EXPIRED');
    });
  });

  // -------------------------------------------- S6 · dispatch and confirmation

  describe('S6 — dispatch and delivery', () => {
    let orderId = '';

    beforeAll(async () => {
      orderId = await placeOrder();
    });

    it('refuses to dispatch an order the store has not accepted', async () => {
      const response = await authed(tokenOwner).post(`${orderOf(ids().b, orderId)}/dispatch`);

      expect(response.status).toBe(409);
      expect(codeOf(response)).toBe('ORDER_INVALID_TRANSITION');
    });

    it('refuses to confirm delivery of an order that never left', async () => {
      await authed(tokenOwner).post(`${orderOf(ids().b, orderId)}/acceptance`);

      const response = await authed(tokenOwner).post(
        `${orderOf(ids().b, orderId)}/delivery-confirmation`,
      );

      expect(response.status).toBe(409);
    });

    it('dispatches and then delivers, stamping both instants', async () => {
      const dispatched = await authed(tokenOperator).post(`${orderOf(ids().b, orderId)}/dispatch`);

      expect(dispatched.status).toBe(200);
      expect(orderSchema.parse(dispatched.body).status).toBe('DISPATCHED');

      const delivered = await authed(tokenOperator).post(
        `${orderOf(ids().b, orderId)}/delivery-confirmation`,
      );

      expect(delivered.status).toBe(200);

      const order = orderSchema.parse(delivered.body);

      expect(order.status).toBe('DELIVERED');
      expect(order.dispatchedAt).not.toBeNull();
      expect(order.deliveredAt).not.toBeNull();
    });

    it('🔴 the happy path owes nothing back, and left four audit lines', async () => {
      expect(await refundsOf(orderId)).toHaveLength(0);
      expect((await auditOf(orderId)).map((line) => line.action)).toEqual([
        'order.accepted',
        'order.dispatched',
        'order.delivered',
      ]);
    });

    it('terminal is immutable: nothing moves a DELIVERED order', async () => {
      for (const action of ['acceptance', 'rejection', 'dispatch', 'delivery-confirmation']) {
        const response = await authed(tokenOwner).post(`${orderOf(ids().b, orderId)}/${action}`);

        expect(response.status).toBe(409);
      }
    });
  });

  // -------------------------------------------------------- S7 · item missing

  describe('S7 — an item is not on the shelf', () => {
    let orderId = '';
    let firstItem = '';
    let secondItem = '';
    let totalCents = 0;

    beforeAll(async () => {
      orderId = await placeOrder();
      const accepted = await authed(tokenOwner).post(`${orderOf(ids().b, orderId)}/acceptance`);
      const order = orderSchema.parse(accepted.body);

      firstItem = order.items[0]?.id ?? '';
      secondItem = order.items[1]?.id ?? '';
      totalCents = order.totalCents;
    });

    const markUnavailable = async (itemId: string, token = tokenOperator): Promise<Response> =>
      authed(token).patch(`${orderOf(ids().b, orderId)}/items/${itemId}`, {
        fulfillment: 'UNAVAILABLE',
      });

    it('🔴 refunds only that line, and the order stays accepted', async () => {
      const response = await markUnavailable(firstItem);

      expect(response.status).toBe(200);

      const order = orderSchema.parse(response.body);

      expect(order.status).toBe('ACCEPTED');
      expect(order.items.find((item) => item.id === firstItem)?.fulfillment).toBe('UNAVAILABLE');

      const refunds = await refundsOf(orderId);

      expect(refunds).toHaveLength(1);
      expect(refunds[0]?.orderItemId).toBe(firstItem);
      // The fees stay: the trip still happens and the service was rendered
      // (ADR-0014, C6).
      expect(refunds[0]?.amountCents).toBeLessThan(totalCents);

      const [line] = await auditOf(orderId).then((lines) =>
        lines.filter((entry) => entry.action === 'order.item_unavailable'),
      );

      expect(line?.payload).toMatchObject({ orderItemId: firstItem, orderCancelled: false });
    });

    it('refuses the same line twice as a conflict of state', async () => {
      const response = await markUnavailable(firstItem);

      expect(response.status).toBe(409);
      expect(codeOf(response)).toBe('ORDER_INVALID_TRANSITION');
    });

    it('🔴 answers 404 for a line that is not in this order', async () => {
      // The distinction this pre-check exists for: a stale id is not the same
      // fact as an item that cannot move.
      const response = await markUnavailable(ids().b);

      expect(response.status).toBe(404);
      expect(codeOf(response)).toBe('ORDER_ITEM_NOT_FOUND');
    });

    it('🔴 refuses SUBSTITUTED, which has no producer', async () => {
      const response = await authed(tokenOperator).patch(
        `${orderOf(ids().b, orderId)}/items/${secondItem}`,
        { fulfillment: 'SUBSTITUTED' },
      );

      expect(response.status).toBe(422);
      expect(fieldsOf(response)).toEqual(['fulfillment']);
    });

    it('🔴 the last line cancels the order, and the second refund is the whole total', async () => {
      const response = await markUnavailable(secondItem);

      expect(response.status).toBe(200);

      const order = orderSchema.parse(response.body);

      expect(order.status).toBe('CANCELLED');
      expect(order.cancellationReason).toBe('all items unavailable');

      const refunds = await refundsOf(orderId);

      expect(refunds).toHaveLength(2);
      // Now there is no trip left to pay for, so the fees come back too.
      expect(refunds.map((refund) => refund.amountCents)).toContain(totalCents);

      const lines = (await auditOf(orderId)).filter(
        (entry) => entry.action === 'order.item_unavailable',
      );

      expect(lines[1]?.payload).toMatchObject({ orderCancelled: true });
    });

    it('refuses to mark an item of an order the store has not accepted', async () => {
      const fresh = await placeOrder();
      const read = await authed(tokenOwner).get(orderOf(ids().b, fresh));
      const item = orderSchema.parse(read.body).items[0]?.id ?? '';

      const response = await authed(tokenOwner).patch(`${orderOf(ids().b, fresh)}/items/${item}`, {
        fulfillment: 'UNAVAILABLE',
      });

      expect(response.status).toBe(409);
    });
  });

  // ------------------------------------------------------- S8 · store cancels

  describe('S8 — the store cancels after accepting', () => {
    let orderId = '';

    beforeAll(async () => {
      orderId = await placeOrder();
    });

    it('refuses a cancellation with no reason', async () => {
      const response = await authed(tokenOwner).post(`${orderOf(ids().b, orderId)}/cancellation`);

      expect(response.status).toBe(422);
      expect(fieldsOf(response)).toEqual(['reason']);
    });

    it('🔴 refuses to cancel a PLACED order — the shop refuses, it does not cancel', async () => {
      const response = await authed(tokenOwner).post(`${orderOf(ids().b, orderId)}/cancellation`, {
        reason: 'cliente ligou',
      });

      expect(response.status).toBe(409);
    });

    it('cancels an accepted order, refunds the total, and keeps the reason out of the audit', async () => {
      await authed(tokenOwner).post(`${orderOf(ids().b, orderId)}/acceptance`);

      const response = await authed(tokenOwner).post(`${orderOf(ids().b, orderId)}/cancellation`, {
        reason: 'a Maria ligou pedindo para cancelar',
      });

      expect(response.status).toBe(200);

      const order = orderSchema.parse(response.body);

      expect(order.status).toBe('CANCELLED');
      expect(order.cancellationReason).toBe('a Maria ligou pedindo para cancelar');

      const refunds = await refundsOf(orderId);

      expect(refunds).toHaveLength(1);
      expect(refunds[0]?.reason).toBe('STORE_CANCELLED');
      expect(refunds[0]?.amountCents).toBe(order.totalCents);

      // 🔴 The free-text reason may name the tutor, and `audit_log` is
      // permanent — so it lives on the order and nowhere else.
      const [line] = (await auditOf(orderId)).filter((entry) => entry.action === 'order.cancelled');

      expect(JSON.stringify(line?.payload)).not.toContain('Maria');
    });
  });

  // ------------------------------------------------------- S9 · cross-store

  describe('🔴 S9 — an order of another store, through this store URL', () => {
    let orderId = '';

    beforeAll(async () => {
      orderId = await placeOrder();
    });

    it('answers 404 to read, accept and refuse alike', async () => {
      const read = await authed(tokenOtherStore).get(orderOf(ids().d, orderId));
      const accept = await authed(tokenOtherStore).post(`${orderOf(ids().d, orderId)}/acceptance`);
      const reject = await authed(tokenOtherStore).post(`${orderOf(ids().d, orderId)}/rejection`);

      for (const response of [read, accept, reject]) {
        expect(response.status).toBe(404);
        expect(codeOf(response)).toBe('ORDER_NOT_FOUND');
      }
    });

    it('and the order was not touched', async () => {
      const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });

      expect(order.status).toBe('PLACED');
      expect(await refundsOf(orderId)).toHaveLength(0);
      expect(await auditOf(orderId)).toHaveLength(0);
    });
  });

  // ------------------------------------------------------ S10 · store roles

  describe('🔴 S10 — what the OPERATOR may not do', () => {
    const hoursUrl = () => `${STORES_URL}/${ids().b}/opening-hours`;
    const priceUrl = () => `${STORES_URL}/${ids().b}/offers/${ids().offerBP1}/price`;
    const availabilityUrl = () => `${STORES_URL}/${ids().b}/offers/${ids().offerBP1}/availability`;

    /** Restores the fixture's always-open schedule for the suites after this one. */
    const ALWAYS_OPEN = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
      weekday,
      opens: '00:00',
      closes: '24:00',
    }));

    it('the operator cannot edit the weekly schedule', async () => {
      const response = await authed(tokenOperator).put(hoursUrl(), { openingHours: ALWAYS_OPEN });

      expect(response.status).toBe(403);
      expect(codeOf(response)).toBe('STORE_SCOPE_DENIED');
    });

    it('the owner can, and the public shopfront reflects it', async () => {
      const lunchBreak = [
        { weekday: 2, opens: '08:00', closes: '12:00' },
        { weekday: 2, opens: '14:00', closes: '19:00' },
      ];

      const response = await authed(tokenOwner).put(hoursUrl(), { openingHours: lunchBreak });

      expect(response.status).toBe(200);
      expect(storeSchema.parse(response.body).openingHours).toEqual(lunchBreak);

      const publicPage = await authed().get(`${STORES_URL}/${ids().b}`);

      expect(storeSchema.parse(publicPage.body).openingHours).toEqual(lunchBreak);
    });

    it('🔴 and the deadline of an order already placed did not move', async () => {
      // The deadline is a persisted column, computed once against the schedule
      // in force at the time (ADR-0017, A12): shortening the hours must not
      // retroactively shorten a window already promised.
      const order = await prisma.order.findFirstOrThrow({
        where: { storeId: ids().b },
        orderBy: { placedAt: 'asc' },
      });
      const before = order.acceptanceDeadlineAt.toISOString();

      await authed(tokenOwner).put(hoursUrl(), {
        openingHours: [{ weekday: 3, opens: '09:00', closes: '10:00' }],
      });

      const after = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });

      expect(after.acceptanceDeadlineAt.toISOString()).toBe(before);
    });

    it('refuses two stretches of the same day that overlap', async () => {
      const response = await authed(tokenOwner).put(hoursUrl(), {
        openingHours: [
          { weekday: 2, opens: '08:00', closes: '15:00' },
          { weekday: 2, opens: '14:00', closes: '19:00' },
        ],
      });

      expect(response.status).toBe(422);
    });

    it('🔴 accepts an empty week, which fails closed: the shop stops taking orders', async () => {
      const response = await authed(tokenOwner).put(hoursUrl(), { openingHours: [] });

      expect(response.status).toBe(200);
      expect(storeSchema.parse(response.body).openingHours).toEqual([]);

      const quote = await authed(tokenTutor).post(`/${API_PREFIX}/order-quotes`, cartOfB());

      expect(quote.status).toBe(200);
      expect((quote.body as { storeOpenNow: boolean }).storeOpenNow).toBe(false);

      // Put the fixture back, or every suite after this one would be refused.
      await authed(tokenOwner).put(hoursUrl(), { openingHours: ALWAYS_OPEN });
    });

    it('the operator may say "não tenho", but not what it costs', async () => {
      const availability = await authed(tokenOperator).put(availabilityUrl(), {
        available: false,
      });

      expect(availability.status).toBe(200);
      expect(storeOfferSchema.parse(availability.body).available).toBe(false);

      const price = await authed(tokenOperator).put(priceUrl(), { priceCents: 9990 });

      expect(price.status).toBe(403);
      expect(codeOf(price)).toBe('STORE_SCOPE_DENIED');

      // Back on the shelf, so the carts of the suites after this one still work.
      await authed(tokenOperator).put(availabilityUrl(), { available: true });
    });

    it('🔴 the owner reprices, and the trail says from what to what', async () => {
      const before = await prisma.offer.findUniqueOrThrow({ where: { id: ids().offerBP1 } });

      const response = await authed(tokenOwner).put(priceUrl(), { priceCents: 4290 });

      expect(response.status).toBe(200);
      expect(storeOfferSchema.parse(response.body).priceCents).toBe(4290);

      const [line] = await prisma.auditLog.findMany({
        where: { entityId: ids().offerBP1, action: 'offer.price_changed' },
      });

      expect(line?.entityType).toBe('offer');
      expect(line?.payload).toMatchObject({
        fromPriceCents: before.priceCents,
        toPriceCents: 4290,
        storeRole: 'OWNER',
      });
    });

    it('🔴 and an order already placed keeps the price it was charged', async () => {
      // The snapshot is what makes an order an accounting record rather than a
      // view over today's shelf.
      const item = await prisma.orderItem.findFirstOrThrow({
        where: { offerId: ids().offerBP1 },
        orderBy: { createdAt: 'asc' },
      });

      expect(item.unitPriceCents).not.toBe(4290);

      // Back to the price the fixture set, for the suites that assert on it.
      await authed(tokenOwner).put(priceUrl(), { priceCents: item.unitPriceCents });
    });

    it('refuses a price of zero', async () => {
      const response = await authed(tokenOwner).put(priceUrl(), { priceCents: 0 });

      expect(response.status).toBe(422);
    });

    it("answers 404 for an offer of another store, never the other store's price", async () => {
      const response = await authed(tokenOwner).put(
        `${STORES_URL}/${ids().b}/offers/${ids().offerDP1}/price`,
        { priceCents: 1000 },
      );

      expect(response.status).toBe(404);
      expect(codeOf(response)).toBe('OFFER_NOT_FOUND');
    });
  });

  // -------------------------------------------------------- S11 · memberships

  describe('S11 — which stores do I operate', () => {
    it('answers the owner with their one store, as OWNER', async () => {
      const response = await authed(tokenOwner).get(MEMBERSHIPS_URL);

      expect(response.status).toBe(200);

      const { items } = storeMembershipListSchema.parse(response.body);

      expect(items).toHaveLength(1);
      expect(items[0]?.store.id).toBe(ids().b);
      expect(items[0]?.role).toBe('OWNER');
    });

    it('answers the operator with the same store, as OPERATOR', async () => {
      const response = await authed(tokenOperator).get(MEMBERSHIPS_URL);
      const { items } = storeMembershipListSchema.parse(response.body);

      expect(items.map((item) => [item.store.id, item.role])).toEqual([[ids().b, 'OPERATOR']]);
    });

    it('answers an empty list to a STORE_MEMBER with no store', async () => {
      const response = await authed(tokenUnlinked).get(MEMBERSHIPS_URL);

      expect(storeMembershipListSchema.parse(response.body).items).toEqual([]);
    });

    it('refuses a tutor', async () => {
      const response = await authed(tokenTutor).get(MEMBERSHIPS_URL);

      expect(response.status).toBe(403);
      expect(codeOf(response)).toBe('FORBIDDEN');
    });

    it('🔴 still lists a store that has been paused', async () => {
      // The panel is where a shop is un-paused, so hiding a paused store here
      // would lock its owner out exactly when they need to get in (ADR-0018, A8).
      await prisma.store.update({ where: { id: ids().d }, data: { status: 'PAUSED' } });

      try {
        const response = await authed(tokenOtherStore).get(MEMBERSHIPS_URL);
        const { items } = storeMembershipListSchema.parse(response.body);

        expect(items.map((item) => item.store.id)).toEqual([ids().d]);
      } finally {
        await prisma.store.update({ where: { id: ids().d }, data: { status: 'ACTIVE' } });
      }
    });
  });

  // ------------------------------------------------------- S12 · concurrency

  describe('🔴 S12 — the store accepts while the tutor cancels', () => {
    let orderId = '';

    beforeAll(async () => {
      orderId = await placeOrder();
    });

    it('produces exactly one winner', async () => {
      // Genuinely concurrent: no `await` between the two calls, or this would
      // measure nothing but the order they were written in.
      const [accept, cancel] = await Promise.all([
        authed(tokenOwner).post(`${orderOf(ids().b, orderId)}/acceptance`),
        authed(tokenTutor).post(`${ORDERS_URL}/${orderId}/cancellation`),
      ]);

      const statuses = [accept.status, cancel.status].sort((a, b) => a - b);

      expect(statuses).toEqual([200, 409]);
    });

    it('and the database agrees: one status, at most one refund, exactly one audit line', async () => {
      const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });

      expect(['ACCEPTED', 'CANCELLED']).toContain(order.status);

      const refunds = await refundsOf(orderId);
      const lines = await auditOf(orderId);

      // The loser never ran its side effects, because the compare-and-set
      // affected zero rows — which is the whole guarantee.
      expect(refunds.length).toBeLessThanOrEqual(1);
      expect(lines).toHaveLength(1);

      if (order.status === 'CANCELLED') {
        expect(refunds).toHaveLength(1);
        expect(lines[0]?.action).toBe('order.cancelled');
      } else {
        expect(refunds).toHaveLength(0);
        expect(lines[0]?.action).toBe('order.accepted');
      }
    });
  });

  // ---------------------------------------------------------- S13 · the sweep

  it('🔴 S13 — no response of the store side ever carried the commission or the tutor id', () => {
    expect(seen.length).toBeGreaterThan(40);

    const corpus = seen.join('\n');

    // What the shop **does** legitimately see is the contact and the address:
    // it has to deliver there (SECURITY §LGPD, the minimum). What it must never
    // see is the take rate, which is between the platform and the store.
    expect(corpus).not.toContain('commissionTotalCents');
    expect(corpus).not.toContain('commissionAmountCents');
    expect(corpus).not.toContain('commissionRateBps');
    expect(corpus).not.toContain('"tutorId"');
    expect(corpus).not.toContain('passwordHash');
    expect(corpus).not.toContain(PASSWORD);
  });
});
