import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { StoreOffer } from '@petdots/contracts';
import type { Response } from 'express';
import { ZodResponse } from 'nestjs-zod';

import type { AuthenticatedRequest } from '../../common/guards/authenticated-request.js';
import { membershipOf } from '../../common/guards/membership-of.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import { StoreRoles } from '../../common/guards/store-roles.decorator.js';
import { StoreScopeGuard } from '../../common/guards/store-scope.guard.js';
import { callerOf, requestIdOf } from '../../common/request-context.js';
import { API_PREFIX } from '../../openapi.js';
import { ListProductsByIdsUseCase } from '../catalog/application/list-products-by-ids.use-case.js';
import { FindStoreParamsDto } from '../stores/stores.dto.js';
import { CreateStoreOfferUseCase } from './application/create-store-offer.use-case.js';
import { UpdateOfferAvailabilityUseCase } from './application/update-offer-availability.use-case.js';
import type { OfferActor } from './application/update-offer-price.use-case.js';
import { UpdateOfferPriceUseCase } from './application/update-offer-price.use-case.js';
import type { Offer } from './domain/offer.js';
import {
  CreateStoreOfferDto,
  StoreOfferDto,
  StoreOfferParamsDto,
  UpdateOfferAvailabilityDto,
  UpdateOfferPriceDto,
} from './offers.dto.js';
import { toHttpError } from './to-http-error.js';

/**
 * 🔴 The shopkeeper writing their own shelf — the first time in this project
 * that a price is set by anyone but the seed.
 *
 * Reading the shelf stays on the public `StoreOffersController`, which the panel
 * calls with `?unavailable=true`: a price is public, it *is* the product. What
 * is closed is changing one.
 *
 * **Two roles, two permissions, and this is where ADR-0013 becomes visible.**
 * `price` and `POST /offers` are `@StoreRoles('OWNER')` — the margin and what
 * the shop carries are commercial decisions. `availability` is open to both,
 * because whether something is in stock is what the person at the counter
 * knows, and making them phone the owner to say "acabou" would guarantee the
 * shelf goes stale.
 */
@ApiTags('stores')
@ApiBearerAuth()
@Roles('STORE_MEMBER')
@UseGuards(StoreScopeGuard)
@Controller('stores')
export class StoreOfferManagementController {
  constructor(
    private readonly updatePrice: UpdateOfferPriceUseCase,
    private readonly updateAvailability: UpdateOfferAvailabilityUseCase,
    private readonly createOffer: CreateStoreOfferUseCase,
    private readonly listProducts: ListProductsByIdsUseCase,
  ) {}

  /**
   * The price the comparator ranks on. `OWNER` only.
   *
   * ⚠️ It changes nothing about orders already placed: every line carries its
   * own price snapshot, which is what makes an order an accounting record rather
   * than a view over today's shelf.
   */
  @Put(':storeId/offers/:offerId/price')
  @StoreRoles('OWNER')
  @ZodResponse({ status: HttpStatus.OK, type: StoreOfferDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Autenticação necessária.' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Sem vínculo com a loja ou papel insuficiente.',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Oferta não encontrada.' })
  @ApiResponse({ status: HttpStatus.UNPROCESSABLE_ENTITY, description: 'Falha de validação.' })
  async setPrice(
    @Req() request: AuthenticatedRequest,
    @Param() params: StoreOfferParamsDto,
    @Body() body: UpdateOfferPriceDto,
  ): Promise<StoreOffer> {
    try {
      const offer = await this.updatePrice.execute(
        actorOf(request),
        params.offerId,
        body.priceCents,
      );

      return await this.toContract(offer);
    } catch (error) {
      throw toHttpError(error);
    }
  }

  /** "Tenho" and "não tenho" — either role (ADR-0013 §permissões). */
  @Put(':storeId/offers/:offerId/availability')
  @ZodResponse({ status: HttpStatus.OK, type: StoreOfferDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Autenticação necessária.' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Sem vínculo com a loja ou papel insuficiente.',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Oferta não encontrada.' })
  @ApiResponse({ status: HttpStatus.UNPROCESSABLE_ENTITY, description: 'Falha de validação.' })
  async setAvailability(
    @Req() request: AuthenticatedRequest,
    @Param() params: StoreOfferParamsDto,
    @Body() body: UpdateOfferAvailabilityDto,
  ): Promise<StoreOffer> {
    try {
      const offer = await this.updateAvailability.execute(
        actorOf(request),
        params.offerId,
        body.available,
      );

      return await this.toContract(offer);
    } catch (error) {
      throw toHttpError(error);
    }
  }

  /**
   * "Tenho isso" — a catalogue product joins the shelf. `OWNER` only, because it
   * arrives with a price.
   *
   * `201` with `Location`, because the collection **does** have a route to read
   * it back — the condition `API_GUIDELINES` puts on the header.
   */
  @Post(':storeId/offers')
  @StoreRoles('OWNER')
  @HttpCode(HttpStatus.CREATED)
  @ZodResponse({ status: HttpStatus.CREATED, type: StoreOfferDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Autenticação necessária.' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Sem vínculo com a loja ou papel insuficiente.',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Produto não encontrado.' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'A loja já tem este produto.' })
  @ApiResponse({ status: HttpStatus.UNPROCESSABLE_ENTITY, description: 'Falha de validação.' })
  async create(
    @Req() request: AuthenticatedRequest,
    @Param() params: FindStoreParamsDto,
    @Body() body: CreateStoreOfferDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StoreOffer> {
    try {
      const offer = await this.createOffer.execute(actorOf(request), body);

      response.setHeader('Location', `/${API_PREFIX}/stores/${params.storeId}/offers`);

      return await this.toContract(offer);
    } catch (error) {
      throw toHttpError(error);
    }
  }

  /**
   * The shelf line as the panel reads it — the same contract the shopfront
   * answers, so one screen can render both.
   *
   * The product is resolved through `catalog`'s use case, never joined to
   * (CODING_STANDARDS). It is always found: `create` refused an unknown id, and
   * the other two writes act on an offer that already points at one.
   */
  private async toContract(offer: Offer): Promise<StoreOffer> {
    const [product] = await this.listProducts.execute([offer.productId]);

    return {
      offerId: offer.id,
      priceCents: offer.priceCents,
      priceUpdatedAt: offer.priceUpdatedAt.toISOString(),
      available: offer.available,
      product: {
        id: product?.id ?? offer.productId,
        slug: product?.slug ?? '',
        name: product?.name ?? '',
        brand: product?.brand ?? '',
        variant: product?.variant ?? '',
      },
    };
  }
}

/**
 * Who is acting, and on which store — taken from the membership the guard
 * matched, never from `params.storeId`.
 */
function actorOf(request: AuthenticatedRequest): OfferActor {
  const { storeId, role } = membershipOf(request);

  return {
    userId: callerOf(request),
    storeId,
    storeRole: role,
    requestId: requestIdOf(request),
  };
}
