import { Inject, Injectable, Logger } from '@nestjs/common';
import type { CreateStoreOffer } from '@petdots/contracts';
import { assertProductCanBeOffered } from '@petdots/domain';

import { AUDIT_TRAIL, type IAuditTrail } from '../../../audit/audit-trail.port.js';
import { FindProductUseCase } from '../../catalog/application/find-product.use-case.js';
import { type IOfferRepository, OFFER_REPOSITORY } from '../domain/ioffer.repository.js';
import type { Offer } from '../domain/offer.js';
import type { OfferActor } from './update-offer-price.use-case.js';

/**
 * "Tenho isso" — the store puts a catalogue product on its shelf for the first
 * time (`OWNER` only: it comes with a price).
 *
 * 🔴 The product comes from the **shared catalogue**, by id. A store never
 * invents one, and that is what keeps the comparator comparing the same bag of
 * food across shops instead of five spellings of it (DOMAIN_MODEL §Produto).
 * Until pd-16 the only writer was the seed, which is why the pilot's shelves are
 * placeholder data in a versioned file.
 *
 * `assertProductCanBeOffered` is the cross-table invariant Postgres cannot
 * express — a prescription product has no offer in the MVP, and neither does a
 * withdrawn one. The seed already went through it; this is the second path that
 * writes an offer, and it goes through the same function rather than a copy
 * (ADR-0010, A17).
 *
 * A second offer over the same product is refused by the unique pair, in the
 * database, rather than by a read-then-write two concurrent requests could both
 * pass.
 */
@Injectable()
export class CreateStoreOfferUseCase {
  private readonly logger = new Logger(CreateStoreOfferUseCase.name);

  constructor(
    @Inject(OFFER_REPOSITORY)
    private readonly offers: IOfferRepository,
    @Inject(AUDIT_TRAIL)
    private readonly auditTrail: IAuditTrail,
    private readonly findProduct: FindProductUseCase,
  ) {}

  async execute(
    actor: OfferActor,
    input: CreateStoreOffer,
    now: Date = new Date(),
  ): Promise<Offer> {
    // Raises `ProductNotFoundError` → `404`: naming a product that does not
    // exist is more useful to say than a generic validation failure.
    const product = await this.findProduct.execute(input.productId);

    // Raises `ProductNotOfferableError` → `422`: the request is well formed and
    // the caller is allowed, and a rule about the **data sent** fails.
    assertProductCanBeOffered(product);

    const created = await this.offers.create(
      {
        storeId: actor.storeId,
        productId: input.productId,
        priceCents: input.priceCents,
        available: input.available,
        // The shelf line is new, so "when was this price set" is now.
        priceUpdatedAt: now,
      },
      async (offer, context) => {
        await this.auditTrail.record(
          {
            actorKind: 'USER',
            actorUserId: actor.userId,
            action: 'offer.created',
            entityType: 'offer',
            entityId: offer.id,
            storeId: actor.storeId,
            payload: {
              productId: input.productId,
              priceCents: input.priceCents,
              available: input.available,
              storeRole: actor.storeRole,
            },
            requestId: actor.requestId,
          },
          context,
        );
      },
    );

    this.logger.log(
      `offer created (offerId=${created.id}, storeId=${actor.storeId}, ` +
        `productId=${created.productId}, priceCents=${String(created.priceCents)}, ` +
        `userId=${actor.userId})`,
    );

    return created;
  }
}
