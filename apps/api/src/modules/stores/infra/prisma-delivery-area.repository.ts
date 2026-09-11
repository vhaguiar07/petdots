import { Injectable } from '@nestjs/common';
import { postalCodeRangeSchema } from '@petdots/contracts';
import type { PostalCodeRange } from '@petdots/domain';
import type { DeliveryArea as PrismaDeliveryArea, Store as PrismaStore } from '@prisma/client';
import { z } from 'zod';

import { PrismaService } from '../../../prisma/prisma.service.js';
import type {
  DeliveryAreaOfStore,
  IDeliveryAreaRepository,
} from '../domain/idelivery-area.repository.js';

const postalCodeRangesSchema = z.array(postalCodeRangeSchema);

@Injectable()
export class PrismaDeliveryAreaRepository implements IDeliveryAreaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveOfListableStores(): Promise<DeliveryAreaOfStore[]> {
    const rows = await this.prisma.deliveryArea.findMany({
      where: { active: true, store: { status: { not: 'PAUSED' } } },
      include: { store: true },
      // Deterministic order, so two identical requests answer identically.
      orderBy: [{ store: { name: 'asc' } }, { label: 'asc' }],
    });

    return rows.map(toDeliveryAreaOfStore);
  }
}

function toDeliveryAreaOfStore(
  row: PrismaDeliveryArea & { store: PrismaStore },
): DeliveryAreaOfStore {
  return {
    area: {
      id: row.id,
      storeId: row.storeId,
      label: row.label,
      neighborhoods: row.neighborhoods,
      postalCodeRanges: parsePostalCodeRanges(row.postalCodeRanges, row.id),
      deliveryFeeCents: row.deliveryFeeCents,
      estimatedMinutes: row.estimatedMinutes,
      active: row.active,
    },
    store: {
      id: row.store.id,
      slug: row.store.slug,
      name: row.store.name,
      neighborhood: row.store.neighborhood,
    },
  };
}

/**
 * Parses the JSONB column instead of casting it.
 *
 * Malformed data raises, and deliberately so: swallowing it into an empty array
 * would silently shrink a store's delivery area, and the visitor would be told
 * "nobody delivers here" by a bug rather than by the map.
 */
function parsePostalCodeRanges(value: unknown, areaId: string): PostalCodeRange[] {
  const parsed = postalCodeRangesSchema.safeParse(value);

  if (!parsed.success) {
    throw new Error(`delivery area ${areaId} has malformed postal_code_ranges`);
  }

  return parsed.data;
}
