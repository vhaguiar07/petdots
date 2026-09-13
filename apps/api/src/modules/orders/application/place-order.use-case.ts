import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Order as OrderContract, QuoteOrder } from '@petdots/contracts';
import { generateOrderCode, StoreClosedError } from '@petdots/domain';
import { randomUUID } from 'node:crypto';

import { type IOrderRepository, ORDER_REPOSITORY } from '../domain/iorder.repository.js';
import { buildOrder, type Order, type OrderItem } from '../domain/order.js';
import { DuplicateIdempotencyKeyError, OrderCodeCollisionError } from '../domain/order-errors.js';
import { toOrderContract } from './order-contract.js';
import { type PricedOrder, PriceOrderUseCase } from './price-order.use-case.js';

@Injectable()
export class PlaceOrderUseCase {
  private readonly logger = new Logger(PlaceOrderUseCase.name);

  constructor(
    private readonly priceOrder: PriceOrderUseCase,
    @Inject(ORDER_REPOSITORY)
    private readonly orders: IOrderRepository,
  ) {}

  /**
   * Creates the order, or hands back the one this key already created.
   *
   * ⚠️ **The order is born `PLACED`, unpaid** (ADR-0017). The `SYSTEM_ARCHITECTURE`
   * flow has `PLACED` arriving after the PSP webhook, which implies a state
   * before it — and that state is pd-17, with the PSP in hand. What this method
   * does today is what it will keep doing; where it will change is *when* it is
   * called.
   *
   * ⚠️ **Creating an order writes no audit line**, and the omission is
   * deliberate: the row in `orders` already carries who (`tutor_id`), when
   * (`placed_at`) and what. A second record of the same fact would be noise in
   * the one table that has to stay readable. What gets audited is every
   * **transition** out of `PLACED` (ADR-0017, A8).
   */
  async execute(
    userId: string,
    input: QuoteOrder,
    idempotencyKey: string,
    now: Date = new Date(),
  ): Promise<OrderContract> {
    // Pricing runs first even on a replay: the key is unique **per tutor**, and
    // the tutor is derived from the token, never sent. The cost is a handful of
    // reads on a path that only a retrying client takes.
    const priced = await this.priceOrder.execute(userId, input, now);

    const existing = await this.orders.findByIdempotencyKey(priced.tutorId, idempotencyKey);

    if (existing) {
      // The replay path. `201` again with the same order, because the client
      // that retried cannot tell — and must not be able to tell — whether its
      // first attempt landed (API_GUIDELINES).
      this.logger.log(
        `order replayed (orderId=${existing.id}, code=${existing.code}, tutorId=${priced.tutorId})`,
      );

      return toOrderContract(existing, priced.store);
    }

    // 🔴 Out of hours the order is refused **before** anyone is charged
    // (ADR-0014, C2). The quote answers the same cart with `storeOpenNow:
    // false`; here it is a conflict, because creating it would produce exactly
    // the stuck, paid, unanswered order the ADR exists to prevent.
    if (!priced.storeOpenNow || !priced.acceptanceDeadlineAt) {
      throw new StoreClosedError(priced.nextOpeningAt);
    }

    const order = await this.createWithCodeRetry(priced, idempotencyKey, now);

    this.logger.log(
      `order placed (orderId=${order.id}, code=${order.code}, storeId=${order.storeId}, ` +
        `tutorId=${order.tutorId}, totalCents=${String(order.totalCents)})`,
    );

    // No domain event is emitted. `order.placed` is documented in the
    // DOMAIN_MODEL and has no bus and no consumer — the same decision, for the
    // same reason, as pd-09, pd-12 and pd-14 (ADR-0017, A24).
    return toOrderContract(order, priced.store);
  }

  /**
   * Writes the order, retrying **once** on a readable-code collision.
   *
   * The space is 32⁶ ≈ 1.07 billion, so a clash is improbable rather than
   * impossible, and one retry turns a 1-in-a-billion into a 1-in-10¹⁸. A second
   * clash propagates as a 500: at that point something is wrong with the
   * randomness, and hiding it behind a third attempt would be hiding the bug.
   *
   * A clash on the idempotency key is the opposite situation — two requests
   * racing on the same key — so it re-reads and answers with whichever landed.
   */
  private async createWithCodeRetry(
    priced: PricedOrder,
    idempotencyKey: string,
    placedAt: Date,
  ): Promise<Order> {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        return await this.orders.create(this.toOrder(priced, placedAt), idempotencyKey);
      } catch (error) {
        if (error instanceof DuplicateIdempotencyKeyError) {
          const winner = await this.orders.findByIdempotencyKey(priced.tutorId, idempotencyKey);

          if (winner) {
            return winner;
          }
        }

        if (!(error instanceof OrderCodeCollisionError) || attempt === 1) {
          throw error;
        }

        this.logger.warn(`order code collision on ${error.code}; retrying once`);
      }
    }

    // Unreachable: the loop either returns or throws.
    throw new Error('order creation exhausted its attempts');
  }

  /**
   * 🔴 `placedAt` is the **same instant** the cart was priced at, not a fresh
   * `new Date()`.
   *
   * The deadline was computed from that instant, so reading the clock a second
   * time here would make every order's acceptance window silently shorter than
   * the configured one — by however long the pricing queries took. Small, and
   * exactly the kind of drift that turns "15 minutos" into a number nobody can
   * reproduce.
   */
  private toOrder(priced: PricedOrder, now: Date): Order {
    return buildOrder({
      // The ids are generated here and not by the database so that `buildOrder`
      // can validate a complete aggregate — including which line a refund would
      // name — before a single row is written.
      id: randomUUID(),
      code: generateOrderCode(),
      tutorId: priced.tutorId,
      storeId: priced.store.id,
      acquisitionChannel: 'PLATFORM',
      contactName: priced.contactName,
      contactPhone: priced.contactPhone,
      deliveryAddress: priced.deliveryAddress,
      items: priced.lines.map(toOrderItem),
      deliveryFeeCents: priced.deliveryFeeCents,
      serviceFeeCents: priced.serviceFeeCents,
      placedAt: now,
      // Never null here: `execute` refused a closed store above.
      acceptanceDeadlineAt: priced.acceptanceDeadlineAt ?? now,
    });
  }
}

/**
 * 🔴 The priced line becomes a **snapshot**.
 *
 * Everything that could move later is copied now — name, variant, category,
 * unit price, the take rate and the amount it produced. A JOIN back to
 * `products`, `offers` and `commission_rates` would answer with today's values,
 * and the payout of pd-17 is computed from these columns: it would pay the shop
 * at a price nobody charged (ADR-0004 #5, ADR-0017 A2).
 */
function toOrderItem(line: {
  offerId: string;
  productId: string;
  productName: string;
  productVariant: string;
  category: OrderItem['categorySnapshot'];
  unitPriceCents: number;
  quantity: number;
  commissionRateBps: number;
  commissionAmountCents: number;
}): OrderItem {
  return {
    id: randomUUID(),
    productId: line.productId,
    offerId: line.offerId,
    productNameSnapshot: line.productName,
    productVariantSnapshot: line.productVariant,
    categorySnapshot: line.category,
    unitPriceCents: line.unitPriceCents,
    quantity: line.quantity,
    commissionRateBpsSnapshot: line.commissionRateBps,
    commissionAmountCents: line.commissionAmountCents,
    fulfillment: 'FULFILLED',
    substitutedByProductId: null,
  };
}
