import type { RefundReason, RefundStatus } from '@petdots/contracts';

/**
 * Money on its way back (DOMAIN_MODEL §Devolução, ADR-0014 C5).
 *
 * A **new record, never an edit** of the payment — that is what keeps the order
 * an accounting record under fiscal retention.
 */
export interface Refund {
  id: string;
  /** Null until `payments` exists (pd-17). */
  paymentId: string | null;
  orderId: string;
  /** Null on a total refund; names the line on a partial one. */
  orderItemId: string | null;
  reason: RefundReason;
  amountCents: number;
  status: RefundStatus;
  pspRefundId: string | null;
  createdAt: Date;
  completedAt: Date | null;
}

/** What a caller has to supply. The status is always `PENDING` at birth. */
export interface NewRefund {
  orderId: string;
  orderItemId: string | null;
  reason: RefundReason;
  amountCents: number;
}
