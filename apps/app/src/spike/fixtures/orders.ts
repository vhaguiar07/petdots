import { applyBasisPoints } from '@petdots/domain';

import { PRODUCTS, STORES } from './catalog';
import { OFFERS } from './offers';
import type { Order, OrderItem, OrderStatus, ProductCategory } from './types';

/** Commission table by category (ADR-0003), in integer basis points. */
const COMMISSION_BPS: Record<ProductCategory, number> = {
  FOOD_STANDARD: 500,
  FOOD_PREMIUM: 600,
  TREAT: 900,
  HYGIENE: 800,
  HEALTH_OTC: 700,
  ACCESSORY: 1_000,
};

const TUTOR_NAMES = [
  'Aline Ferraz',
  'Bruno Sampaio',
  'Carla Nogueira',
  'Daniel Rocha',
  'Elis Carvalho',
  'Fábio Medeiros',
  'Gisele Andrade',
  'Heitor Pimentel',
  'Isadora Lins',
  'João Vitor Braga',
  'Karina Muniz',
  'Leandro Bastos',
  'Marina Peçanha',
  'Nelson Tavares',
  'Olívia Rangel',
  'Paulo Cesar Bueno',
  'Queila Marins',
  'Rafael Siqueira',
  'Simone Drummond',
  'Tiago Vasconcelos',
];

const REJECTION_REASONS = [
  'Loja fechada no horário do pedido',
  'Item fora de estoque',
  'Endereço fora da rota do entregador',
];

const STATUS_CYCLE: OrderStatus[] = [
  'PLACED',
  'PLACED',
  'PLACED',
  'ACCEPTED',
  'ACCEPTED',
  'DISPATCHED',
  'DELIVERED',
  'REJECTED',
];

function pick<T>(list: readonly T[], index: number): T {
  const item = list[index % list.length];
  if (item === undefined) throw new Error('empty fixture list');
  return item;
}

/** Reference instant so the queue reads the same on every run. */
const QUEUE_ORIGIN = Date.parse('2026-09-10T14:00:00-03:00');

function buildOrder(index: number): Order {
  const store = pick(STORES, index * 3);
  const storeOffers = OFFERS.filter((offer) => offer.storeId === store.id && offer.available);
  const lineCount = 1 + (index % 3);

  const items: OrderItem[] = [];
  for (let line = 0; line < lineCount; line += 1) {
    const offer = pick(storeOffers, index * 7 + line * 13);
    const product = PRODUCTS.find((candidate) => candidate.id === offer.productId);
    if (!product) continue;

    const quantity = 1 + ((index + line) % 2);
    const rateBps = COMMISSION_BPS[product.category];
    const lineTotal = offer.priceCents * quantity;

    items.push({
      id: `itm-${index}-${line}`,
      productNameSnapshot: `${product.name} — ${product.variant}`,
      categorySnapshot: product.category,
      unitPriceCents: offer.priceCents,
      quantity,
      commissionRateBpsSnapshot: rateBps,
      commissionAmountCents: applyBasisPoints(lineTotal, rateBps),
      fulfillment: 'FULFILLED',
    });
  }

  const area = store.deliveryAreas[0];
  const itemsTotalCents = items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);
  const deliveryFeeCents = area?.deliveryFeeCents ?? 690;
  const serviceFeeCents = applyBasisPoints(itemsTotalCents, 200);
  const status = pick(STATUS_CYCLE, index);
  const acquisitionChannel = index % 6 === 0 ? 'STORE_REFERRAL' : 'PLATFORM';

  return {
    id: `ord-${String(index).padStart(3, '0')}`,
    // The short code is what the shopkeeper reads out loud on the phone.
    code: `PD-${String(4_100 + index * 3)}`,
    storeId: store.id,
    tutorName: pick(TUTOR_NAMES, index),
    neighborhood: pick(area?.neighborhoods ?? [store.neighborhood], index),
    status,
    acquisitionChannel,
    items,
    itemsTotalCents,
    deliveryFeeCents,
    serviceFeeCents,
    totalCents: itemsTotalCents + deliveryFeeCents + serviceFeeCents,
    // Commission is zero for the store's own customer (ADR-0003).
    commissionTotalCents:
      acquisitionChannel === 'STORE_REFERRAL'
        ? 0
        : items.reduce((sum, item) => sum + item.commissionAmountCents, 0),
    placedAt: new Date(QUEUE_ORIGIN - index * 7 * 60_000).toISOString(),
    ...(status === 'REJECTED' ? { rejectionReason: pick(REJECTION_REASONS, index) } : {}),
  };
}

export const ORDERS: readonly Order[] = Array.from({ length: 40 }, (_, index) => buildOrder(index));

/** The queue keeps growing while the panel is open — one new order every ~20 s. */
export function buildIncomingOrder(sequence: number): Order {
  const base = buildOrder(40 + sequence);
  return {
    ...base,
    id: `ord-live-${sequence}`,
    code: `PD-${String(4_900 + sequence * 3)}`,
    status: 'PLACED',
    placedAt: new Date().toISOString(),
  };
}
