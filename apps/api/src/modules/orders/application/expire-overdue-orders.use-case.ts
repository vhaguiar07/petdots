import { Inject, Injectable, Logger } from '@nestjs/common';

import { AUDIT_TRAIL, type IAuditTrail } from '../../../audit/audit-trail.port.js';
import { RecordRefundUseCase } from '../../payments/application/record-refund.use-case.js';
import { type IOrderRepository, ORDER_REPOSITORY } from '../domain/iorder.repository.js';
import { expireAcceptance } from '../domain/order.js';

/**
 * The advisory-lock key of the sweep. A constant, because two processes must
 * pick the same number to be excluded by it.
 */
export const ORDER_EXPIRY_LOCK_KEY = 7_150_001;

/** How many orders one pass handles. A bounded sweep never blocks the loop. */
export const ORDER_EXPIRY_BATCH = 100;

/**
 * 🔴 Auto-rejects orders whose acceptance window ran out (ADR-0014, C2/C7).
 *
 * Without it a `PLACED` order never leaves that state and the only way out is
 * the tutor cancelling — which is the worst case the whole ADR exists to
 * prevent: money debited, nobody answering, no exit.
 *
 * **Reentrant twice over, deliberately.** The advisory lock keeps two instances
 * from sweeping at once, and it is taken *inside* the transaction that does the
 * work, because `pg_try_advisory_xact_lock` is released when that transaction
 * ends — a lock taken outside one protects nothing. And underneath it, each
 * transition is a compare-and-set on the status, so even if the lock were
 * removed entirely, two passes would still produce **one** rejection, **one**
 * refund and **one** audit line. The e2e proves the second guarantee by running
 * two sweeps concurrently.
 *
 * ⚠️ This is the first refusal in the project with **no human and no request**
 * behind it, and it is why the audit trail is a port called by the application
 * rather than an HTTP interceptor (ADR-0017): an interceptor would never see
 * this happen.
 */
@Injectable()
export class ExpireOverdueOrdersUseCase {
  private readonly logger = new Logger(ExpireOverdueOrdersUseCase.name);

  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orders: IOrderRepository,
    @Inject(AUDIT_TRAIL)
    private readonly auditTrail: IAuditTrail,
    private readonly recordRefund: RecordRefundUseCase,
  ) {}

  async execute(now: Date = new Date()): Promise<{ expired: number }> {
    const expired = await this.orders.withAdvisoryLock(ORDER_EXPIRY_LOCK_KEY, async (context) => {
      const overdue = await this.orders.findOverdue(now, ORDER_EXPIRY_BATCH, context);
      let count = 0;

      for (const order of overdue) {
        const exit = expireAcceptance(order, now);
        const refund = exit.refund;

        const rejected = await this.orders.transition(
          exit,
          'PLACED',
          async (inner) => {
            if (refund) {
              await this.recordRefund.execute(
                {
                  orderId: order.id,
                  orderItemId: refund.orderItemId,
                  reason: refund.reason,
                  amountCents: refund.amountCents,
                },
                inner,
              );
            }

            await this.auditTrail.record(
              {
                // No user: this is the platform acting on a clock.
                actorKind: 'SYSTEM',
                actorUserId: null,
                action: 'order.rejected',
                entityType: 'order',
                entityId: order.id,
                storeId: order.storeId,
                payload: {
                  from: 'PLACED',
                  to: 'REJECTED',
                  reason: 'ACCEPTANCE_EXPIRED',
                  refundAmountCents: refund?.amountCents ?? 0,
                },
                // There is no request behind a job, and pretending otherwise
                // would put a fake correlation id in a permanent table.
                requestId: null,
              },
              inner,
            );
          },
          context,
        );

        if (rejected) {
          count += 1;
        }
      }

      return count;
    });

    // `null` means another process holds the lock — nothing to report.
    if (expired === null) {
      return { expired: 0 };
    }

    // One line per sweep, and only when something moved: a job that runs every
    // minute and logs every time is a job that buries everything else.
    if (expired > 0) {
      this.logger.log(`acceptance window swept: ${String(expired)} order(s) auto-rejected`);
    }

    return { expired };
  }
}
