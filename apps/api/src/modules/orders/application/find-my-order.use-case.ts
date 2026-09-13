import { Inject, Injectable } from '@nestjs/common';
import type { Order as OrderContract, OrderList } from '@petdots/contracts';

import { FindStoreUseCase } from '../../stores/application/find-store.use-case.js';
import { StoreNotFoundError } from '../../stores/domain/store-not-found.error.js';
import { type IOrderRepository, ORDER_REPOSITORY } from '../domain/iorder.repository.js';
import type { Order } from '../domain/order.js';
import { OrderNotFoundError } from '../domain/order-errors.js';
import { type StoreSummaryOfOrder, toOrderContract } from './order-contract.js';
import { ResolveOrderTutor } from './resolve-order-tutor.js';

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
    private readonly findStore: FindStoreUseCase,
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

    return toOrderContract(order, await this.storeOf(order));
  }

  /**
   * The store's name for the screen.
   *
   * ⚠️ A store that has since been paused would raise `StoreNotFoundError`
   * here, and an order must stay readable regardless of what happened to the
   * shop afterwards — the order is an accounting record. So the failure falls
   * back to the ids the order itself carries; the page still renders, with a
   * name it no longer has a source for.
   */
  private async storeOf(order: Order): Promise<StoreSummaryOfOrder> {
    try {
      const store = await this.findStore.execute(order.storeId);

      return {
        id: store.id,
        slug: store.slug,
        name: store.name,
        neighborhood: store.neighborhood,
      };
    } catch (error) {
      if (!(error instanceof StoreNotFoundError)) {
        throw error;
      }

      return { id: order.storeId, slug: '', name: '', neighborhood: '' };
    }
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
        stores.set(order.storeId, await this.storeOf(order));
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
