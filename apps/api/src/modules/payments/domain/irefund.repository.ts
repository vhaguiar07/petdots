import type { PersistenceContext } from '../../../prisma/persistence-context.js';
import type { NewRefund, Refund } from './refund.js';

/** Injection token for the port — the domain never names its adapter. */
export const REFUND_REPOSITORY = Symbol('IRefundRepository');

export interface IRefundRepository {
  /**
   * Records a refund as `PENDING`.
   *
   * `context` is what puts the row in the **same transaction** as the order
   * transition that caused it. An exit without its refund is the one outcome
   * ADR-0014 does not allow, and unlike the pd-14's two writes, retrying would
   * not repair it.
   */
  create(refund: NewRefund, context?: PersistenceContext): Promise<Refund>;
  listByOrder(orderId: string): Promise<Refund[]>;
}
