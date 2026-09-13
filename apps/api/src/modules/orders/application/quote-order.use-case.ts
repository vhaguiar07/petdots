import { Injectable } from '@nestjs/common';
import type { OrderQuote, QuoteOrder } from '@petdots/contracts';

import { toOrderQuoteContract } from './order-contract.js';
import { PriceOrderUseCase } from './price-order.use-case.js';

/**
 * Prices a cart without creating anything.
 *
 * The journey J3 promises the tutor sees the delivery fee and the service fee
 * **before** paying, and this is the only honest way to show them: the client
 * computing its own total would duplicate the cheapest-covering-area rule, the
 * service fee and the availability check, and would be wrong on exactly the
 * days those rules changed.
 *
 * 🔴 **A closed store is not an error here.** The quote comes back with
 * `storeOpenNow: false` and `nextOpeningAt`, so the screen says "Fechada agora ·
 * abre segunda às 08:00" and disables the button — which is more useful than a
 * `409` the screen would have to translate back into the same sentence. Placing
 * the order while closed *is* an error (ADR-0014, C2: the order is refused
 * before anyone is charged), and `PlaceOrderUseCase` is where that lives.
 */
@Injectable()
export class QuoteOrderUseCase {
  constructor(private readonly priceOrder: PriceOrderUseCase) {}

  async execute(userId: string, input: QuoteOrder, now: Date = new Date()): Promise<OrderQuote> {
    return toOrderQuoteContract(await this.priceOrder.execute(userId, input, now));
  }
}
