import { MAX_LINE_QUANTITY, MAX_ORDER_LINES } from '@petdots/domain';
import { z } from 'zod';

import { storeSummarySchema } from './stores.js';
import { addressSchema } from './tutors.js';

/**
 * The order's lifecycle (`DOMAIN_MODEL` §Pedido).
 *
 * `DELIVERED`, `REJECTED` and `CANCELLED` are terminal. The model named only
 * the first and the last; `REJECTED` is terminal for the same reason — a
 * refused order has nowhere left to go, and ADR-0014 gives every exit a
 * `Refund` rather than a way back.
 */
export const orderStatusSchema = z.enum([
  'PLACED',
  'ACCEPTED',
  'DISPATCHED',
  'DELIVERED',
  'REJECTED',
  'CANCELLED',
]);

/** How the platform got the order (ADR-0004 #7). */
export const acquisitionChannelSchema = z.enum(['PLATFORM', 'STORE_REFERRAL']);

/** What happened to one line when the store separated the order (ADR-0014 C3). */
export const itemFulfillmentSchema = z.enum(['FULFILLED', 'SUBSTITUTED', 'UNAVAILABLE']);

/**
 * Why an order was refused. ADR-0014 C2 requires telling the two apart: a store
 * that said no is a different fact — for the tutor and for us — from a store
 * that never answered.
 */
export const orderRejectionReasonSchema = z.enum(['STORE_REJECTED', 'ACCEPTANCE_EXPIRED']);

/** Why money is going back (ADR-0014 C5). */
export const refundReasonSchema = z.enum([
  'STORE_REJECTED',
  'ACCEPTANCE_EXPIRED',
  'TUTOR_CANCELLED',
  'STORE_CANCELLED',
  'ITEM_UNAVAILABLE',
]);

export const refundStatusSchema = z.enum(['PENDING', 'COMPLETED', 'FAILED']);

/**
 * One line as the client sends it: an offer and how many.
 *
 * The client never sends a price. What a cart shows is last-known information;
 * what an order is charged is decided by `POST /order-quotes` and re-decided by
 * `POST /orders` (ADR-0017) — a price in the request body would be a price the
 * customer could choose.
 */
export const orderLineInputSchema = z.object({
  offerId: z.uuid('Oferta inválida.'),
  quantity: z
    .int('Informe uma quantidade inteira.')
    .min(1, 'Quantidade mínima é 1.')
    .max(MAX_LINE_QUANTITY, `Quantidade máxima por item é ${String(MAX_LINE_QUANTITY)}.`),
});

/**
 * Body of `POST /api/v1/order-quotes` — price this cart without creating
 * anything.
 */
export const quoteOrderSchema = z.object({
  storeId: z.uuid('Loja inválida.'),
  items: z
    .array(orderLineInputSchema)
    .min(1, 'Adicione ao menos um item.')
    .max(MAX_ORDER_LINES, `Um pedido aceita até ${String(MAX_ORDER_LINES)} itens diferentes.`),
});

/**
 * Body of `POST /api/v1/orders` — the same cart, now for real.
 *
 * Identical to the quote on purpose: the idempotency key travels in the
 * `Idempotency-Key` header, not in the body, so a client that retries sends
 * byte-for-byte the same request.
 */
export const createOrderSchema = quoteOrderSchema;

/**
 * The `Idempotency-Key` header of `POST /orders`.
 *
 * Required, not optional (`MVP_SCOPE` critério de saída, `API_GUIDELINES`):
 * idempotency that a client may skip is idempotency nobody uses, and this is
 * the one route where a duplicate means a second charge.
 */
export const idempotencyKeySchema = z.uuid('Idempotency-Key deve ser um UUID.');

/**
 * One priced line of a quote. Carries no commission: the take rate is between
 * the platform and the store (`SECURITY`).
 */
export const quotedItemSchema = z.object({
  offerId: z.uuid(),
  productId: z.uuid(),
  productName: z.string(),
  productVariant: z.string(),
  unitPriceCents: z.int().positive(),
  quantity: z.int().positive(),
  lineTotalCents: z.int().positive(),
});

/**
 * What the cart costs, decided by the server and persisted nowhere.
 *
 * The journey J3 promises the tutor sees the delivery fee and the service fee
 * **before** paying. Computing that in the client would duplicate three server
 * rules — cheapest covering area, service fee, availability — and would lie the
 * moment the two disagreed.
 *
 * 🔴 A closed store is **not** an error here: the quote comes back with
 * `storeOpenNow: false` and `nextOpeningAt`, so the screen can say "abre
 * segunda às 08:00" and disable the button. Placing the order while closed *is*
 * an error (`409 STORE_CLOSED`).
 */
