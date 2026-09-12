import { Inject, Injectable } from '@nestjs/common';
import type { StoreOffer } from '@petdots/contracts';

import { ListProductsByIdsUseCase } from '../../catalog/application/list-products-by-ids.use-case.js';
import { FindStoreUseCase } from '../../stores/application/find-store.use-case.js';
import { type IOfferRepository, OFFER_REPOSITORY } from '../domain/ioffer.repository.js';

/** Portuguese ordering, so "Ácido" and "Acido" sort where a reader expects. */
const BY_NAME = new Intl.Collator('pt-BR');

/**
 * One store's shelf: what it sells today, and for how much.
 *
 * The mirror of `CompareOffersUseCase` and built the same way — three
 * aggregates, no JOIN across the boundary (CODING_STANDARDS, ADR-0010 A13).
 * The products are resolved in a single batch rather than one lookup per line:
 * a shopfront of fifty items must not become fifty queries.
 *
 * The store is resolved **first**, and its `StoreNotFoundError` is left to
 * propagate: a paused store must answer 404 here exactly as it does on its own
 * page, or the page would exist with an empty shelf (pd-13, A15).
 */
@Injectable()
export class ListStoreOffersUseCase {
  constructor(
    @Inject(OFFER_REPOSITORY)
    private readonly repository: IOfferRepository,
    private readonly findStore: FindStoreUseCase,
    private readonly listProducts: ListProductsByIdsUseCase,
  ) {}

  async execute(storeId: string): Promise<StoreOffer[]> {
    await this.findStore.execute(storeId);

    const offers = await this.repository.findAvailableByStore(storeId);
    const products = await this.listProducts.execute(offers.map((offer) => offer.productId));
    const byId = new Map(products.map((product) => [product.id, product]));

    return offers
      .flatMap((offer): StoreOffer[] => {
        const product = byId.get(offer.productId);

        // An offer over a product that was deactivated is dropped, not an
        // error: the shelf shows what a visitor can actually buy.
        if (!product) {
          return [];
        }

        return [
          {
            offerId: offer.id,
            priceCents: offer.priceCents,
            priceUpdatedAt: offer.priceUpdatedAt.toISOString(),
            product: {
              id: product.id,
              slug: product.slug,
              name: product.name,
              brand: product.brand,
              variant: product.variant,
            },
          },
        ];
      })
      .sort((a, b) => BY_NAME.compare(a.product.name, b.product.name));
  }
}
