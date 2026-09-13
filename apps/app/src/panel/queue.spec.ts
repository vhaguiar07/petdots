import type { Order } from '@petdots/contracts';

import { deadlineLabel, groupOrdersForQueue, storeOrderStatusLabel } from './queue';

const NOW = new Date('2026-09-13T12:00:00.000Z');

const order = (fields: Partial<Order> & Pick<Order, 'id' | 'status'>): Order =>
  ({
    code: fields.id.toUpperCase(),
    placedAt: '2026-09-13T11:00:00.000Z',
    acceptanceDeadlineAt: '2026-09-13T12:15:00.000Z',
    rejectionReason: null,
    ...fields,
  }) as Order;

describe('groupOrdersForQueue', () => {
  it('🔴 puts the order closest to expiring at the top of the waiting list', () => {
    // The whole reason the ordering is not `placedAt desc`: two minutes left
    // matters more than "arrived a minute ago".
    const queue = groupOrdersForQueue([
      order({ id: 'later', status: 'PLACED', acceptanceDeadlineAt: '2026-09-13T12:14:00.000Z' }),
      order({ id: 'urgent', status: 'PLACED', acceptanceDeadlineAt: '2026-09-13T12:02:00.000Z' }),
    ]);

    expect(queue.waiting.map((entry) => entry.id)).toEqual(['urgent', 'later']);
  });

  it('separates the four sections of the queue', () => {
    const queue = groupOrdersForQueue([
      order({ id: 'a', status: 'PLACED' }),
      order({ id: 'b', status: 'ACCEPTED' }),
      order({ id: 'c', status: 'DISPATCHED' }),
      order({ id: 'd', status: 'DELIVERED' }),
    ]);

    expect(queue.waiting.map((entry) => entry.id)).toEqual(['a']);
    expect(queue.accepted.map((entry) => entry.id)).toEqual(['b']);
    expect(queue.dispatched.map((entry) => entry.id)).toEqual(['c']);
    expect(queue.done.map((entry) => entry.id)).toEqual(['d']);
  });

  it('🔴 keeps an order that expired while the panel was open, in Concluídos', () => {
    // Dropping it would make the order vanish from "Aguardando" with no
    // explanation, between one poll and the next.
    const queue = groupOrdersForQueue([
      order({ id: 'expired', status: 'REJECTED', rejectionReason: 'ACCEPTANCE_EXPIRED' }),
      order({ id: 'refused', status: 'REJECTED', rejectionReason: 'STORE_REJECTED' }),
      order({ id: 'cancelled', status: 'CANCELLED' }),
    ]);

    expect(queue.done.map((entry) => entry.id).sort()).toEqual(['cancelled', 'expired', 'refused']);
    expect(queue.waiting).toEqual([]);
  });

  it('orders the finished ones newest first', () => {
    const queue = groupOrdersForQueue([
      order({ id: 'old', status: 'DELIVERED', placedAt: '2026-09-10T10:00:00.000Z' }),
      order({ id: 'new', status: 'DELIVERED', placedAt: '2026-09-13T10:00:00.000Z' }),
    ]);

    expect(queue.done.map((entry) => entry.id)).toEqual(['new', 'old']);
  });

  it('answers four empty sections for an empty queue', () => {
    expect(groupOrdersForQueue([])).toEqual({
      waiting: [],
      accepted: [],
      dispatched: [],
      done: [],
    });
  });
});

describe('storeOrderStatusLabel', () => {
  it('says what the shop has to do, not what the tutor is waiting for', () => {
    expect(storeOrderStatusLabel({ status: 'PLACED', rejectionReason: null })).toBe(
      'Aguardando você',
    );
    expect(storeOrderStatusLabel({ status: 'ACCEPTED', rejectionReason: null })).toBe(
      'Aceito — separar',
    );
  });

  it('🔴 tells the shop apart from the clock', () => {
    expect(storeOrderStatusLabel({ status: 'REJECTED', rejectionReason: 'STORE_REJECTED' })).toBe(
      'Recusado',
    );
    expect(
      storeOrderStatusLabel({ status: 'REJECTED', rejectionReason: 'ACCEPTANCE_EXPIRED' }),
    ).toBe('Recusado — prazo vencido');
  });

  it('labels the rest of the machine', () => {
    expect(storeOrderStatusLabel({ status: 'DISPATCHED', rejectionReason: null })).toBe(
      'Saiu para entrega',
    );
    expect(storeOrderStatusLabel({ status: 'DELIVERED', rejectionReason: null })).toBe('Entregue');
    expect(storeOrderStatusLabel({ status: 'CANCELLED', rejectionReason: null })).toBe('Cancelado');
  });
});

describe('deadlineLabel', () => {
  it('counts in minutes, because that is the question the shop is asking', () => {
    expect(deadlineLabel({ acceptanceDeadlineAt: '2026-09-13T12:07:00.000Z' }, NOW)).toBe(
      'vence em 7 min',
    );
  });

  it('rounds up, so "0 min" never appears on an order that still has time', () => {
    expect(deadlineLabel({ acceptanceDeadlineAt: '2026-09-13T12:00:30.000Z' }, NOW)).toBe(
      'vence em 1 min',
    );
  });

  it('says the deadline is gone, rather than a negative number', () => {
    expect(deadlineLabel({ acceptanceDeadlineAt: '2026-09-13T11:59:00.000Z' }, NOW)).toBe(
      'prazo vencido',
    );
    expect(deadlineLabel({ acceptanceDeadlineAt: '2026-09-13T12:00:00.000Z' }, NOW)).toBe(
      'prazo vencido',
    );
  });

  it('switches to hours for a window that ran past closing time', () => {
    // The window counts **working** minutes (ADR-0014, C2), so an order placed
    // before closing can legitimately be due the next morning.
    expect(deadlineLabel({ acceptanceDeadlineAt: '2026-09-14T09:00:00.000Z' }, NOW)).toBe(
      'vence em 21 h',
    );
  });
});
