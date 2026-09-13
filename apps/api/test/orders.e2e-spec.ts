import type { Server } from 'node:http';
import { randomUUID } from 'node:crypto';

import {
  authTokensSchema,
  orderListSchema,
  orderQuoteSchema,
  orderSchema,
} from '@petdots/contracts';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import type { Response } from 'supertest';

import { ExpireOverdueOrdersUseCase } from '../src/modules/orders/application/expire-overdue-orders.use-case.js';
import { API_PREFIX } from '../src/openapi.js';
import { type SeededApp, startSeededApp, stopSeededApp } from './support/seeded-app.js';

const AUTH_URL = `/${API_PREFIX}/auth`;
const TUTORS_URL = `/${API_PREFIX}/tutors`;
const ORDERS_URL = `/${API_PREFIX}/orders`;
const QUOTES_URL = `/${API_PREFIX}/order-quotes`;

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

/** Outside B's range and outside every neighbourhood it names. */
const OUT_OF_AREA_ADDRESS = {
  street: 'Rua Clarimundo de Melo',
  number: '50',
  neighborhood: 'Piedade',
  postalCode: '20740-000',
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

describe('Orders (e2e)', () => {
  let seeded: SeededApp;
  let prisma: PrismaClient;

  /** Tutor A places the orders; tutor B is the stranger; C has no profile. */
  let tokenA = '';
  let tokenB = '';
  let tokenC = '';
  let tokenAdmin = '';
  let userIdA = '';

  beforeAll(async () => {
    seeded = await startSeededApp();
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }),
    });

    const a = await register('tutor-a@petdots.com.br');
    tokenA = a.accessToken;
    userIdA = a.userId;
    await authed(tokenA).put(`${TUTORS_URL}/me`, PROFILE);

    tokenB = (await register('tutor-b@petdots.com.br')).accessToken;
    await authed(tokenB).put(`${TUTORS_URL}/me`, { ...PROFILE, name: 'Bruna' });

    // No profile on purpose: the account exists, the onboarding does not.
    tokenC = (await register('tutor-c@petdots.com.br')).accessToken;
    tokenAdmin = await registerAdmin('admin-orders@petdots.com.br');
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

  async function registerAdmin(email: string): Promise<string> {
    const { userId } = await register(email);

    await prisma.user.update({ where: { id: userId }, data: { roles: ['ADMIN'] } });

    const response = capture(
      await request(server()).post(`${AUTH_URL}/login`).send({ email, password: PASSWORD }),
    );

    return authTokensSchema.parse(response.body).accessToken;
  }

  const authed = (token?: string) => ({
    get: async (path: string): Promise<Response> => send(request(server()).get(path), token),
    put: async (path: string, body: object): Promise<Response> =>
      send(request(server()).put(path).send(body), token),
    post: async (path: string, body: object, idempotencyKey?: string): Promise<Response> => {
      const call = request(server()).post(path).send(body);

      return send(idempotencyKey ? call.set('Idempotency-Key', idempotencyKey) : call, token);
    },
    postRaw: async (path: string, body: object, header: string): Promise<Response> =>
      send(request(server()).post(path).send(body).set('Idempotency-Key', header), token),
  });

  async function send(call: request.Test, token?: string): Promise<Response> {
    return capture(await (token ? call.set('Authorization', `Bearer ${token}`) : call));
  }

  const codeOf = (response: Response): string => (response.body as ErrorEnvelope).error.code;
  const fieldsOf = (response: Response): string[] =>
    (response.body as ErrorEnvelope).error.details.map((detail) => detail.field);

  /** Two Golden and one Pipicat from store B — the cart the whole suite uses. */
  const cartOfB = () => ({
    storeId: ids().b,
    items: [
      { offerId: ids().offerBP1, quantity: 2 },
      { offerId: ids().offerBP4, quantity: 1 },
    ],
  });

  const placeOrder = async (token: string, body: object = cartOfB()): Promise<Response> =>
    authed(token).post(ORDERS_URL, body, randomUUID());

  // ---------------------------------------------------------------- O1 · guards

  it('O1 — the quote refuses an anonymous request, and a role that is not TUTOR', async () => {
    const anonymous = await authed().post(QUOTES_URL, cartOfB());
    expect(anonymous.status).toBe(401);
    expect(codeOf(anonymous)).toBe('UNAUTHENTICATED');

    const admin = await authed(tokenAdmin).post(QUOTES_URL, cartOfB());
    expect(admin.status).toBe(403);
  });

  // ------------------------------------------------------------- O2 · the quote

  it('O2 — prices the cart, and never mentions the commission', async () => {
    const response = await authed(tokenA).post(QUOTES_URL, cartOfB());

    expect(response.status).toBe(200);

    const quote = orderQuoteSchema.parse(response.body);

    // 2 × 3790 + 1690
    expect(quote.itemsTotalCents).toBe(9270);
    expect(quote.deliveryFeeCents).toBe(490);
    expect(quote.serviceFeeCents).toBe(199);
    expect(quote.totalCents).toBe(9270 + 490 + 199);
    expect(quote.deliveryArea.label).toBe('Faixa de CEP do Cachambi');
    expect(quote.deliveryArea.estimatedMinutes).toBe(60);
    expect(quote.storeOpenNow).toBe(true);
    expect(quote.acceptanceWindowMinutes).toBe(15);
    expect(quote.contactPhone).toBe('+5521999990001');
    expect(quote.deliveryAddress.postalCode).toBe('20720000');

    // 🔴 The take rate is between the platform and the store (SECURITY). Not one
    // of these may appear in a tutor's response.
    expect(response.body).not.toHaveProperty('commissionTotalCents');
    for (const item of quote.items) {
      expect(item).not.toHaveProperty('commissionAmountCents');
      expect(item).not.toHaveProperty('commissionRateBps');
    }
  });

  it('O2 — the quote persists nothing', async () => {
    const before = await prisma.order.count();

    await authed(tokenA).post(QUOTES_URL, cartOfB());

    expect(await prisma.order.count()).toBe(before);
  });

  // -------------------------------------------------------- O3 · idempotency key

  it('🔴 O3 — POST /orders without Idempotency-Key is a 422 naming the header', async () => {
    const response = await authed(tokenA).post(ORDERS_URL, cartOfB());

    expect(response.status).toBe(422);
    expect(codeOf(response)).toBe('VALIDATION_FAILED');
    expect(fieldsOf(response)).toContain('Idempotency-Key');
  });

  it('O3 — a key that is not a UUID is refused the same way', async () => {
    const response = await authed(tokenA).postRaw(ORDERS_URL, cartOfB(), 'nao-e-uuid');

    expect(response.status).toBe(422);
    expect(fieldsOf(response)).toContain('Idempotency-Key');
  });

  // ------------------------------------------------------------ O4 · the order

  it('O4 — creates the order, with Location, the snapshot and the deadline', async () => {
    const key = randomUUID();
    const response = await authed(tokenA).post(ORDERS_URL, cartOfB(), key);

    expect(response.status).toBe(201);

    const order = orderSchema.parse(response.body);

    expect(response.headers.location).toBe(`/${API_PREFIX}/orders/${order.id}`);
    expect(order.status).toBe('PLACED');
    expect(order.code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
    expect(order.totalCents).toBe(9959);

    // The fixture store is always open, so the clock never pauses: the deadline
    // is exactly the window after the order.
    const elapsed =
      new Date(order.acceptanceDeadlineAt).getTime() - new Date(order.placedAt).getTime();
    expect(elapsed).toBe(15 * 60 * 1000);

    // The snapshot of what was bought, not a join to what exists now.
    const golden = order.items.find((item) => item.productId === ids().p1);
    expect(golden?.productName).toBe('Golden Ração Cães Adultos');
    expect(golden?.productVariant).toBe('15 kg');
    expect(golden?.unitPriceCents).toBe(3790);
    expect(golden?.lineTotalCents).toBe(7580);
    expect(golden?.fulfillment).toBe('FULFILLED');

    // 🔴 In the database: the founder tariff of store B on premium food (500),
    // and the table rate for hygiene (800).
    const rows = await prisma.orderItem.findMany({ where: { orderId: order.id } });
    const premium = rows.find((row) => row.categorySnapshot === 'FOOD_PREMIUM');
    const hygiene = rows.find((row) => row.categorySnapshot === 'HYGIENE');

    expect(premium?.commissionRateBpsSnapshot).toBe(500);
    expect(premium?.commissionAmountCents).toBe(379);
    expect(hygiene?.commissionRateBpsSnapshot).toBe(800);
    expect(hygiene?.commissionAmountCents).toBe(135);

    const row = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(row.commissionTotalCents).toBe(514);
    expect(row.acquisitionChannel).toBe('PLATFORM');
    expect(row.idempotencyKey).toBe(key);
  });

  // ----------------------------------------------------------- O5 · idempotency

  it('🔴 O5 — replaying the same key gives back the same order, not a second one', async () => {
    const key = randomUUID();

    const first = await authed(tokenA).post(ORDERS_URL, cartOfB(), key);
    const second = await authed(tokenA).post(ORDERS_URL, cartOfB(), key);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);

    const firstOrder = orderSchema.parse(first.body);
    const secondOrder = orderSchema.parse(second.body);

    expect(secondOrder.id).toBe(firstOrder.id);
    expect(secondOrder.code).toBe(firstOrder.code);
    expect(await prisma.order.count({ where: { idempotencyKey: key } })).toBe(1);
  });

  it('🔴 O5 — two requests racing on the same key still create one order', async () => {
    // 🔴 The sentinel of the **unique index**, and the only one that is. The
    // sequential replay above never reaches it: the application's own lookup
    // answers first, so dropping the index leaves that test green. What the
    // index protects is exactly this — two requests whose lookups both miss,
    // which is what a double-tap on a bad connection produces. The loser gets
    // the unique violation, re-reads, and answers with the winner's order.
    const key = randomUUID();

    const [first, second] = await Promise.all([
      authed(tokenA).post(ORDERS_URL, cartOfB(), key),
      authed(tokenA).post(ORDERS_URL, cartOfB(), key),
    ]);

    expect([first.status, second.status]).toEqual([201, 201]);
    expect(orderSchema.parse(second.body).id).toBe(orderSchema.parse(first.body).id);
    expect(await prisma.order.count({ where: { idempotencyKey: key } })).toBe(1);
  });

  it('O5 — a different key is a different order', async () => {
    const first = orderSchema.parse((await placeOrder(tokenA)).body);
    const second = orderSchema.parse((await placeOrder(tokenA)).body);

    expect(second.id).not.toBe(first.id);
  });

  // -------------------------------------------------------------- O6 · snapshot

  it('🔴 O6 — changing the price and the commission table never moves a placed order', async () => {
    const order = orderSchema.parse((await placeOrder(tokenA)).body);
    const itemsBefore = await prisma.orderItem.findMany({ where: { orderId: order.id } });

    await prisma.offer.update({ where: { id: ids().offerBP1 }, data: { priceCents: 9999 } });
    await prisma.commissionRate.updateMany({
      where: { category: 'HYGIENE' },
      data: { rateBps: 1500 },
    });

    try {
      const reread = orderSchema.parse(
        (await authed(tokenA).get(`${ORDERS_URL}/${order.id}`)).body,
      );

      expect(reread.items.find((item) => item.productId === ids().p1)?.unitPriceCents).toBe(3790);
      expect(reread.itemsTotalCents).toBe(9270);
      expect(reread.totalCents).toBe(9959);

      const itemsAfter = await prisma.orderItem.findMany({
        where: { orderId: order.id },
        orderBy: { id: 'asc' },
      });

      expect(itemsAfter.map((item) => item.commissionRateBpsSnapshot).sort()).toEqual(
        itemsBefore.map((item) => item.commissionRateBpsSnapshot).sort(),
      );
      expect(itemsAfter.map((item) => item.commissionAmountCents).sort()).toEqual(
        itemsBefore.map((item) => item.commissionAmountCents).sort(),
      );
    } finally {
      // Put the fixture back: every later test prices against these numbers.
      await prisma.offer.update({ where: { id: ids().offerBP1 }, data: { priceCents: 3790 } });
      await prisma.commissionRate.updateMany({
        where: { category: 'HYGIENE' },
        data: { rateBps: 800 },
      });
    }
  });

  // ----------------------------------------------------------- O7 · closed store

  it('🔴 O7 — a closed store quotes at 200 and refuses the order at 409', async () => {
    const cart = { storeId: ids().d, items: [{ offerId: ids().offerDP1, quantity: 1 }] };

    const quote = await authed(tokenA).post(QUOTES_URL, cart);
    expect(quote.status).toBe(200);

    const parsed = orderQuoteSchema.parse(quote.body);
    expect(parsed.storeOpenNow).toBe(false);
    expect(parsed.nextOpeningAt).not.toBeNull();
    // The quote still prices the cart: the screen needs the total to show it
    // greyed out, not an error it has to translate back into a sentence.
    expect(parsed.itemsTotalCents).toBe(3890);

    const order = await placeOrder(tokenA, cart);
    expect(order.status).toBe(409);
    expect(codeOf(order)).toBe('STORE_CLOSED');
    // The refusal says when it opens — "está fechada" alone sends the person
    // back to guess.
    expect((order.body as ErrorEnvelope).error.message).toMatch(/Abre /);
  });

  // ------------------------------------------------------- O8 · store status

  it('O8 — a PROSPECT store is 409, a PAUSED store is 404', async () => {
    const prospect = await placeOrder(tokenA, {
      storeId: ids().a,
      items: [{ offerId: ids().offerAP1, quantity: 1 }],
    });

    expect(prospect.status).toBe(409);
    expect(codeOf(prospect)).toBe('STORE_NOT_ACTIVE');

    // A paused store is invisible everywhere, including here (pd-13, A15).
    const paused = await placeOrder(tokenA, {
      storeId: ids().c,
      items: [{ offerId: ids().offerBP1, quantity: 1 }],
    });

    expect(paused.status).toBe(404);
    expect(codeOf(paused)).toBe('STORE_NOT_FOUND');
  });

  // --------------------------------------------------------------- O9 · items

  it('🔴 O9 — unavailable is 409, and not-of-this-store is 422 naming the line', async () => {
    // Store A's P4 offer exists and is off the shelf. A is PROSPECT, so the
    // status check would mask this one — the quote is asked of store A through
    // its own id to reach the offer rule, and answers the store rule first.
    const unavailable = await authed(tokenA).post(QUOTES_URL, {
      storeId: ids().a,
      items: [{ offerId: ids().offerAP4Unavailable, quantity: 1 }],
    });

    expect(unavailable.status).toBe(409);
    expect(codeOf(unavailable)).toBe('STORE_NOT_ACTIVE');

    // An offer of store A sent to store B: different stores, so B does not have
    // it — `422`, with the index of the offending line.
    const otherStore = await placeOrder(tokenA, {
      storeId: ids().b,
      items: [{ offerId: ids().offerAP1, quantity: 1 }],
    });

    expect(otherStore.status).toBe(422);
    expect(codeOf(otherStore)).toBe('ORDER_ITEMS_INVALID');
    expect(fieldsOf(otherStore)).toEqual(['items.0.offerId']);

    const unknown = await placeOrder(tokenA, {
      storeId: ids().b,
      items: [{ offerId: randomUUID(), quantity: 1 }],
    });

    expect(unknown.status).toBe(422);
    expect(codeOf(unknown)).toBe('ORDER_ITEMS_INVALID');
  });

  it('O9 — the same offer twice is refused, with the second line named', async () => {
    const duplicated = await placeOrder(tokenA, {
      storeId: ids().b,
      items: [
        { offerId: ids().offerBP1, quantity: 1 },
        { offerId: ids().offerBP1, quantity: 1 },
      ],
    });

    expect(duplicated.status).toBe(422);
    expect(codeOf(duplicated)).toBe('ORDER_ITEMS_INVALID');
    expect(fieldsOf(duplicated)).toEqual(['items.1.offerId']);
  });

  // ------------------------------------------------------ O10 · delivery area

  it('O10 — an address outside every area of the store is 422', async () => {
    const moved = await register('tutor-fora@petdots.com.br');
    await authed(moved.accessToken).put(`${TUTORS_URL}/me`, {
      ...PROFILE,
      name: 'Fora da Área',
      address: OUT_OF_AREA_ADDRESS,
    });

    const response = await placeOrder(moved.accessToken);

    expect(response.status).toBe(422);
    expect(codeOf(response)).toBe('ADDRESS_OUT_OF_DELIVERY_AREA');
  });

  // --------------------------------------------------------- O11 · no profile

  it('O11 — an account with no profile is told to finish signing up, not that it failed', async () => {
    const response = await placeOrder(tokenC);

    expect(response.status).toBe(409);
    expect(codeOf(response)).toBe('TUTOR_PROFILE_REQUIRED');
  });

  it('O11 — and its order list is empty rather than an error', async () => {
    const response = await authed(tokenC).get(ORDERS_URL);

    expect(response.status).toBe(200);
    expect(orderListSchema.parse(response.body).items).toEqual([]);
  });

  // ----------------------------------------------------------- O12 · ownership

  it('🔴 O12 — tutor B cannot read or cancel tutor A’s order, and it stays untouched', async () => {
    const order = orderSchema.parse((await placeOrder(tokenA)).body);

    const read = await authed(tokenB).get(`${ORDERS_URL}/${order.id}`);
    expect(read.status).toBe(404);
    expect(codeOf(read)).toBe('ORDER_NOT_FOUND');

    const cancel = await authed(tokenB).post(`${ORDERS_URL}/${order.id}/cancellation`, {});
    expect(cancel.status).toBe(404);
    expect(codeOf(cancel)).toBe('ORDER_NOT_FOUND');

    // 🔴 The half that separates "was refused" from "refused after writing".
    const row = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(row.status).toBe('PLACED');
    expect(row.cancelledAt).toBeNull();
    expect(await prisma.refund.count({ where: { orderId: order.id } })).toBe(0);

    const listOfB = orderListSchema.parse((await authed(tokenB).get(ORDERS_URL)).body);
    expect(listOfB.items.map((item) => item.id)).not.toContain(order.id);
  });

  // -------------------------------------------------------- O13 · cancellation

  it('🔴 O13 — the tutor cancels: refund and audit line, in one transaction', async () => {
    const order = orderSchema.parse((await placeOrder(tokenA)).body);

    const response = await authed(tokenA).post(`${ORDERS_URL}/${order.id}/cancellation`, {});
    expect(response.status).toBe(200);

    const cancelled = orderSchema.parse(response.body);
    expect(cancelled.status).toBe('CANCELLED');
    expect(cancelled.cancelledAt).not.toBeNull();

    const refunds = await prisma.refund.findMany({ where: { orderId: order.id } });
    expect(refunds).toHaveLength(1);
    expect(refunds[0]?.reason).toBe('TUTOR_CANCELLED');
    expect(refunds[0]?.amountCents).toBe(order.totalCents);
    expect(refunds[0]?.status).toBe('PENDING');
    // No PSP yet: the row records what is owed, not what was sent (pd-17).
    expect(refunds[0]?.paymentId).toBeNull();

    const audit = await prisma.auditLog.findMany({ where: { entityId: order.id } });
    expect(audit).toHaveLength(1);
    expect(audit[0]?.actorKind).toBe('USER');
    expect(audit[0]?.actorUserId).toBe(userIdA);
    expect(audit[0]?.action).toBe('order.cancelled');
    expect(audit[0]?.storeId).toBe(ids().b);

    // 🔴 The payload carries ids, states and amounts — never the person.
    const payload = JSON.stringify(audit[0]?.payload);
    expect(payload).toContain('PLACED');
    expect(payload).toContain('CANCELLED');
    expect(payload).not.toContain('Victor');
    expect(payload).not.toContain('999990001');
    expect(payload).not.toContain('Dias da Cruz');
    expect(payload).not.toContain('20720000');
  });

  it('🔴 O13 — two cancellations racing produce one refund, not two', async () => {
    // 🔴 This is the sentinel of the **compare-and-set**, and nothing else in
    // the suite is. Cancelling twice in sequence is caught by the domain (the
    // second read already says CANCELLED), and the sweeper is serialised by the
    // advisory lock — so in both of those the conditional `UPDATE` is a second
    // line of defence that never gets exercised. Two requests arriving together
    // is the case where it is the *only* defence: both read `PLACED`, both pass
    // the domain, and both reach the write.
    const order = orderSchema.parse((await placeOrder(tokenA)).body);

    const [first, second] = await Promise.all([
      authed(tokenA).post(`${ORDERS_URL}/${order.id}/cancellation`, {}),
      authed(tokenA).post(`${ORDERS_URL}/${order.id}/cancellation`, {}),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([200, 409]);

    // The part that costs money if the condition is dropped.
    expect(await prisma.refund.count({ where: { orderId: order.id } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { entityId: order.id } })).toBe(1);
  });

  it('O13 — cancelling twice is a conflict, not a second refund', async () => {
    const order = orderSchema.parse((await placeOrder(tokenA)).body);

    expect((await authed(tokenA).post(`${ORDERS_URL}/${order.id}/cancellation`, {})).status).toBe(
      200,
    );

    const again = await authed(tokenA).post(`${ORDERS_URL}/${order.id}/cancellation`, {});
    expect(again.status).toBe(409);
    expect(codeOf(again)).toBe('ORDER_INVALID_TRANSITION');

    expect(await prisma.refund.count({ where: { orderId: order.id } })).toBe(1);
  });

  // ------------------------------------------------------------ O14 · the job

  it('🔴 O14 — two concurrent sweeps produce one rejection, one refund, one audit line', async () => {
    const order = orderSchema.parse((await placeOrder(tokenA)).body);
    const untouched = orderSchema.parse((await placeOrder(tokenA)).body);

    // Only the first order's window has run out.
    await prisma.order.update({
      where: { id: order.id },
      data: { acceptanceDeadlineAt: new Date(Date.now() - 60_000) },
    });

    const sweeper = seeded.app.get(ExpireOverdueOrdersUseCase);
    const now = new Date();

    const [first, second] = await Promise.all([sweeper.execute(now), sweeper.execute(now)]);

    // One of the two did the work; the other found the lock taken or the order
    // already moved. Either way the total is one.
    expect(first.expired + second.expired).toBe(1);

    const row = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(row.status).toBe('REJECTED');
    expect(row.rejectionReason).toBe('ACCEPTANCE_EXPIRED');
    expect(row.rejectedAt).not.toBeNull();

    const refunds = await prisma.refund.findMany({ where: { orderId: order.id } });
    expect(refunds).toHaveLength(1);
    expect(refunds[0]?.reason).toBe('ACCEPTANCE_EXPIRED');
    expect(refunds[0]?.amountCents).toBe(order.totalCents);

    const audit = await prisma.auditLog.findMany({ where: { entityId: order.id } });
    expect(audit).toHaveLength(1);
    // 🔴 The system acting on a clock: no user, and no request behind it. This
    // is the refusal an HTTP interceptor could never have seen (ADR-0017).
    expect(audit[0]?.actorKind).toBe('SYSTEM');
    expect(audit[0]?.actorUserId).toBeNull();
    expect(audit[0]?.requestId).toBeNull();
    expect(audit[0]?.action).toBe('order.rejected');

    // A third pass finds nothing, and the order still in its window is untouched.
    expect((await sweeper.execute(new Date())).expired).toBe(0);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: untouched.id } })).status).toBe(
      'PLACED',
    );
  });

  it('O14 — an expired order can no longer be cancelled by its tutor', async () => {
    const order = orderSchema.parse((await placeOrder(tokenA)).body);

    await prisma.order.update({
      where: { id: order.id },
      data: { acceptanceDeadlineAt: new Date(Date.now() - 60_000) },
    });
    await seeded.app.get(ExpireOverdueOrdersUseCase).execute(new Date());

    const response = await authed(tokenA).post(`${ORDERS_URL}/${order.id}/cancellation`, {});

    expect(response.status).toBe(409);
    expect(codeOf(response)).toBe('ORDER_INVALID_TRANSITION');
    expect(await prisma.refund.count({ where: { orderId: order.id } })).toBe(1);
  });

  // ----------------------------------------------------------- O15 · the list

  it('O15 — the list is the caller’s own orders, newest first', async () => {
    const response = await authed(tokenA).get(ORDERS_URL);

    expect(response.status).toBe(200);

    const list = orderListSchema.parse(response.body);
    expect(list.items.length).toBeGreaterThan(1);

    const placedAt = list.items.map((item) => new Date(item.placedAt).getTime());
    expect([...placedAt].sort((a, b) => b - a)).toEqual(placedAt);

    for (const item of list.items) {
      expect(item.store.id).toBeTruthy();
      expect(item).not.toHaveProperty('tutorId');
    }
  });

  it('O15 — a brand-new tutor sees an empty list', async () => {
    const fresh = await register('tutor-novo@petdots.com.br');
    await authed(fresh.accessToken).put(`${TUTORS_URL}/me`, { ...PROFILE, name: 'Novo' });

    expect(
      orderListSchema.parse((await authed(fresh.accessToken).get(ORDERS_URL)).body).items,
    ).toEqual([]);
  });

  // ------------------------------------------------------- O16 · the constraints

  describe('O16 — the database sustains the invariants the code computes', () => {
    let tutorId = '';

    beforeAll(async () => {
      tutorId = (await prisma.tutor.findFirstOrThrow({ where: { userId: userIdA } })).id;
    });

    const validOrder = () => ({
      code: randomUUID().slice(0, 6).toUpperCase(),
      tutorId,
      storeId: seeded.ids.b,
      idempotencyKey: randomUUID(),
      contactName: 'Sentinela',
      contactPhone: '+5521999990001',
      deliveryAddress: {},
      itemsTotalCents: 1000,
      deliveryFeeCents: 490,
      serviceFeeCents: 199,
      totalCents: 1689,
      commissionTotalCents: 60,
      placedAt: new Date(),
      acceptanceDeadlineAt: new Date(),
    });

    it('🔴 refuses a total that is not items plus delivery plus service', async () => {
      // The most-cited invariant of the DOMAIN_MODEL, and this is what holds it
      // for a row written by a seed, a script or prisma studio.
      await expect(
        prisma.order.create({ data: { ...validOrder(), totalCents: 9999 } }),
      ).rejects.toThrow(/orders_total_cents_check/);
    });

    it('refuses a negative fee', async () => {
      await expect(
        prisma.order.create({
          data: { ...validOrder(), deliveryFeeCents: -490, totalCents: 709 },
        }),
      ).rejects.toThrow(/orders_delivery_fee_cents_check/);
    });

    it('🔴 refuses a line of zero units', async () => {
      const order = await prisma.order.create({ data: validOrder() });

      await expect(
        prisma.orderItem.create({
          data: {
            orderId: order.id,
            productId: seeded.ids.p1,
            offerId: seeded.ids.offerBP1,
            productNameSnapshot: 'Sentinela',
            productVariantSnapshot: '15 kg',
            categorySnapshot: 'FOOD_PREMIUM',
            unitPriceCents: 3790,
            quantity: 0,
            commissionRateBpsSnapshot: 500,
            commissionAmountCents: 0,
          },
        }),
      ).rejects.toThrow(/order_items_quantity_check/);
    });

    it('🔴 refuses a second order with the same readable code', async () => {
      const first = await prisma.order.create({ data: validOrder() });

      await expect(
        prisma.order.create({ data: { ...validOrder(), code: first.code } }),
      ).rejects.toThrow(/Unique constraint|P2002/);
    });

    it('🔴 refuses the same idempotency key twice for one tutor', async () => {
      const first = await prisma.order.create({ data: validOrder() });

      await expect(
        prisma.order.create({ data: { ...validOrder(), idempotencyKey: first.idempotencyKey } }),
      ).rejects.toThrow(/Unique constraint|P2002/);
    });

    it('refuses a refund of nothing', async () => {
      const order = await prisma.order.create({ data: validOrder() });

      await expect(
        prisma.refund.create({
          data: { orderId: order.id, reason: 'TUTOR_CANCELLED', amountCents: 0 },
        }),
      ).rejects.toThrow(/refunds_amount_cents_check/);
    });

    it('refuses a commission rate above 100%', async () => {
      await expect(
        prisma.commissionRate.create({
          data: { category: 'ACCESSORY', rateBps: 10_001, validFrom: new Date('2030-01-01') },
        }),
      ).rejects.toThrow(/commission_rates_rate_bps_check/);
    });

    it('refuses a schedule that is not a JSON array', async () => {
      await expect(
        prisma.$executeRawUnsafe(
          `UPDATE stores SET opening_hours = '{"weekday":1}'::jsonb WHERE id = $1`,
          seeded.ids.b,
        ),
      ).rejects.toThrow(/stores_opening_hours_check/);
    });
  });

  // ------------------------------------------------------------- the PII sweep

  it('🔴 no response of this module ever carried the commission or the tutor id', () => {
    // Runs last: every request above pushed its raw body here. The tutor's own
    // name and address *do* belong in their own order; what must never appear
    // is the take rate (it is between the platform and the store) or the
    // identity behind the order.
    expect(seen.length).toBeGreaterThan(40);

    const corpus = seen.join('\n');

    expect(corpus).not.toContain('commissionTotalCents');
    expect(corpus).not.toContain('commissionAmountCents');
    expect(corpus).not.toContain('commissionRateBps');
    expect(corpus).not.toContain('"tutorId"');
    expect(corpus).not.toContain('passwordHash');
    expect(corpus).not.toContain(PASSWORD);
  });
});
