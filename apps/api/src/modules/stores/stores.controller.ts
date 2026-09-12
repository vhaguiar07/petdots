import { Controller, Get, HttpStatus, NotFoundException, Param } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Store } from '@petdots/contracts';
import { ZodResponse } from 'nestjs-zod';

import { Public } from '../../common/guards/public.decorator.js';
import { FindStoreUseCase } from './application/find-store.use-case.js';
import { StoreNotFoundError } from './domain/store-not-found.error.js';
import { FindStoreParamsDto, StoreDto } from './stores.dto.js';

/**
 * One store's public page, read-only and open — the destination of every store
 * name in the comparator.
 */
@Public()
@ApiTags('stores')
@Controller('stores')
export class StoresController {
  constructor(private readonly findStore: FindStoreUseCase) {}

  @Get(':storeId')
  @ZodResponse({ status: HttpStatus.OK, type: StoreDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Loja não encontrada.' })
  @ApiResponse({ status: HttpStatus.UNPROCESSABLE_ENTITY, description: 'Falha de validação.' })
  async find(@Param() params: FindStoreParamsDto): Promise<Store> {
    try {
      return await this.findStore.execute(params.storeId);
    } catch (error) {
      if (error instanceof StoreNotFoundError) {
        // The body carries the specific code; the exception filter honours it
        // instead of falling back to the generic `NOT_FOUND` (ERROR_MODEL).
        throw new NotFoundException({
          code: 'STORE_NOT_FOUND',
          message: 'Loja não encontrada.',
        });
      }

      throw error;
    }
  }
}
