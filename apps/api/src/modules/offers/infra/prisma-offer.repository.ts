import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service.js';
import type { IOfferRepository } from '../domain/ioffer.repository.js';
import type { Offer } from '../domain/offer.js';

@Injectable()
export class PrismaOfferRepository implements IOfferRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAvailableByProduct(productId: string, storeIds: readonly string[]): Promise<Offer[]> {
    // Nobody delivers to this address: there is nothing to ask the database.
    if (storeIds.length === 0) {
      return [];
    }

    const rows = await this.prisma.offer.findMany({
      where: { productId, available: true, storeId: { in: [...storeIds] } },
    });

    return rows.map((row) => ({
      id: row.id,
      storeId: row.storeId,
      productId: row.productId,
      priceCents: row.priceCents,
      available: row.available,
      priceUpdatedAt: row.priceUpdatedAt,
    }));
  }
}
