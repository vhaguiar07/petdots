import type { Order } from '@petdots/contracts';

/**
 * The queue as the shop actually reads it.
 *
 * 🔴 A **pure function**, and the ordering lives here rather than in the API for
 * one reason: "the most urgent at the top" is a decision about a screen, and
 * this way it is unit-tested without a database and changed without migrating
 * anybody's expectations. The API answers `placedAt desc`, which is the honest
 * default for a list; the panel re-sorts what is waiting by **how little time is
 * left**, because an order with two minutes on the clock matters more than one
 * placed a minute ago with fourteen.
 */
export interface StoreQueue {
  /** `PLACED` — the deadline is running. Soonest to expire first. */
  waiting: Order[];
  /** `ACCEPTED` — being separated. */
  accepted: Order[];
  /** `DISPATCHED` — out for delivery. */
  dispatched: Order[];
  /** Terminal: delivered, refused, cancelled. Newest first. */
  done: Order[];
}

const byDeadline = (a: Order, b: Order): number =>
  Date.parse(a.acceptanceDeadlineAt) - Date.parse(b.acceptanceDeadlineAt);

const byPlacedDesc = (a: Order, b: Order): number =>
  Date.parse(b.placedAt) - Date.parse(a.placedAt);

export function groupOrdersForQueue(orders: readonly Order[]): StoreQueue {
  const waiting = orders.filter((order) => order.status === 'PLACED').sort(byDeadline);
  const accepted = orders.filter((order) => order.status === 'ACCEPTED').sort(byPlacedDesc);
  const dispatched = orders.filter((order) => order.status === 'DISPATCHED').sort(byPlacedDesc);

  // ⚠️ Everything terminal, **including an order that expired while the panel
  // was open**. Dropping those would make an order vanish from "Aguardando"
  // with no explanation, which is the worst thing a queue can do to the person
  // watching it (the polling risk named in the plan).
  const done = orders
    .filter((order) => ['DELIVERED', 'REJECTED', 'CANCELLED'].includes(order.status))
    .sort(byPlacedDesc);

  return { waiting, accepted, dispatched, done };
}

/** What each state of the order means **to the shop**, not to the tutor. */
export function storeOrderStatusLabel(order: Pick<Order, 'status' | 'rejectionReason'>): string {
  switch (order.status) {
    case 'PLACED':
      return 'Aguardando você';
    case 'ACCEPTED':
      return 'Aceito — separar';
    case 'DISPATCHED':
      return 'Saiu para entrega';
    case 'DELIVERED':
      return 'Entregue';
    case 'REJECTED':
      // The distinction ADR-0014 C2 exists for, seen from the other side: "you
      // said no" and "you did not answer" are different facts about the shop.
      return order.rejectionReason === 'ACCEPTANCE_EXPIRED'
        ? 'Recusado — prazo vencido'
        : 'Recusado';
    default:
      return 'Cancelado';
  }
}

/**
 * How long is left on the acceptance window, in words.
 *
 * Minutes and not a clock time: what the shop needs to know is "how long do I
 * have", and a deadline of `14:32` makes them do the subtraction themselves.
 */
export function deadlineLabel(order: Pick<Order, 'acceptanceDeadlineAt'>, now: Date): string {
  const remainingMs = Date.parse(order.acceptanceDeadlineAt) - now.getTime();

  if (remainingMs <= 0) {
    return 'prazo vencido';
  }

  const minutes = Math.ceil(remainingMs / 60_000);

  if (minutes < 60) {
    return `vence em ${String(minutes)} min`;
  }

  const hours = Math.floor(minutes / 60);

  // The window is counted in **working** minutes (ADR-0014, C2), so an order
  // placed before closing can legitimately have a deadline the next morning.
  return `vence em ${String(hours)} h`;
}
