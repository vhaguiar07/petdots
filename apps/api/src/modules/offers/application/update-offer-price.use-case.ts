import { Inject, Injectable, Logger } from '@nestjs/common';
import type { StoreRole } from '@petdots/contracts';

import { AUDIT_TRAIL, type IAuditTrail } from '../../../audit/audit-trail.port.js';
import { type IOfferRepository, OFFER_REPOSITORY } from '../domain/ioffer.repository.js';
import type { Offer } from '../domain/offer.js';
import { OfferNotFoundError } from '../domain/offer-errors.js';

/** Who is writing, and on which store — the store's half of a request. */
export interface OfferActor {
  userId: string;
  storeId: string;
  storeRole: StoreRole;
  requestId: string | null;
}

/**
 * 🔴 The `OWNER` changes a price — the third of the four mutations `SECURITY`
 * §Auditoria requires a trail for, and the first thing in this project to write
 * an `audit_log` row about something that is not an order.
 *
 * Until pd-16 the seed was the only writer, which meant a pilot store changing
 * a price needed a commit. The price is the product of the comparator, so this
 * is the single most consequential field a shopkeeper touches — and it is
 * `OWNER`-only because the margin is a commercial decision, not a counter one
 * (ADR-0013 §permissões). "Sugestão de preço pelo `OPERATOR`, aprovada pela
 * dona" is in `IDEIAS`.
 *
 * ⚠️ It does **not** change the price of anything already ordered. Every line of
 * an order carries its own `unit_price_cents` snapshot, which is what makes the
 * order an accounting record rather than a view over today's shelf.
 *
 * The previous price goes into the payload. Without it the trail would say a
 * price changed without saying from what, which is the one question anyone
 * reading it later would have.
 */
@Injectable()
export class UpdateOfferPriceUseCase {
  private readonly logger = new Logger(UpdateOfferPriceUseCase.name);

  constructor(
    @Inject(OFFER_REPOSITORY)
    private readonly offers: IOfferRepository,
    @Inject(AUDIT_TRAIL)
    private readonly auditTrail: IAuditTrail,
  ) {}

  async execute(
    actor: OfferActor,
    offerId: string,
    priceCents: number,
    now: Date = new Date(),
  ): Promise<Offer> {
    const current = await this.offers.findByIdForStore(offerId, actor.storeId);

    if (!current) {
      throw new OfferNotFoundError(offerId);
    }

    const updated = await this.offers.changePrice(
      offerId,
      actor.storeId,
      priceCents,
      now,
      async (context) => {
        await this.auditTrail.record(
          {
            actorKind: 'USER',
            actorUserId: actor.userId,
            action: 'offer.price_changed',
            entityType: 'offer',
            entityId: offerId,
            storeId: actor.storeId,
            payload: {
              fromPriceCents: current.priceCents,
              toPriceCents: priceCents,
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
      // The row was read a moment ago, so this is the offer being deleted in
      // between — the same answer as never having existed for this store.
      throw new OfferNotFoundError(offerId);
    }

    this.logger.log(
      `offer price changed (offerId=${offerId}, storeId=${actor.storeId}, ` +
        `fromPriceCents=${String(current.priceCents)}, toPriceCents=${String(priceCents)}, ` +
        `userId=${actor.userId})`,
    );

    return updated;
  }
}
