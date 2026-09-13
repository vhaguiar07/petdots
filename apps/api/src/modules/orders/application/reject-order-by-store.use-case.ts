import { Injectable } from '@nestjs/common';
import type { Order as OrderContract } from '@petdots/contracts';

import { rejectOrder } from '../domain/order.js';
import { type StoreActor, StoreOrderTransition } from './store-order-transition.js';

/**
 * The store says no. Everything goes back, fees included (ADR-0014, C6).
 *
 * ⚠️ **No free-text reason in pd-16** (ADR-0018, A9). `rejection_reason` stays
 * the enum `STORE_REJECTED`, which is the distinction ADR-0014 C2 actually
 * requires: a shop that said no is a different fact, for the tutor and for us,
 * from a shop that never looked (`ACCEPTANCE_EXPIRED`). A written explanation
 * would need a column and a migration for a field the journey mentions in
 * passing; it is in `IDEIAS`, triggered by the first tutor who asks why.
 *
 * Both roles may refuse, for the same reason both may accept.
 */
@Injectable()
export class RejectOrderByStoreUseCase {
  constructor(private readonly transition: StoreOrderTransition) {}

  async execute(
    actor: StoreActor,
    orderId: string,
    now: Date = new Date(),
  ): Promise<OrderContract> {
    return this.transition.run({
      actor,
      orderId,
      action: 'order.rejected',
      expectedStatus: 'PLACED',
      exitOf: (order) => rejectOrder(order, now),
      logOf: (order) =>
        `order rejected by store (orderId=${order.id}, code=${order.code}, ` +
        `storeId=${actor.storeId}, userId=${actor.userId}, role=${actor.storeRole})`,
    });
  }
}
