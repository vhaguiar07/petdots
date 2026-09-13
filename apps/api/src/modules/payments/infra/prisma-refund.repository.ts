import { Injectable } from '@nestjs/common';
import type { Refund as PrismaRefund } from '@prisma/client';

import {
  asPrismaTransaction,
  type PersistenceContext,
} from '../../../prisma/persistence-context.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type { IRefundRepository } from '../domain/irefund.repository.js';
import type { NewRefund, Refund } from '../domain/refund.js';

@Injectable()
export class PrismaRefundRepository implements IRefundRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(refund: NewRefund, context?: PersistenceContext): Promise<Refund> {
    const client = context ? asPrismaTransaction(context) : this.prisma;

    const row = await client.refund.create({
      data: {
        orderId: refund.orderId,
        orderItemId: refund.orderItemId,
        reason: refund.reason,
        amountCents: refund.amountCents,
        // `paymentId` and `pspRefundId` stay null: there is no PSP yet, and the
        // row is the record of what is owed, not of what was sent (pd-17).
      },
    });

    return toRefund(row);
  }

  async listByOrder(orderId: string): Promise<Refund[]> {
    const rows = await this.prisma.refund.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' },
    });

    return rows.map(toRefund);
  }
}

function toRefund(row: PrismaRefund): Refund {
  return {
    id: row.id,
    paymentId: row.paymentId,
    orderId: row.orderId,
    orderItemId: row.orderItemId,
    reason: row.reason,
    amountCents: row.amountCents,
    status: row.status,
    pspRefundId: row.pspRefundId,
    createdAt: row.createdAt,
    completedAt: row.completedAt,
  };
}
