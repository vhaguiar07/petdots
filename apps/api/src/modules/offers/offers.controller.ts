import { Controller, Get, HttpStatus, NotFoundException, Query } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import type { ComparedOfferList } from '@petdots/contracts';
import { ZodResponse } from 'nestjs-zod';

import { Public } from '../../common/guards/public.decorator.js';
import { ProductNotFoundError } from '../catalog/domain/product-not-found.error.js';
import { CompareOffersUseCase } from './application/compare-offers.use-case.js';
import { ComparedOfferListDto, CompareOffersQueryDto } from './offers.dto.js';

/**
 * The public comparator. Read-only and unauthenticated by design: a store's
 * price is public on the platform — it is the product (SECURITY, DOMAIN_MODEL
 * §Ownership).
 *
 * Not paginated: the universe is the number of pilot stores carrying one
 * product, at most dozens (ADR-0010, A10).
 */
@Public()
@ApiTags('offers')
@Controller('offers')
export class OffersController {
  constructor(private readonly compareOffers: CompareOffersUseCase) {}

  @Get()
  @ZodResponse({ status: HttpStatus.OK, type: ComparedOfferListDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Produto não encontrado.' })
  @ApiResponse({ status: HttpStatus.UNPROCESSABLE_ENTITY, description: 'Falha de validação.' })
  async list(@Query() query: CompareOffersQueryDto): Promise<ComparedOfferList> {
    try {
      return { items: await this.compareOffers.execute(query) };
    } catch (error) {
      if (error instanceof ProductNotFoundError) {
        throw new NotFoundException({
          code: 'PRODUCT_NOT_FOUND',
          message: 'Produto não encontrado.',
        });
      }

      throw error;
    }
  }
}
