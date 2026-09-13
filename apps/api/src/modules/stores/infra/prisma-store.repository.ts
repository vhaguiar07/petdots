import { Injectable } from '@nestjs/common';
import { openingHoursSchema, postalCodeRangeSchema } from '@petdots/contracts';
import type { OpeningInterval, PostalCodeRange } from '@petdots/domain';
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
    openingHours: parseOpeningHours(row.openingHours, row.id),
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

/**
 * Same rule for the weekly schedule: parsed, never cast.
 *
 * 🔴 Raising rather than defaulting to `[]` is the point. An empty schedule is
 * a legitimate value meaning "never open", so a malformed one silently becoming
 * empty would look identical to a store that deliberately takes no orders — and
 * the shopfront would say "Fechada" forever with nobody knowing why.
 */
function parseOpeningHours(value: unknown, storeId: string): OpeningInterval[] {
  const parsed = openingHoursSchema.safeParse(value);

  if (!parsed.success) {
    throw new Error(`store ${storeId} has malformed opening_hours`);
  }

  return parsed.data;
}
