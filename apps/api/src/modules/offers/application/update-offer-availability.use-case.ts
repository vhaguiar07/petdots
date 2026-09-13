import { Inject, Injectable, Logger } from '@nestjs/common';

import { AUDIT_TRAIL, type IAuditTrail } from '../../../audit/audit-trail.port.js';
import { type IOfferRepository, OFFER_REPOSITORY } from '../domain/ioffer.repository.js';
import type { Offer } from '../domain/offer.js';
import { OfferNotFoundError } from '../domain/offer-errors.js';
import type { OfferActor } from './update-offer-price.use-case.js';

/**
 * "Tenho" and "não tenho" — which **either** role may say (ADR-0013
 * §permissões).
 *
 * The split with the price is the whole point of the two roles: stock is what
 * the person at the counter knows, and the margin is not their decision. This
 * is also the most frequent write the panel will ever take, which is why it is
 * a one-tap toggle rather than a form.
 *
 * ⚠️ `price_updated_at` is deliberately **not** stamped. Having something back
 * in stock is not a new price, and touching the timestamp would tell every
 * visitor of the comparator that the shop repriced when it did not.
 *
 * An unavailable offer stays on the shelf rather than being deleted: it is the
 * shop saying "não tenho hoje", and deleting it would lose the price it will
 * have again tomorrow.
 */
@Injectable()
export class UpdateOfferAvailabilityUseCase {
  private readonly logger = new Logger(UpdateOfferAvailabilityUseCase.name);

  constructor(
    @Inject(OFFER_REPOSITORY)
    private readonly offers: IOfferRepository,
    @Inject(AUDIT_TRAIL)
    private readonly auditTrail: IAuditTrail,
  ) {}

  async execute(actor: OfferActor, offerId: string, available: boolean): Promise<Offer> {
    const current = await this.offers.findByIdForStore(offerId, actor.storeId);

    if (!current) {
      throw new OfferNotFoundError(offerId);
    }

    const updated = await this.offers.changeAvailability(
      offerId,
      actor.storeId,
      available,
      async (context) => {
        await this.auditTrail.record(
          {
            actorKind: 'USER',
            actorUserId: actor.userId,
            action: 'offer.availability_changed',
            entityType: 'offer',
            entityId: offerId,
            storeId: actor.storeId,
            payload: {
              from: current.available,
              to: available,
              productId: current.productId,
              storeRole: actor.storeRole,
            },
            requestId: actor.requestId,
          },
          context,
        );
      },
    );

    if (!updated) {
      throw new OfferNotFoundError(offerId);
    }

    this.logger.log(
      `offer availability changed (offerId=${offerId}, storeId=${actor.storeId}, ` +
        `from=${String(current.available)}, to=${String(available)}, userId=${actor.userId})`,
    );

    return updated;
  }
}
