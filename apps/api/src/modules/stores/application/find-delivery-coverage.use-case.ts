import { Inject, Injectable } from '@nestjs/common';
import { type AddressQuery, areaCoversAddress } from '@petdots/domain';

import type { DeliveryArea } from '../domain/delivery-area.js';
import {
  DELIVERY_AREA_REPOSITORY,
  type DeliveryAreaOfStore,
  type IDeliveryAreaRepository,
} from '../domain/idelivery-area.repository.js';
import type { StoreSummary } from '../domain/store.js';

export interface CoveredStore {
  store: StoreSummary;
  /** Null when the visitor gave no address: no area applies yet. */
  area: DeliveryArea | null;
}

@Injectable()
export class FindDeliveryCoverageUseCase {
  constructor(
    @Inject(DELIVERY_AREA_REPOSITORY)
    private readonly repository: IDeliveryAreaRepository,
  ) {}

  /**
   * Which stores deliver to this address, and through which area.
   *
   * The filtering happens in memory, over every active area of every listable
   * store: the pilot has dozens of areas, the rule is a pure function that a
   * unit test can exercise (ADR-0004 #12), and SQL over a JSONB column would
   * bury it. Trigger to move it to the database: more than ~200 active areas
   * (ADR-0010, A7).
   */
  async execute(address: AddressQuery): Promise<CoveredStore[]> {
    const areas = await this.repository.findActiveOfListableStores();

    if (!hasAddress(address)) {
      return withoutAddress(areas);
    }

    const covered = new Map<string, CoveredStore>();

    for (const { area, store } of areas) {
      if (!areaCoversAddress(area, address)) {
        continue;
      }

      const current = covered.get(store.id);

      // A store may cover the same address through two areas — a wide one and a
      // cheap one. The visitor pays the cheapest, so that is the one shown.
      if (!current?.area || isBetter(area, current.area)) {
        covered.set(store.id, { store, area });
      }
    }

    return [...covered.values()];
  }

  /**
   * The areas themselves, for `GET /delivery-areas`: the ones covering the
   * address, or all the active ones when there is no address — which is how the
   * landing fills its neighbourhood picker.
   */
  async listActiveAreas(address: AddressQuery): Promise<DeliveryAreaOfStore[]> {
    const areas = await this.repository.findActiveOfListableStores();

    if (!hasAddress(address)) {
      return areas;
    }

    return areas.filter(({ area }) => areaCoversAddress(area, address));
  }
}

function hasAddress(address: AddressQuery): boolean {
  return Boolean(address.neighborhood?.trim() ?? '') || Boolean(address.postalCode?.trim() ?? '');
}

/** Cheaper first; a tie on price goes to the faster area. */
function isBetter(candidate: DeliveryArea, current: DeliveryArea): boolean {
  if (candidate.deliveryFeeCents !== current.deliveryFeeCents) {
    return candidate.deliveryFeeCents < current.deliveryFeeCents;
  }

  return candidate.estimatedMinutes < current.estimatedMinutes;
}

/** Every listable store with at least one active area, with no area chosen. */
function withoutAddress(areas: DeliveryAreaOfStore[]): CoveredStore[] {
  const stores = new Map<string, CoveredStore>();

  for (const { store } of areas) {
    if (!stores.has(store.id)) {
      stores.set(store.id, { store, area: null });
    }
  }

  return [...stores.values()];
}
