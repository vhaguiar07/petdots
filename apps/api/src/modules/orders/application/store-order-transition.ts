import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Order as OrderContract, OrderStatus, StoreRole } from '@petdots/contracts';

import {
  AUDIT_TRAIL,
  type AuditPayload,
  type IAuditTrail,
} from '../../../audit/audit-trail.port.js';
import { RecordRefundUseCase } from '../../payments/application/record-refund.use-case.js';
import { InvalidOrderTransitionError } from '../domain/invalid-order-transition.error.js';
import { type IOrderRepository, ORDER_REPOSITORY } from '../domain/iorder.repository.js';
import type { Order, OrderExit } from '../domain/order.js';
import { OrderNotFoundError } from '../domain/order-errors.js';
import { toOrderContract } from './order-contract.js';
import { StoreSummaryOf } from './store-summary-of.js';

/** Who is moving the order, resolved from the token and from the membership. */
export interface StoreActor {
  userId: string;
  storeId: string;
  storeRole: StoreRole;
  requestId: string | null;
}

export interface StoreTransitionInput {
  actor: StoreActor;
  orderId: string;
  /** `domain.action` for the audit line, e.g. `order.accepted`. */
  action: string;
  /** The status the compare-and-set requires the row to still be in. */
  expectedStatus: OrderStatus;
  /** The pure domain function that decides the exit. May raise. */
  exitOf: (order: Order) => OrderExit;
  /** Facts only this action knows — the line id, whether the order died. */
  payloadOf?: (exit: OrderExit) => AuditPayload;
  /** What the log line says, given the order in its new state. */
  logOf: (order: Order) => string;
}

/**
 * 🔴 One store transition, end to end: read the order of **this** store, let the
 * domain decide the exit, and write the three things that must land together —
 * the status, the `Refund` the exit produces, and the audit line.
 *
 * This is the shape `CancelOrderByTutorUseCase` already had. It is factored out
 * because pd-16 adds **six** more actions owing exactly the same thing, and six
 * copies would be six chances to forget the refund — an exit without one is
 * money that stopped existing (ADR-0014, C5). What each use case supplies is
 * only what makes it different: the domain function, the expected status, and
 * the name of the action.
 *
 * The compare-and-set underneath is what makes a double tap safe: the second
 * request finds the order no longer in `expectedStatus`, affects zero rows, and
 * the side effects **never run**. It is also why the concurrency sentinel — the
 * store accepting while the tutor cancels — can only produce one winner, one
 * refund and one audit row.
 *
 * ⚠️ Nothing inside the side effects may swallow an error. They run inside the
 * transaction, so a failure correctly rolls the transition back; a `catch` in
 * there would leave a `REJECTED` order with no refund.
 */
@Injectable()
export class StoreOrderTransition {
  private readonly logger = new Logger(StoreOrderTransition.name);

  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orders: IOrderRepository,
    @Inject(AUDIT_TRAIL)
    private readonly auditTrail: IAuditTrail,
    private readonly recordRefund: RecordRefundUseCase,
    private readonly storeSummaryOf: StoreSummaryOf,
  ) {}

  async run(input: StoreTransitionInput): Promise<OrderContract> {
    const { actor, orderId, action, expectedStatus, exitOf, payloadOf, logOf } = input;

    // 🔴 `storeId` in the `where`: an order of another store is simply not
    // found, and answers the same `404` a made-up id does.
    const order = await this.orders.findByIdForStore(orderId, actor.storeId);

    if (!order) {
      throw new OrderNotFoundError(orderId);
    }

    // Raises on a move the state machine does not allow — the first of the two
    // locks; the compare-and-set below is the second.
    const exit = exitOf(order);
    const refund = exit.refund;

    const moved = await this.orders.transition(exit, expectedStatus, async (context) => {
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
          actorUserId: actor.userId,
          action,
          entityType: 'order',
          entityId: order.id,
          storeId: actor.storeId,
          // Ids, states, reasons and amounts. **Never** the contact name, the
          // phone, the address, or the free-text cancellation reason — that
          // sentence may name the tutor, and this table outlives the order
          // (SECURITY §Auditoria).
          payload: {
            from: order.status,
            to: exit.order.status,
            reason: refund?.reason ?? null,
            refundAmountCents: refund?.amountCents ?? 0,
            // 🔴 Which role acted. This is the traceability ADR-0013 used to
            // reject "one login per store" — who accepted each order — and it
            // costs no column.
            storeRole: actor.storeRole,
            ...payloadOf?.(exit),
          },
          requestId: actor.requestId,
        },
        context,
      );
    });

    if (!moved) {
      // Zero rows affected: somebody moved the order between the read and the
      // write — the tutor cancelled it, or the sweeper expired it.
      throw new InvalidOrderTransitionError(order.status, exit.order.status);
    }

    this.logger.log(logOf(moved));

    return toOrderContract(moved, await this.storeSummaryOf.execute(moved.storeId));
  }
}
