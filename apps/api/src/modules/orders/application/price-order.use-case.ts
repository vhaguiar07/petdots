import { Inject, Injectable } from '@nestjs/common';
import type { ProductCategory, QuoteOrder, TutorProfile } from '@petdots/contracts';
import {
  acceptanceDeadline,
  areaCoversAddress,
  commissionAmountCents,
  isOpenAt,
  lineTotalCents,
  nextOpeningAt,
  type OpeningInterval,
  resolveCommissionRateBps,
  SERVICE_FEE_CENTS,
} from '@petdots/domain';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../../../config/env.schema.js';
import { FindCommissionRatesUseCase } from '../../catalog/application/find-commission-rates.use-case.js';
import { ListProductsByIdsUseCase } from '../../catalog/application/list-products-by-ids.use-case.js';
import { FindOffersForOrderUseCase } from '../../offers/application/find-offers-for-order.use-case.js';
import { FindStoreCommissionRatesUseCase } from '../../stores/application/find-store-commission-rates.use-case.js';
import { FindStoreUseCase } from '../../stores/application/find-store.use-case.js';
import { FindTutorProfileUseCase } from '../../tutors/application/find-tutor-profile.use-case.js';
import { TutorProfileNotFoundError } from '../../tutors/domain/tutor-profile-not-found.error.js';
import type { DeliveryAddressSnapshot } from '../domain/order.js';
import {
  AddressOutOfDeliveryAreaError,
  type InvalidOrderItem,
  OfferUnavailableError,
  OrderItemsInvalidError,
  StoreNotActiveError,
  TutorProfileRequiredError,
} from '../domain/order-errors.js';

/** One line, fully priced, ready to become an `OrderItem` or a quote line. */
export interface PricedOrderLine {
  offerId: string;
  productId: string;
  productName: string;
  productVariant: string;
  category: ProductCategory;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
  commissionRateBps: number;
  commissionAmountCents: number;
}

/** Everything the quote shows and everything `buildOrder` needs. */
export interface PricedOrder {
  tutorId: string;
  store: { id: string; slug: string; name: string; neighborhood: string };
  openingHours: OpeningInterval[];
  lines: PricedOrderLine[];
  itemsTotalCents: number;
  deliveryFeeCents: number;
  serviceFeeCents: number;
  totalCents: number;
  deliveryArea: { label: string; estimatedMinutes: number };
  deliveryAddress: DeliveryAddressSnapshot;
  contactName: string;
  contactPhone: string;
  storeOpenNow: boolean;
  nextOpeningAt: Date | null;
  acceptanceWindowMinutes: number;
  /** Null when the store is shut — there is no deadline for an order nobody may place. */
  acceptanceDeadlineAt: Date | null;
}

/**
 * 🔴 The single place a cart turns into money.
 *
 * `POST /order-quotes` and `POST /orders` both go through here, and that is the
 * point: what the tutor is shown before confirming and what is written to the
 * database are computed by the same code, from the same rows, in the same
 * order. Two implementations would eventually disagree, and the disagreement
 * would surface as a price the customer did not agree to.
 *
 * It reads five other modules through their use cases and touches none of their
 * tables (CODING_STANDARDS). The sequence is deliberate — cheapest refusals
 * first, so a closed store is not paid for with five queries.
 */
@Injectable()
export class PriceOrderUseCase {
  private readonly acceptanceWindowMinutes: number;

  constructor(
    private readonly findTutorProfile: FindTutorProfileUseCase,
    private readonly findStore: FindStoreUseCase,
    private readonly findOffers: FindOffersForOrderUseCase,
    private readonly listProducts: ListProductsByIdsUseCase,
    private readonly findCommissionRates: FindCommissionRatesUseCase,
    private readonly findStoreCommissionRates: FindStoreCommissionRatesUseCase,
    @Inject(ConfigService)
    config: ConfigService<Env, true>,
  ) {
    this.acceptanceWindowMinutes = config.get('ACCEPTANCE_WINDOW_MINUTES', { infer: true });
  }

