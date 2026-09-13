import {
  type CreateStoreOffer,
  type OpeningHours,
  orderListSchema,
  orderSchema,
  storeMembershipListSchema,
  storeOfferListSchema,
  storeOfferSchema,
  storeSchema,
  type OrderStatus,
} from '@petdots/contracts';

import type { HttpClient } from './http';

/** Every call here is the store's own data, so every one of them sends the token. */
const AUTHED = { auth: true } as const;

/**
 * The panel's front door: which stores does this account operate, and in what
 * capacity?
 *
 * ⚠️ It includes **paused** stores. The comparator hides those from visitors;
 * their owner still has to reach the panel, which is where a shop is un-paused.
 */
export function listMyStoreMemberships(http: HttpClient, signal?: AbortSignal) {
  return http
    .getJson('/store-memberships', undefined, { ...AUTHED, signal })
    .then((body) => storeMembershipListSchema.parse(body).items);
}

/**
 * The store's queue. Without `statuses` it answers everything, which is what
 * the panel asks for — the grouping into "waiting / accepted / out for delivery"
 * is a pure function on the client, so it can be tested without a server.
 */
export function listStoreOrders(
  http: HttpClient,
  storeId: string,
  statuses?: readonly OrderStatus[],
  signal?: AbortSignal,
) {
  return http
    .getJson(
      `/stores/${storeId}/orders`,
      { status: statuses?.length ? statuses.join(',') : undefined },
      { ...AUTHED, signal },
    )
    .then((body) => orderListSchema.parse(body).items);
}

export function findStoreOrder(
  http: HttpClient,
  storeId: string,
  orderId: string,
  signal?: AbortSignal,
) {
  return http
    .getJson(`/stores/${storeId}/orders/${orderId}`, undefined, { ...AUTHED, signal })
    .then((body) => orderSchema.parse(body));
}

/**
 * The five transitions, all shaped the same: a noun sub-resource, `200`, and the
 * order in its new state — so a screen can replace what it is showing with what
 * came back instead of refetching.
 */
const transition = (http: HttpClient, storeId: string, orderId: string, action: string) =>
  http
    .postJson(`/stores/${storeId}/orders/${orderId}/${action}`, {}, AUTHED)
    .then((body) => orderSchema.parse(body));

export const acceptStoreOrder = (http: HttpClient, storeId: string, orderId: string) =>
  transition(http, storeId, orderId, 'acceptance');

export const rejectStoreOrder = (http: HttpClient, storeId: string, orderId: string) =>
  transition(http, storeId, orderId, 'rejection');

export const dispatchStoreOrder = (http: HttpClient, storeId: string, orderId: string) =>
  transition(http, storeId, orderId, 'dispatch');

export const confirmStoreDelivery = (http: HttpClient, storeId: string, orderId: string) =>
  transition(http, storeId, orderId, 'delivery-confirmation');

/** The reason is required: this is the side with something to explain. */
export function cancelStoreOrder(
  http: HttpClient,
  storeId: string,
  orderId: string,
  reason: string,
) {
  return http
    .postJson(`/stores/${storeId}/orders/${orderId}/cancellation`, { reason }, AUTHED)
    .then((body) => orderSchema.parse(body));
}

/** The one column of a line the store ever writes (ADR-0014, C3). */
export function markStoreOrderItemUnavailable(
  http: HttpClient,
  storeId: string,
  orderId: string,
  orderItemId: string,
) {
  return http
    .patchJson(
      `/stores/${storeId}/orders/${orderId}/items/${orderItemId}`,
      { fulfillment: 'UNAVAILABLE' },
      AUTHED,
    )
    .then((body) => orderSchema.parse(body));
}

/** The whole week at once — `OWNER` only, and the API says so with a `403`. */
export function updateOpeningHours(http: HttpClient, storeId: string, openingHours: OpeningHours) {
  return http
    .putJson(`/stores/${storeId}/opening-hours`, { openingHours }, AUTHED)
    .then((body) => storeSchema.parse(body));
}

/**
 * The whole shelf, switched-off rows included.
 *
 * The **public** shelf route with `?unavailable=true`: a price is public — it is
 * the product — and an unavailable offer is only the shop saying "não tenho".
 * So this one call is not authenticated, unlike the writes below.
 */
export function listStoreOffersForPanel(http: HttpClient, storeId: string, signal?: AbortSignal) {
  return http
    .getJson(`/stores/${storeId}/offers`, { unavailable: 'true' }, { signal })
    .then((body) => storeOfferListSchema.parse(body).items);
}

/** `OWNER` only: the margin is a commercial decision (ADR-0013 §permissões). */
export function updateOfferPrice(
  http: HttpClient,
  storeId: string,
  offerId: string,
  priceCents: number,
) {
  return http
    .putJson(`/stores/${storeId}/offers/${offerId}/price`, { priceCents }, AUTHED)
    .then((body) => storeOfferSchema.parse(body));
}

/** Either role: whether something is in stock is what the counter knows. */
export function updateOfferAvailability(
  http: HttpClient,
  storeId: string,
  offerId: string,
  available: boolean,
) {
  return http
    .putJson(`/stores/${storeId}/offers/${offerId}/availability`, { available }, AUTHED)
    .then((body) => storeOfferSchema.parse(body));
}

/** "Tenho isso" — a catalogue product joins the shelf. `OWNER` only. */
export function createStoreOffer(http: HttpClient, storeId: string, body: CreateStoreOffer) {
  return http
    .postJson(`/stores/${storeId}/offers`, body, AUTHED)
    .then((it) => storeOfferSchema.parse(it));
}
