import { Module } from '@nestjs/common';

import { RecordRefundUseCase } from './application/record-refund.use-case.js';
import { REFUND_REPOSITORY } from './domain/irefund.repository.js';
import { PrismaRefundRepository } from './infra/prisma-refund.repository.js';

/**
 * `payments`, born with the single responsibility that already has a producer:
 * recording a refund.
 *
 * ⚠️ **No controller, no PSP, no `payments` or `payouts` table.** The intent,
 * the split, the webhook and the payout are pd-17. What exists here is
 * `refunds`, and it is here rather than inside `orders` because
 * `SYSTEM_ARCHITECTURE` gives the table to this module — creating it next door
 * and moving it in two weeks would be churn with a migration attached.
 */
@Module({
  providers: [
    RecordRefundUseCase,
    { provide: REFUND_REPOSITORY, useClass: PrismaRefundRepository },
  ],
  // `orders` produces every refund there is; it may not write `refunds` itself
  // (CODING_STANDARDS).
  exports: [RecordRefundUseCase],
})
export class PaymentsModule {}
