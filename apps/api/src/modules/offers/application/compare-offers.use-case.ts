import { Inject, Injectable } from '@nestjs/common';
import type { ComparedOffer, CompareOffersQuery } from '@petdots/contracts';
import {
  type AddressQuery,
  compareByItemPrice,
  compareByLandedPrice,
  type LandedOffer,
  landedPriceCents,
  normalizePostalCode,
} from '@petdots/domain';

import { FindProductUseCase } from '../../catalog/application/find-product.use-case.js';
import {
  type CoveredStore,
  FindDeliveryCoverageUseCase,
} from '../../stores/application/find-delivery-coverage.use-case.js';
import { type IOfferRepository, OFFER_REPOSITORY } from '../domain/ioffer.repository.js';

/**
 * The comparator (J2): who sells this product, for how much, delivered.
 *
 * There is no JOIN across `products`, `stores` and `offers` even though one
 * query would do. A module only reads its own tables and integrates with
 * another through its use cases (CODING_STANDARDS, ADR-0010 A13); the join
 * happens in memory, over the dozens of rows a pilot produces. The cost today
 * is two small extra queries.
 *
 * The ranking is the minimum explicit rule (ADR-0010, A11): with an address,
 * the landed price — item plus delivery — ascending, because ranking by the
 * item alone would promote the store that charges for the trip. Without an
 * address, the item price, and the page says the total is unknown. Reputation
 * or lead time as a primary criterion is a revenue allocation policy and stays
 * an open decision.
 */
@Injectable()
export class CompareOffersUseCase {
  constructor(
    @Inject(OFFER_REPOSITORY)
    private readonly repository: IOfferRepository,
    private readonly findProduct: FindProductUseCase,
    private readonly findCoverage: FindDeliveryCoverageUseCase,
  ) {}

  async execute(query: CompareOffersQuery): Promise<ComparedOffer[]> {
    // Raises `ProductNotFoundError`, which the controller turns into a 404: for
    // the comparator that is more useful than an empty list, which means
    // "nobody delivers here" (ADR-0010, A19).
    await this.findProduct.execute(query.productId);

    const address: AddressQuery = {
      neighborhood: query.neighborhood?.trim() || undefined,
      postalCode: query.postalCode ? normalizePostalCode(query.postalCode) : undefined,
    };

    const covered = await this.findCoverage.execute(address);
    const offers = await this.repository.findAvailableByProduct(
      query.productId,
      covered.map((store) => store.store.id),
    );

    const byStoreId = new Map<string, CoveredStore>(
      covered.map((store) => [store.store.id, store]),
    );

    const compared = offers.flatMap((offer): ComparedOffer[] => {
      const match = byStoreId.get(offer.storeId);

      if (!match) {
        return [];
      }

      const { area, store } = match;

      return [
        {
          offerId: offer.id,
          priceCents: offer.priceCents,
          priceUpdatedAt: offer.priceUpdatedAt.toISOString(),
          store,
          deliveryArea: area
            ? {
                label: area.label,
                deliveryFeeCents: area.deliveryFeeCents,
                estimatedMinutes: area.estimatedMinutes,
              }
            : null,
          landedCents: area ? landedPriceCents(offer.priceCents, area.deliveryFeeCents) : null,
        },
      ];
    });

    return sort(compared, Boolean(address.neighborhood ?? address.postalCode));
  }
}

/** Which ranking applies is decided by the address, not by the rows. */
function sort(offers: ComparedOffer[], hasAddress: boolean): ComparedOffer[] {
  if (!hasAddress) {
    return offers.sort((a, b) =>
      compareByItemPrice(
        { priceCents: a.priceCents, storeName: a.store.name },
        { priceCents: b.priceCents, storeName: b.store.name },
      ),
    );
  }

  return offers.sort((a, b) => compareByLandedPrice(toLanded(a), toLanded(b)));
}

function toLanded(offer: ComparedOffer): LandedOffer {
  return {
    // With an address every listed store came through a covering area, so both
    // fields are present; the fallbacks only satisfy the type.
    landedCents: offer.landedCents ?? offer.priceCents,
    estimatedMinutes: offer.deliveryArea?.estimatedMinutes ?? 0,
    storeName: offer.store.name,
  };
}
