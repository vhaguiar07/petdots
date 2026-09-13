import { Injectable } from '@nestjs/common';
import type { Offer as PrismaOffer } from '@prisma/client';

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

    return rows.map(toOffer);
  }

  async findAvailableByStore(storeId: string): Promise<Offer[]> {
    const rows = await this.prisma.offer.findMany({ where: { storeId, available: true } });

    return rows.map(toOffer);
  }

  async findByIdsForStore(storeId: string, offerIds: readonly string[]): Promise<Offer[]> {
    if (offerIds.length === 0) {
      return [];
    }

    // No `available` filter on purpose: the use case needs to tell "not on the
    // shelf" from "not ours", and both look the same once the row is gone.
    const rows = await this.prisma.offer.findMany({
      where: { storeId, id: { in: [...new Set(offerIds)] } },
    });

    return rows.map(toOffer);
  }
}

function toOffer(row: PrismaOffer): Offer {
  return {
    id: row.id,
    storeId: row.storeId,
    productId: row.productId,
    priceCents: row.priceCents,
    available: row.available,
    priceUpdatedAt: row.priceUpdatedAt,
  };
}
