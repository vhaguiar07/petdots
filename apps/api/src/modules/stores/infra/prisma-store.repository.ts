import { Injectable } from '@nestjs/common';
import { postalCodeRangeSchema } from '@petdots/contracts';
import type { PostalCodeRange } from '@petdots/domain';
import type { DeliveryArea as PrismaDeliveryArea, Store as PrismaStore } from '@prisma/client';
import { z } from 'zod';

import { PrismaService } from '../../../prisma/prisma.service.js';
import type { IStoreRepository } from '../domain/istore.repository.js';
import type { StoreWithAreas } from '../domain/store.js';

const postalCodeRangesSchema = z.array(postalCodeRangeSchema);

@Injectable()
export class PrismaStoreRepository implements IStoreRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<StoreWithAreas | null> {
    const row = await this.prisma.store.findUnique({
      where: { id },
      include: {
        deliveryAreas: {
          where: { active: true },
          // Deterministic order, so two identical requests answer identically.
          orderBy: { label: 'asc' },
        },
      },
    });

    return row ? toStoreWithAreas(row) : null;
  }
}

function toStoreWithAreas(
  row: PrismaStore & { deliveryAreas: PrismaDeliveryArea[] },
): StoreWithAreas {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    neighborhood: row.neighborhood,
    status: row.status,
    deliveryAreas: row.deliveryAreas.map((area) => ({
      id: area.id,
      storeId: area.storeId,
      label: area.label,
      neighborhoods: area.neighborhoods,
      postalCodeRanges: parsePostalCodeRanges(area.postalCodeRanges, area.id),
      deliveryFeeCents: area.deliveryFeeCents,
      estimatedMinutes: area.estimatedMinutes,
      active: area.active,
    })),
  };
}

/**
 * Parses the JSONB column instead of casting it — the same rule the coverage
 * repository applies, and for the same reason: malformed data must raise rather
 * than quietly shrink a store's delivery area.
 */
function parsePostalCodeRanges(value: unknown, areaId: string): PostalCodeRange[] {
  const parsed = postalCodeRangesSchema.safeParse(value);

  if (!parsed.success) {
    throw new Error(`delivery area ${areaId} has malformed postal_code_ranges`);
  }

  return parsed.data;
}
