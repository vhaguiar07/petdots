import { Injectable } from '@nestjs/common';
import type { Order as OrderContract } from '@petdots/contracts';

import { acceptOrder } from '../domain/order.js';
import { type StoreActor, StoreOrderTransition } from './store-order-transition.js';

/**
 * 🔴 The store takes the order — the transition this whole task exists for.
 *
 * Until pd-16 nothing could produce it, so every order placed ran out its
 * fifteen minutes and was auto-rejected by the sweeper. `findOverdue` filters
 * on `status = 'PLACED'`, which means an accepted order is never swept again:
 * that is the promise, and the e2e proves it by moving an accepted order's
 * deadline into the past and sweeping.
 *
 * Both roles may accept (ADR-0013 §permissões): the person at the counter is
 * who sees the order arrive. No money moves.
 */
@Injectable()
export class AcceptOrderByStoreUseCase {
  constructor(private readonly transition: StoreOrderTransition) {}

  async execute(
    actor: StoreActor,
    orderId: string,
    now: Date = new Date(),
  ): Promise<OrderContract> {
    return this.transition.run({
      actor,
      orderId,
      action: 'order.accepted',
      expectedStatus: 'PLACED',
      exitOf: (order) => acceptOrder(order, now),
      logOf: (order) =>
        `order accepted by store (orderId=${order.id}, code=${order.code}, ` +
        `storeId=${actor.storeId}, userId=${actor.userId}, role=${actor.storeRole})`,
    });
  }
}
