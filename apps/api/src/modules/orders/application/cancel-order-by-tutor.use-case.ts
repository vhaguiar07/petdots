import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Order as OrderContract } from '@petdots/contracts';

import { AUDIT_TRAIL, type IAuditTrail } from '../../../audit/audit-trail.port.js';
import { RecordRefundUseCase } from '../../payments/application/record-refund.use-case.js';
import { InvalidOrderTransitionError } from '../domain/invalid-order-transition.error.js';
import { type IOrderRepository, ORDER_REPOSITORY } from '../domain/iorder.repository.js';
import { cancelOrderByTutor } from '../domain/order.js';
import { OrderNotFoundError } from '../domain/order-errors.js';
import { toOrderContract } from './order-contract.js';
import { ResolveOrderTutor } from './resolve-order-tutor.js';
import { StoreSummaryOf } from './store-summary-of.js';

/**
 * The tutor cancels, freely, up to the moment the store accepts (ADR-0014, C4).
 *
 * 🔴 Three writes, one transaction: the status, the `Refund` it owes and the
 * audit line. The refund is the reason the atomicity matters — a `CANCELLED`
 * without one is money that stopped existing, and unlike the pd-14's two
 * unrelated writes, repeating the request would not repair it.
 *
 * The compare-and-set is what makes a double-tap safe: the second request finds
 * the order no longer `PLACED`, affects zero rows, and is refused as an invalid
 * transition instead of producing a second refund.
 */
@Injectable()
export class CancelOrderByTutorUseCase {
  private readonly logger = new Logger(CancelOrderByTutorUseCase.name);

  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orders: IOrderRepository,
    @Inject(AUDIT_TRAIL)
    private readonly auditTrail: IAuditTrail,
    private readonly resolveTutor: ResolveOrderTutor,
    private readonly recordRefund: RecordRefundUseCase,
    private readonly storeSummaryOf: StoreSummaryOf,
  ) {}

  async execute(
    userId: string,
    orderId: string,
    requestId: string | null,
    now: Date = new Date(),
  ): Promise<OrderContract> {
    const tutorId = await this.resolveTutor.forUser(userId);

    if (!tutorId) {
      throw new OrderNotFoundError(orderId);
    }

    const order = await this.orders.findByIdForTutor(orderId, tutorId);

    if (!order) {
      // Somebody else's order, or none at all — the same `404` either way.
      throw new OrderNotFoundError(orderId);
    }

    // Raises on anything past `PLACED`: after the acceptance it is the store
    // that cancels, by telephone (ADR-0014, C4).
    const exit = cancelOrderByTutor(order, now);
    const refund = exit.refund;

    const cancelled = await this.orders.transition(exit, 'PLACED', async (context) => {
      // ⚠️ Nothing in here may swallow an error: it runs inside the
      // transaction, so a failure correctly rolls the cancellation back — but a
      // `catch` would leave a CANCELLED order with no refund.
      if (refund) {
        await this.recordRefund.execute(
          {
            orderId: order.id,
            orderItemId: refund.orderItemId,
            reason: refund.reason,
            amountCents: refund.amountCents,
          },
          context,
        );
      }

      await this.auditTrail.record(
        {
          actorKind: 'USER',
          actorUserId: userId,
          action: 'order.cancelled',
          entityType: 'order',
          entityId: order.id,
          storeId: order.storeId,
          // Ids, states and amounts only. The name, the phone and the address
          // are on the order and must not be copied into a table that outlives
          // it (SECURITY §Auditoria).
          payload: {
            from: 'PLACED',
            to: 'CANCELLED',
            reason: refund?.reason ?? null,
            refundAmountCents: refund?.amountCents ?? 0,
          },
          requestId,
        },
        context,
      );
    });

    if (!cancelled) {
      // Zero rows affected: somebody moved the order between the read and the
      // write — the store accepted it, or the sweeper expired it.
      throw new InvalidOrderTransitionError(order.status, 'CANCELLED');
    }

    this.logger.log(
      `order cancelled by tutor (orderId=${cancelled.id}, code=${cancelled.code}, ` +
        `storeId=${cancelled.storeId}, tutorId=${tutorId}, userId=${userId})`,
    );

    return toOrderContract(cancelled, await this.storeSummaryOf.execute(cancelled.storeId));
  }
}
