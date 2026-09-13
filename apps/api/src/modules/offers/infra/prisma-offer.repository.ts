import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Offer as PrismaOffer, Prisma as PrismaTypes } from '@prisma/client';

import { toPersistenceContext } from '../../../prisma/persistence-context.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type {
  IOfferRepository,
  NewOffer,
  NewOfferSideEffects,
  OfferSideEffects,
} from '../domain/ioffer.repository.js';
import type { Offer } from '../domain/offer.js';
import { OfferAlreadyExistsError } from '../domain/offer-errors.js';

const UNIQUE_VIOLATION = 'P2002';

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

  async findAllByStore(storeId: string): Promise<Offer[]> {
    // No `available` filter: the panel manages what is switched off, and it
    // cannot switch back on what it cannot see.
    const rows = await this.prisma.offer.findMany({ where: { storeId } });

    return rows.map(toOffer);
  }

  async findByIdForStore(offerId: string, storeId: string): Promise<Offer | null> {
    // 🔴 `storeId` is part of the query, not a check afterwards.
    const row = await this.prisma.offer.findFirst({ where: { id: offerId, storeId } });

    return row ? toOffer(row) : null;
  }

  async changePrice(
    offerId: string,
    storeId: string,
    priceCents: number,
    now: Date,
    sideEffects: OfferSideEffects,
  ): Promise<Offer | null> {
    return this.write(offerId, storeId, { priceCents, priceUpdatedAt: now }, sideEffects);
  }

  async changeAvailability(
    offerId: string,
    storeId: string,
    available: boolean,
    sideEffects: OfferSideEffects,
  ): Promise<Offer | null> {
    return this.write(offerId, storeId, { available }, sideEffects);
  }

  async create(offer: NewOffer, sideEffects: NewOfferSideEffects): Promise<Offer> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const row = await tx.offer.create({
          data: {
            storeId: offer.storeId,
            productId: offer.productId,
            priceCents: offer.priceCents,
            available: offer.available,
            priceUpdatedAt: offer.priceUpdatedAt,
          },
        });

        const created = toOffer(row);

        // Handed the created row: the audit line names the offer by the id the
        // database just minted, not by the product it points at.
        await sideEffects(created, toPersistenceContext(tx));

        return created;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_VIOLATION
      ) {
        // The constraint is the invariant: one price per store per product.
        throw new OfferAlreadyExistsError(offer.storeId, offer.productId);
      }

      throw error;
    }
  }

  /**
   * The shape both writes share: an `updateMany` carrying `storeId` in its
   * `where`, so an offer of another store affects zero rows and answers
   * `null` — the ownership is the query, exactly as it is for an order.
   */
  private async write(
    offerId: string,
    storeId: string,
    data: PrismaTypes.OfferUpdateManyMutationInput,
    sideEffects: OfferSideEffects,
  ): Promise<Offer | null> {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.offer.updateMany({ where: { id: offerId, storeId }, data });

      if (count === 0) {
        return null;
      }

      await sideEffects(toPersistenceContext(tx));

      const row = await tx.offer.findUniqueOrThrow({ where: { id: offerId } });

      return toOffer(row);
    });
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
