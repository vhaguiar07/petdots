import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import type { DeliveryAreaList } from '@petdots/contracts';
import { normalizePostalCode } from '@petdots/domain';
import { ZodResponse } from 'nestjs-zod';

import { Public } from '../../common/guards/public.decorator.js';
import { FindDeliveryCoverageUseCase } from './application/find-delivery-coverage.use-case.js';
import { DeliveryAreaListDto, ListDeliveryAreasQueryDto } from './stores.dto.js';

/**
 * Delivery areas, read-only and public.
 *
 * Without a filter it answers every active area of every listable store, which
 * is how the landing builds its neighbourhood picker. Not paginated: the
 * universe is the pilot's stores (ADR-0010, A10).
 *
 * The tag stays `stores` even though the file no longer is: both controllers of
 * this module document under one tag, so splitting the file added routes to the
 * published contract without moving the ones already there (pd-13).
 */
@Public()
@ApiTags('stores')
@Controller('delivery-areas')
export class DeliveryAreasController {
  constructor(private readonly findCoverage: FindDeliveryCoverageUseCase) {}

  @Get()
  @ZodResponse({ status: HttpStatus.OK, type: DeliveryAreaListDto })
  @ApiResponse({ status: HttpStatus.UNPROCESSABLE_ENTITY, description: 'Falha de validação.' })
  async list(@Query() query: ListDeliveryAreasQueryDto): Promise<DeliveryAreaList> {
    // Normalising here, not in the contract, keeps the OpenAPI input and output
    // types identical (pd-09, A11).
    const areas = await this.findCoverage.listActiveAreas({
      neighborhood: query.neighborhood?.trim() || undefined,
      postalCode: query.postalCode ? normalizePostalCode(query.postalCode) : undefined,
    });

    return {
      items: areas.map(({ area, store }) => ({ ...area, store })),
    };
  }
}
