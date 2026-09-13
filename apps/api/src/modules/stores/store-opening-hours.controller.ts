import {
  Body,
  Controller,
  HttpStatus,
  NotFoundException,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Store } from '@petdots/contracts';
import { ZodResponse } from 'nestjs-zod';

import type { AuthenticatedRequest } from '../../common/guards/authenticated-request.js';
import { membershipOf } from '../../common/guards/membership-of.js';
import { Roles } from '../../common/guards/roles.decorator.js';
import { StoreRoles } from '../../common/guards/store-roles.decorator.js';
import { StoreScopeGuard } from '../../common/guards/store-scope.guard.js';
import { callerOf } from '../../common/request-context.js';
import { UpdateOpeningHoursUseCase } from './application/update-opening-hours.use-case.js';
import { StoreNotFoundError } from './domain/store-not-found.error.js';
import { StoreDto, UpdateOpeningHoursDto } from './stores.dto.js';

/**
 * The store's weekly schedule, written by its `OWNER` (ADR-0013 B4, ADR-0017 A11).
 *
 * A separate controller from `StoresController` because that one is `@Public()`
 * on the class, and one decorator cannot be half-applied — the read of a
 * shopfront is open, the write of its hours is not. Both document under the
 * `stores` tag, the same split `DeliveryAreasController` already uses.
 *
 * 🔴 `@StoreRoles('OWNER')`: when the shop opens is a commercial decision, not a
 * counter one. With `PUT /offers/{id}/price` and `POST /offers` it is one of the
 * three owner-only routes of the panel — and these are what make the ADR-0013
 * split provable instead of merely declared.
 */
@ApiTags('stores')
@ApiBearerAuth()
@Roles('STORE_MEMBER')
@UseGuards(StoreScopeGuard)
@Controller('stores')
export class StoreOpeningHoursController {
  constructor(private readonly updateOpeningHours: UpdateOpeningHoursUseCase) {}

  /**
   * The whole week at once. A `PUT` and not a `PATCH` because the schedule is a
   * single value: the "no overlapping stretches" rule can only be decided over
   * the complete list.
   *
   * ⚠️ An empty list is accepted and means the shop stops taking orders —
   * failing closed, the same choice the schema makes. It does **not** move the
   * deadline of orders already placed (ADR-0017, A12).
   */
  @Put(':storeId/opening-hours')
  @StoreRoles('OWNER')
  @ApiParam({ name: 'storeId', format: 'uuid', description: 'A loja que o membro opera.' })
  @ZodResponse({ status: HttpStatus.OK, type: StoreDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Autenticação necessária.' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Sem vínculo com a loja ou papel insuficiente.',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Loja não encontrada.' })
  @ApiResponse({ status: HttpStatus.UNPROCESSABLE_ENTITY, description: 'Falha de validação.' })
  async update(
    @Req() request: AuthenticatedRequest,
    @Body() body: UpdateOpeningHoursDto,
  ): Promise<Store> {
    // 🔴 The store comes from the membership the guard matched, never from
    // `params`: without the guard there is no membership and this raises.
    const { storeId } = membershipOf(request);

    try {
      return await this.updateOpeningHours.execute(storeId, callerOf(request), body.openingHours);
    } catch (error) {
      if (error instanceof StoreNotFoundError) {
        throw new NotFoundException({ code: 'STORE_NOT_FOUND', message: 'Loja não encontrada.' });
      }

      throw error;
    }
  }
}