export const orderQuoteSchema = z.object({
  store: storeSummarySchema,
  items: z.array(quotedItemSchema),
  itemsTotalCents: z.int().nonnegative(),
  deliveryFeeCents: z.int().nonnegative(),
  serviceFeeCents: z.int().nonnegative(),
  totalCents: z.int().nonnegative(),
  deliveryArea: z.object({
    label: z.string(),
    estimatedMinutes: z.int().positive(),
  }),
  deliveryAddress: addressSchema,
  contactName: z.string(),
  contactPhone: z.string().describe('E.164.'),
  storeOpenNow: z.boolean(),
  nextOpeningAt: z.iso.datetime().nullable(),
  acceptanceWindowMinutes: z.int().positive(),
});

/**
 * One line of a placed order, as its tutor sees it.
 *
 * Deliberately **without** `categorySnapshot`, `commissionRateBpsSnapshot` and
 * `commissionAmountCents`: they are in the database, because the payout of
 * `pd-17` is computed from them, and they are none of the tutor's business.
 */
export const orderItemSchema = z.object({
  id: z.uuid(),
  productId: z.uuid(),
  productName: z.string().describe('Snapshot: o nome no momento da compra.'),
  productVariant: z.string(),
  unitPriceCents: z.int().positive(),
  quantity: z.int().positive(),
  lineTotalCents: z.int().positive(),
  fulfillment: itemFulfillmentSchema,
});

/**
 * A placed order (`GET /orders/{orderId}`).
 *
 * No `tutorId`: the order belongs to whoever holds the token, and naming the
 * owner in the response would be the identity leaking into the resource — the
 * same rule the tutor profile follows.
 */
export const orderSchema = z.object({
  id: z.uuid(),
  code: z.string().describe('Seis caracteres legíveis — o número dito ao telefone.'),
  status: orderStatusSchema,
  store: storeSummarySchema,
  items: z.array(orderItemSchema),
  itemsTotalCents: z.int().nonnegative(),
  deliveryFeeCents: z.int().nonnegative(),
  serviceFeeCents: z.int().nonnegative(),
  totalCents: z.int().nonnegative(),
  deliveryAddress: addressSchema,
  contactName: z.string(),
  contactPhone: z.string(),
  placedAt: z.iso.datetime(),
  acceptanceDeadlineAt: z.iso
    .datetime()
    .describe('Prazo de aceite, contado só em horário de funcionamento (ADR-0014 C2).'),
  acceptedAt: z.iso.datetime().nullable(),
  dispatchedAt: z.iso.datetime().nullable(),
  deliveredAt: z.iso.datetime().nullable(),
  cancelledAt: z.iso.datetime().nullable(),
  rejectedAt: z.iso.datetime().nullable(),
  rejectionReason: orderRejectionReasonSchema.nullable(),
  cancellationReason: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

/**
 * Not paginated: a tutor in the pilot has a handful of orders, and the limit is
 * natural (`API_GUIDELINES`, same reasoning as `/tutors/me/pets`). Trigger to
 * paginate: the first tutor past ~50 orders.
 */
export const orderListSchema = z.object({ items: z.array(orderSchema) });

/** Path params of `/orders/{orderId}` and its sub-resources. */
export const findOrderParamsSchema = z.object({
  orderId: z.uuid('Pedido inválido.'),
});

export type AcquisitionChannel = z.infer<typeof acquisitionChannelSchema>;
export type CreateOrder = z.infer<typeof createOrderSchema>;
export type FindOrderParams = z.infer<typeof findOrderParamsSchema>;
export type ItemFulfillment = z.infer<typeof itemFulfillmentSchema>;
export type Order = z.infer<typeof orderSchema>;
export type OrderItem = z.infer<typeof orderItemSchema>;
export type OrderLineInput = z.infer<typeof orderLineInputSchema>;
export type OrderList = z.infer<typeof orderListSchema>;
export type OrderQuote = z.infer<typeof orderQuoteSchema>;
export type OrderRejectionReason = z.infer<typeof orderRejectionReasonSchema>;
export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type QuotedItem = z.infer<typeof quotedItemSchema>;
export type QuoteOrder = z.infer<typeof quoteOrderSchema>;
export type RefundReason = z.infer<typeof refundReasonSchema>;
export type RefundStatus = z.infer<typeof refundStatusSchema>;
