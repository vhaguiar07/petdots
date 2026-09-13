import { Inject, Injectable } from '@nestjs/common';
import type { Order as OrderContract } from '@petdots/contracts';

import { type IOrderRepository, ORDER_REPOSITORY } from '../domain/iorder.repository.js';
import { markItemUnavailable } from '../domain/order.js';
import { OrderItemNotFoundError, OrderNotFoundError } from '../domain/order-errors.js';
import { type StoreActor, StoreOrderTransition } from './store-order-transition.js';

/**
 * 🔴 One item is not on the shelf after all (ADR-0014, C3).
 *
 * The line's `fulfillment` becomes `UNAVAILABLE` — **the snapshot is never
 * edited**, because the order is an accounting record — and a refund is born for
 * that line alone. Delivery and service fees stay: the trip still happens and
 * the service was rendered (C6). If nothing is left, the order goes to
 * `CANCELLED` with a **total** refund, fees included, because now there is no
 * trip to pay for.
 *
 * ⚠️ It **pre-reads the line** before handing the order to the domain, for one
 * reason: `markItemUnavailable` answers the same `InvalidOrderTransitionError`
 * to a line that does not exist and to a line already marked. Those are a `404`
 * and a `409` respectively (ADR-0018, A6), and without this read the panel could
 * not tell the shop which of the two happened. The domain is untouched.
 *
 * Both roles may do it: it is what separating an order looks like.
 */
@Injectable()
export class MarkOrderItemUnavailableUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orders: IOrderRepository,
    private readonly transition: StoreOrderTransition,
  ) {}

  async execute(
    actor: StoreActor,
    orderId: string,
    orderItemId: string,
    now: Date = new Date(),
  ): Promise<OrderContract> {
    const order = await this.orders.findByIdForStore(orderId, actor.storeId);

    if (!order) {
      throw new OrderNotFoundError(orderId);
    }

    if (!order.items.some((item) => item.id === orderItemId)) {
      // No such line **in this order** — including a real line of somebody
      // else's order, which is the same `404` for the same reason.
      throw new OrderItemNotFoundError(orderId, orderItemId);
    }

    return this.transition.run({
      actor,
      orderId,
      action: 'order.item_unavailable',
      // From `ACCEPTED`, and the order usually **stays** there: the
      // compare-and-set guards the status it is still in, not one it moves to.
      expectedStatus: 'ACCEPTED',
      exitOf: (current) => markItemUnavailable(current, orderItemId, now),
      payloadOf: (exit) => ({
        orderItemId,
        // The one fact the panel and a later audit reader cannot infer from the
        // status alone: this was the last line, so the order died with it.
        orderCancelled: exit.order.status === 'CANCELLED',
      }),
      logOf: (moved) =>
        `order item marked unavailable (orderId=${moved.id}, code=${moved.code}, ` +
        `orderItemId=${orderItemId}, status=${moved.status}, storeId=${actor.storeId}, ` +
        `userId=${actor.userId}, role=${actor.storeRole})`,
    });
  }
}
