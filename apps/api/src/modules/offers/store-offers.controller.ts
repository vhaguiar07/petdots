import { Controller, Get, HttpStatus, NotFoundException, Param, Query } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import type { StoreOfferList } from '@petdots/contracts';
import { ZodResponse } from 'nestjs-zod';

import { Public } from '../../common/guards/public.decorator.js';
import { StoreNotFoundError } from '../stores/domain/store-not-found.error.js';
import { FindStoreParamsDto } from '../stores/stores.dto.js';
import { ListStoreOffersUseCase } from './application/list-store-offers.use-case.js';
import { ListStoreOffersQueryDto, StoreOfferListDto } from './offers.dto.js';

/**
 * A store's price list, nested under the store it belongs to — literally the
 * hierarchy the API_GUIDELINES uses as its example.
 *
 * It lives in `offers` and not in `stores` because the module that owns the
 * table owns the route; `stores` is consulted through its use case, never
 * joined to (CODING_STANDARDS).
 *
 * Not paginated: the universe is one pilot store's catalogue (dozens).
 *
 * 🔴 `?unavailable=true` answers the **whole** shelf, switched-off rows
 * included — which is what the store panel lists. It is on the public route on
 * purpose: **an unavailable offer is not a secret; the shopfront filters it, the
 * panel asks for it.** Nothing else about the route changes, so the comparator
 * and the shopfront are untouched.
 *
 * The alternatives were weighed and rejected, so they are not re-proposed: a
 * scoped route under another name would have to invent a term (`shelf`,
 * `offers/all`) or a verb; two controllers cannot serve the same path; and a
 * `@Public()` handler never sees `request.user`, so "honour the parameter only
 * for members" does not exist.
 */
@Public()
@ApiTags('stores')
@Controller('stores')
export class StoreOffersController {
  constructor(private readonly listStoreOffers: ListStoreOffersUseCase) {}

  @Get(':storeId/offers')
  @ZodResponse({ status: HttpStatus.OK, type: StoreOfferListDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Loja não encontrada.' })
  @ApiResponse({ status: HttpStatus.UNPROCESSABLE_ENTITY, description: 'Falha de validação.' })
  async list(
    @Param() params: FindStoreParamsDto,
    @Query() query: ListStoreOffersQueryDto,
  ): Promise<StoreOfferList> {
    try {
      return {
        items: await this.listStoreOffers.execute(params.storeId, query.unavailable === 'true'),
      };
    } catch (error) {
      if (error instanceof StoreNotFoundError) {
        // The same body the store's own page answers with: a paused store is
        // absent from both, or it would be absent from one and empty in the
        // other (ERROR_MODEL, pd-13 A15).
        throw new NotFoundException({
          code: 'STORE_NOT_FOUND',
          message: 'Loja não encontrada.',
        });
      }

      throw error;
    }
  }
}