  async execute(userId: string, input: QuoteOrder, now: Date): Promise<PricedOrder> {
    const profile = await this.resolveProfile(userId);
    const store = await this.findStore.execute(input.storeId);

    // `PAUSED` already raised inside `findStore` as a 404 — the comparator hides
    // it, so its page must not exist either (pd-13, A15). What is left to check
    // here is the rule that governs ordering rather than listing.
    if (store.status !== 'ACTIVE') {
      throw new StoreNotActiveError(store.id);
    }

    const openNow = isOpenAt(store.openingHours, now);
    const opensAt = openNow ? null : nextOpeningAt(store.openingHours, now);

    const address = toAddressSnapshot(profile);
    const area = this.cheapestAreaCovering(store, address);

    if (!area) {
      throw new AddressOutOfDeliveryAreaError(store.id);
    }

    const lines = await this.priceLines(store.id, input, now);
    const itemsTotalCents = lines.reduce((total, line) => total + line.lineTotalCents, 0);

    return {
      tutorId: profile.id,
      store: {
        id: store.id,
        slug: store.slug,
        name: store.name,
        neighborhood: store.neighborhood,
      },
      openingHours: store.openingHours,
      lines,
      itemsTotalCents,
      deliveryFeeCents: area.deliveryFeeCents,
      serviceFeeCents: SERVICE_FEE_CENTS,
      totalCents: itemsTotalCents + area.deliveryFeeCents + SERVICE_FEE_CENTS,
      deliveryArea: { label: area.label, estimatedMinutes: area.estimatedMinutes },
      deliveryAddress: address,
      contactName: profile.name,
      contactPhone: profile.phone ?? '',
      storeOpenNow: openNow,
      nextOpeningAt: opensAt,
      acceptanceWindowMinutes: this.acceptanceWindowMinutes,
      acceptanceDeadlineAt: openNow
        ? acceptanceDeadline(store.openingHours, now, this.acceptanceWindowMinutes)
        : null,
    };
  }

  /**
   * The profile, or the one refusal that means "you have not finished signing
   * up" rather than "something went wrong".
   *
   * A profile without a phone is a case `PUT /tutors/me` cannot produce — the
   * schema requires it — but it is reachable through the database, and an order
   * whose contact is an empty string is a delivery nobody can complete.
   */
  private async resolveProfile(userId: string): Promise<TutorProfile> {
    let profile: TutorProfile;

    try {
      profile = await this.findTutorProfile.execute(userId);
    } catch (error) {
      throw error instanceof TutorProfileNotFoundError ? new TutorProfileRequiredError() : error;
    }

    if (!profile.phone) {
      throw new TutorProfileRequiredError();
    }

    return profile;
  }

  /**
   * The cheapest active area of **this store** that covers the address.
   *
   * Same rule the comparator applies (`isBetter` in `FindDeliveryCoverageUseCase`),
   * reused rather than copied in spirit: the comparator promised a landed price
   * through the cheapest covering area, and charging a different one at checkout
   * would contradict the table the tutor just read (ADR-0010).
   */
  private cheapestAreaCovering(
    store: {
      deliveryAreas: {
        label: string;
        deliveryFeeCents: number;
        estimatedMinutes: number;
        neighborhoods: string[];
        postalCodeRanges: { from: string; to: string }[];
        active: boolean;
      }[];
    },
    address: DeliveryAddressSnapshot,
  ) {
    const query = { neighborhood: address.neighborhood, postalCode: address.postalCode };

    return store.deliveryAreas
      .filter((area) => areaCoversAddress(area, query))
      .sort(
        (a, b) =>
          a.deliveryFeeCents - b.deliveryFeeCents || a.estimatedMinutes - b.estimatedMinutes,
      )[0];
  }

