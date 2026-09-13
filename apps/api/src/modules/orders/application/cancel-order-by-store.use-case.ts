import { Injectable } from '@nestjs/common';
import type { Order as OrderContract } from '@petdots/contracts';

import { cancelOrderByStore } from '../domain/order.js';
import { type StoreActor, StoreOrderTransition } from './store-order-transition.js';

/**
 * The store cancels after accepting, at the tutor's request, by telephone —
 * because there is no channel inside the order (ADR-0014, C4).
 *
 * Only from `ACCEPTED`: from `PLACED` the shop refuses, it does not cancel, and
 * the two are different facts for the tutor reading the screen. A reason is
 * required here and not for the tutor, because this is the side with something
 * to explain.
 *
 * ⚠️ The reason is persisted on the order and **kept out of the audit payload**
 * (ADR-0018, A7): a sentence typed in a hurry may name the tutor, and
 * `audit_log` is permanent.
 */
@Injectable()
export class CancelOrderByStoreUseCase {
  constructor(private readonly transition: StoreOrderTransition) {}

  async execute(
    actor: StoreActor,
    orderId: string,
    reason: string,
    now: Date = new Date(),
  ): Promise<OrderContract> {
    return this.transition.run({
      actor,
      orderId,
      action: 'order.cancelled',
      expectedStatus: 'ACCEPTED',
      exitOf: (order) => cancelOrderByStore(order, now, reason),
      logOf: (order) =>
        `order cancelled by store (orderId=${order.id}, code=${order.code}, ` +
        `storeId=${actor.storeId}, userId=${actor.userId}, role=${actor.storeRole})`,
    });
  }
}
