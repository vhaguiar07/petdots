import { Injectable } from '@nestjs/common';

import { FindStoreUseCase } from '../../stores/application/find-store.use-case.js';
import { StoreNotFoundError } from '../../stores/domain/store-not-found.error.js';
import type { StoreSummaryOfOrder } from './order-contract.js';

/**
 * The store's name for the screen, for an order that must stay readable
 * whatever happened to the shop afterwards.
 *
 * ⚠️ A store that has since been **paused** raises `StoreNotFoundError` in
 * `FindStoreUseCase` — right for the public shopfront, wrong for an order, which
 * is an accounting record of something that already happened. So the failure
 * falls back to the ids the order itself carries: the page still renders, with a
 * name it no longer has a source for.
 *
 * Extracted in pd-16 from `FindMyOrderUseCase`, where it was a private method,
 * because the store's half of the order needs the identical fallback — and two
 * copies would eventually disagree about which side tolerates a paused shop.
 */
@Injectable()
export class StoreSummaryOf {
  constructor(private readonly findStore: FindStoreUseCase) {}

  async execute(storeId: string): Promise<StoreSummaryOfOrder> {
    try {
      const store = await this.findStore.execute(storeId);

      return {
        id: store.id,
        slug: store.slug,
        name: store.name,
        neighborhood: store.neighborhood,
      };
    } catch (error) {
      if (!(error instanceof StoreNotFoundError)) {
        throw error;
      }

      return { id: storeId, slug: '', name: '', neighborhood: '' };
    }
  }
}
