import { Inject, Injectable } from '@nestjs/common';
import type { Order as OrderContract, OrderList } from '@petdots/contracts';

import { type IOrderRepository, ORDER_REPOSITORY } from '../domain/iorder.repository.js';
import { OrderNotFoundError } from '../domain/order-errors.js';
import { type StoreSummaryOfOrder, toOrderContract } from './order-contract.js';
import { ResolveOrderTutor } from './resolve-order-tutor.js';
import { StoreSummaryOf } from './store-summary-of.js';

/**
 * One order of the caller, or `OrderNotFoundError`.
 *
 * 🔴 Somebody else's order answers the **same** error, which the controller
 * turns into `404`. It is not a courtesy: the ownership lives in the `where` of
 * the query, so a row belonging to another tutor never arrives here at all —
 * there is no moment where it is fetched and then hidden.
 */
@Injectable()
export class FindMyOrderUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orders: IOrderRepository,
    private readonly resolveTutor: ResolveOrderTutor,
    private readonly storeSummaryOf: StoreSummaryOf,
  ) {}

  async execute(userId: string, orderId: string): Promise<OrderContract> {
    const tutorId = await this.resolveTutor.forUser(userId);

    if (!tutorId) {
      throw new OrderNotFoundError(orderId);
    }

    const order = await this.orders.findByIdForTutor(orderId, tutorId);

    if (!order) {
      throw new OrderNotFoundError(orderId);
    }

    return toOrderContract(order, await this.storeSummaryOf.execute(order.storeId));
  }

  /**
   * Every order of the caller, newest first.
   *
   * Not paginated: a tutor in the pilot has a handful of orders and the limit is
   * natural (`API_GUIDELINES`). Trigger to paginate: the first tutor past ~50.
   */
  async list(userId: string): Promise<OrderList> {
    const tutorId = await this.resolveTutor.forUser(userId);

    if (!tutorId) {
      // No profile yet means no order can exist — an empty list, not an error.
      return { items: [] };
    }

    const orders = await this.orders.listByTutor(tutorId);
    const stores = new Map<string, StoreSummaryOfOrder>();

    for (const order of orders) {
      if (!stores.has(order.storeId)) {
        stores.set(order.storeId, await this.storeSummaryOf.execute(order.storeId));
      }
    }

    return {
      items: orders.map((order) =>
        toOrderContract(
          order,
          stores.get(order.storeId) ?? {
            id: order.storeId,
            slug: '',
            name: '',
            neighborhood: '',
          },
        ),
      ),
    };
  }
}
