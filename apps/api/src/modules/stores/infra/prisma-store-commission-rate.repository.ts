import { Injectable } from '@nestjs/common';
import type { StoreCommissionRateRule } from '@petdots/domain';
import type { StoreCommissionRate as PrismaStoreCommissionRate } from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service.js';
import type { IStoreCommissionRateRepository } from '../domain/istore-commission-rate.repository.js';

@Injectable()
export class PrismaStoreCommissionRateRepository implements IStoreCommissionRateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findValidAt(storeId: string, at: Date): Promise<StoreCommissionRateRule[]> {
    const rows = await this.prisma.storeCommissionRate.findMany({
      where: {
        storeId,
        validFrom: { lte: at },
        // `valid_from` inclusive, `valid_to` exclusive — the same window the
        // pure `isRuleValidAt` applies, so SQL and the domain never disagree
        // about a rate that ends exactly when the next one begins.
        OR: [{ validTo: null }, { validTo: { gt: at } }],
      },
    });

    return rows.map(toRule);
  }
}

function toRule(row: PrismaStoreCommissionRate): StoreCommissionRateRule {
  return {
    storeId: row.storeId,
    category: row.category,
    rateBps: row.rateBps,
    validFrom: row.validFrom,
    validTo: row.validTo,
  };
}
