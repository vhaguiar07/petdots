import { Inject, Injectable } from '@nestjs/common';
import type { Order as OrderContract, OrderList, OrderStatus } from '@petdots/contracts';

import { type IOrderRepository, ORDER_REPOSITORY } from '../domain/iorder.repository.js';
import type { Order } from '../domain/order.js';
import { OrderNotFoundError } from '../domain/order-errors.js';
import { type StoreSummaryOfOrder, toOrderContract } from './order-contract.js';
import type { StoreActor } from './store-order-transition.js';
import { StoreSummaryOf } from './store-summary-of.js';

/**
 * The store's queue, and one order in it.
 *
 * 🔴 An order of **another** store answers `OrderNotFoundError`, which the
 * controller turns into `404`. The ownership lives in the `where` of the query,
 * so a row belonging to store B never arrives here through store D's URL at all.
 * `403` would confirm that the order id is real — and unlike a store, whose
 * existence the comparator publishes anyway, an order's existence is not public.
 *
 * The contract is **the tutor's `orderSchema`, deliberately**. What the shop
 * needs in order to deliver is exactly the contact and address snapshot
 * `SECURITY` §LGPD calls the minimum; and what it may not see here — the
 * commission — is already absent from `toOrderContract`, which never spreads.
 * A second mapping would be a second place for the take rate to leak into.
 */
@Injectable()
export class FindStoreOrderUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orders: IOrderRepository,
    private readonly storeSummaryOf: StoreSummaryOf,
  ) {}

  async execute(actor: StoreActor, orderId: string): Promise<OrderContract> {
    const order = await this.orders.findByIdForStore(orderId, actor.storeId);

    if (!order) {
      throw new OrderNotFoundError(orderId);
    }

    return toOrderContract(order, await this.storeSummaryOf.execute(order.storeId));
  }

  /**
   * The whole queue, or the statuses the panel asked for, newest first.
   *
   * The ordering the shop actually reads — the ones about to expire at the top —
   * is decided client-side by a pure function, so it can be unit-tested without
   * a database and changed without a migration of anybody's expectations.
   */
  async list(actor: StoreActor, statuses: readonly OrderStatus[] | undefined): Promise<OrderList> {
    const orders = await this.orders.listByStore(actor.storeId, statuses);

    // Every order in this list belongs to the store in the path, so the summary
    // is resolved once rather than per row.
    const store = await this.storeSummaryOf.execute(actor.storeId);

    return { items: orders.map((order: Order): OrderContract => toOrderContract(order, store)) };
  }

  /** The store summary of one order, for the callers that already have it. */
  async summaryOf(storeId: string): Promise<StoreSummaryOfOrder> {
    return this.storeSummaryOf.execute(storeId);
  }
}
