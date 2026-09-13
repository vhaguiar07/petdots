import { Inject, Injectable } from '@nestjs/common';

import { type IOfferRepository, OFFER_REPOSITORY } from '../domain/ioffer.repository.js';
import type { Offer } from '../domain/offer.js';

/**
 * The offers a cart names, resolved against **one** store.
 *
 * Exported by `OffersModule` so `orders` can price a cart without reading
 * `offers` itself (CODING_STANDARDS) — the same reason `catalog` exports
 * `ListProductsByIdsUseCase`.
 *
 * It deliberately hands back **whatever exists**, unavailable rows included,
 * and refuses nothing: deciding that a missing id is `422 ORDER_ITEMS_INVALID`
 * while an unavailable one is `409 OFFER_UNAVAILABLE` is a rule of the order,
 * and it belongs where the order is built. Answering with a filtered list here
 * would destroy the distinction before anyone could make it.
 */
@Injectable()
export class FindOffersForOrderUseCase {
  constructor(
    @Inject(OFFER_REPOSITORY)
    private readonly repository: IOfferRepository,
  ) {}

  async execute(storeId: string, offerIds: readonly string[]): Promise<Offer[]> {
    return this.repository.findByIdsForStore(storeId, offerIds);
  }
}