  /**
   * Resolves every line against the offers of this store and the catalogue,
   * then prices it with the commission in force.
   *
   * The two refusals are kept apart on purpose (ERROR_MODEL): an offer that
   * does not exist, belongs elsewhere, repeats, or points at a withdrawn
   * product is `422` — something is wrong with what was **sent**. An offer that
   * exists but is off the shelf is `409` — a conflict of **state**, and the one
   * the screen turns into "acabou, quer tirar do carrinho?".
   */
  private async priceLines(
    storeId: string,
    input: QuoteOrder,
    now: Date,
  ): Promise<PricedOrderLine[]> {
    const offerIds = input.items.map((line) => line.offerId);
    const offers = await this.findOffers.execute(storeId, offerIds);
    const offerById = new Map(offers.map((offer) => [offer.id, offer]));

    const invalid: InvalidOrderItem[] = [];
    const seen = new Set<string>();

    input.items.forEach((line, index) => {
      if (seen.has(line.offerId)) {
        invalid.push({ index, offerId: line.offerId, reason: 'DUPLICATED' });
        return;
      }

      seen.add(line.offerId);

      if (!offerById.has(line.offerId)) {
        // The offer may exist and belong to another store, or not exist at all.
        // Both are the same answer to this caller, and saying which would leak
        // the existence of a row they did not ask for.
        invalid.push({ index, offerId: line.offerId, reason: 'UNKNOWN_OFFER' });
      }
    });

    if (invalid.length > 0) {
      throw new OrderItemsInvalidError(invalid);
    }

    const unavailable = input.items
      .filter((line) => offerById.get(line.offerId)?.available === false)
      .map((line) => line.offerId);

    if (unavailable.length > 0) {
      throw new OfferUnavailableError(unavailable);
    }

    const products = await this.listProducts.execute(
      input.items.map((line) => offerById.get(line.offerId)?.productId ?? ''),
    );
    const productById = new Map(products.map((product) => [product.id, product]));

    const withdrawn: InvalidOrderItem[] = [];

    input.items.forEach((line, index) => {
      const offer = offerById.get(line.offerId);

      // `ListProductsByIds` answers with the **active** ones only, so a missing
      // product here is one the catalogue withdrew while it sat in a cart.
      if (!offer || !productById.has(offer.productId)) {
        withdrawn.push({ index, offerId: line.offerId, reason: 'INACTIVE_PRODUCT' });
      }
    });

    if (withdrawn.length > 0) {
      throw new OrderItemsInvalidError(withdrawn);
    }

    const [tableRates, storeRates] = await Promise.all([
      this.findCommissionRates.execute(now),
      this.findStoreCommissionRates.execute(storeId, now),
    ]);

    return input.items.map((line) => {
      // Both lookups already succeeded above; the fallbacks only satisfy the
      // compiler under `noUncheckedIndexedAccess`.
      const offer = offerById.get(line.offerId);
      const product = offer ? productById.get(offer.productId) : undefined;

      if (!offer || !product) {
        throw new OrderItemsInvalidError([
          { index: 0, offerId: line.offerId, reason: 'UNKNOWN_OFFER' },
        ]);
      }

      const total = lineTotalCents(offer.priceCents, line.quantity);
      const rateBps = resolveCommissionRateBps({
        category: product.category,
        // Always `PLATFORM` in pd-15: `STORE_REFERRAL` has no producer until
        // `referral_code` exists on the store (J6). The rule is implemented and
        // unit-tested; what is missing is the channel that would set it.
        acquisitionChannel: 'PLATFORM',
        storeRates,
        tableRates,
        at: now,
      });

      return {
        offerId: offer.id,
        productId: product.id,
        productName: product.name,
        productVariant: product.variant,
        category: product.category,
        unitPriceCents: offer.priceCents,
        quantity: line.quantity,
        lineTotalCents: total,
        commissionRateBps: rateBps,
        commissionAmountCents: commissionAmountCents(total, rateBps),
      };
    });
  }
}

function toAddressSnapshot(profile: TutorProfile): DeliveryAddressSnapshot {
  // Field by field, never a spread: the profile also carries `id`, `createdAt`
  // and `updatedAt`, and none of them belongs in the order's address snapshot.
  return {
    street: profile.address.street,
    number: profile.address.number,
    complement: profile.address.complement,
    neighborhood: profile.address.neighborhood,
    postalCode: profile.address.postalCode,
    reference: profile.address.reference,
  };
}
