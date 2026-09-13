import { Injectable } from '@nestjs/common';
import type { Order as OrderContract } from '@petdots/contracts';

import { deliverOrder } from '../domain/order.js';
import { type StoreActor, StoreOrderTransition } from './store-order-transition.js';

/**
 * 🔴 It arrived — the only exit that owes nothing back, and the one the payout
 * of pd-17 will be computed from.
 *
 * Without a producer for `DELIVERED` the journey J4 never closes and the payout
 * has no trigger, which is why it is in this task even though `MVP_SCOPE` #11
 * lists only accept, refuse, dispatch and mark unavailable (ADR-0018, A10).
 *
 * The store confirms it, not the tutor: there is no courier app, and asking the
 * person who is waiting to certify their own delivery is the one signal we
 * cannot trust. Trigger to revisit: the delivery module of capability 8.
 */
@Injectable()
export class ConfirmOrderDeliveryUseCase {
  constructor(private readonly transition: StoreOrderTransition) {}

  async execute(
    actor: StoreActor,
    orderId: string,
    now: Date = new Date(),
  ): Promise<OrderContract> {
    return this.transition.run({
      actor,
      orderId,
      action: 'order.delivered',
      expectedStatus: 'DISPATCHED',
      exitOf: (order) => deliverOrder(order, now),
      logOf: (order) =>
        `order delivered (orderId=${order.id}, code=${order.code}, ` +
        `storeId=${actor.storeId}, userId=${actor.userId}, role=${actor.storeRole})`,
    });
  }
}
