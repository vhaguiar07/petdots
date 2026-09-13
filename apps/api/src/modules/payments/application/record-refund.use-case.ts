import { Inject, Injectable, Logger } from '@nestjs/common';

import type { PersistenceContext } from '../../../prisma/persistence-context.js';
import { type IRefundRepository, REFUND_REPOSITORY } from '../domain/irefund.repository.js';
import type { NewRefund, Refund } from '../domain/refund.js';

/**
 * Records that money is owed back.
 *
 * ⚠️ **In pd-15 nothing was ever charged**, so every row this writes says "here
 * is what would be returned for an order nobody paid". That is a cost the
 * briefing accepted knowingly: `Refund` comes in with `orders` because
 * ADR-0014 made it the thing every non-delivery exit produces, and building the
 * exits without it would mean writing them twice. The PSP call that turns
 * `PENDING` into `COMPLETED` is pd-17, and so is the decision about what to do
 * with the development rows this leaves behind (ADR-0017).
 *
 * The log carries ids and an amount — never a name or an address (`SECURITY`).
 */
@Injectable()
export class RecordRefundUseCase {
  private readonly logger = new Logger(RecordRefundUseCase.name);

  constructor(
    @Inject(REFUND_REPOSITORY)
    private readonly refunds: IRefundRepository,
  ) {}

  async execute(refund: NewRefund, context?: PersistenceContext): Promise<Refund> {
    const recorded = await this.refunds.create(refund, context);

    this.logger.log(
      `refund recorded (refundId=${recorded.id}, orderId=${recorded.orderId}, ` +
        `reason=${recorded.reason}, amountCents=${String(recorded.amountCents)})`,
    );

    return recorded;
  }

  listByOrder(orderId: string): Promise<Refund[]> {
    return this.refunds.listByOrder(orderId);
  }
}
