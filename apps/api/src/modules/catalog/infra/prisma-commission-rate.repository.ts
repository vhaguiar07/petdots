import { Injectable } from '@nestjs/common';
import type { CommissionRateRule } from '@petdots/domain';
import type { CommissionRate as PrismaCommissionRate } from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service.js';
import type { ICommissionRateRepository } from '../domain/icommission-rate.repository.js';

@Injectable()
export class PrismaCommissionRateRepository implements ICommissionRateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findValidAt(at: Date): Promise<CommissionRateRule[]> {
    const rows = await this.prisma.commissionRate.findMany({
      where: {
        validFrom: { lte: at },
        // Same window as `isRuleValidAt`: `valid_from` inclusive, `valid_to`
        // exclusive, so consecutive rates leave neither gap nor overlap.
        OR: [{ validTo: null }, { validTo: { gt: at } }],
      },
    });

    return rows.map(toRule);
  }
}

function toRule(row: PrismaCommissionRate): CommissionRateRule {
  return {
    category: row.category,
    rateBps: row.rateBps,
    validFrom: row.validFrom,
    validTo: row.validTo,
  };
}
