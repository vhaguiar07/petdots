import { Injectable } from '@nestjs/common';
import type { Order as OrderContract } from '@petdots/contracts';

import { dispatchOrder } from '../domain/order.js';
import { type StoreActor, StoreOrderTransition } from './store-order-transition.js';

/**
 * It left the shop. No money moves, and the order is now out of the store's
 * hands — the only move left is confirming it arrived.
 *
 * A noun sub-resource, `/dispatch`, rather than `delivery`: `Delivery` is an
 * entity of capability 8, and using the word here would collide with it the day
 * a courier is modelled.
 */
@Injectable()
export class DispatchOrderUseCase {
  constructor(private readonly transition: StoreOrderTransition) {}

  async execute(
    actor: StoreActor,
    orderId: string,
    now: Date = new Date(),
  ): Promise<OrderContract> {
    return this.transition.run({
      actor,
      orderId,
      action: 'order.dispatched',
      expectedStatus: 'ACCEPTED',
      exitOf: (order) => dispatchOrder(order, now),
      logOf: (order) =>
        `order dispatched (orderId=${order.id}, code=${order.code}, ` +
        `storeId=${actor.storeId}, userId=${actor.userId}, role=${actor.storeRole})`,
    });
  }
}
