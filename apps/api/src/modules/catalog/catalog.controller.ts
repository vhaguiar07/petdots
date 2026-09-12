import { Controller, Get, HttpStatus, NotFoundException, Param, Query } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Product, ProductList } from '@petdots/contracts';
import { ZodResponse } from 'nestjs-zod';

import { Public } from '../../common/guards/public.decorator.js';
import { FindProductUseCase } from './application/find-product.use-case.js';
import { SearchProductsUseCase } from './application/search-products.use-case.js';
import {
  FindProductParamsDto,
  ListProductsQueryDto,
  ProductDto,
  ProductListDto,
} from './catalog.dto.js';
import { ProductNotFoundError } from './domain/product-not-found.error.js';

/**
 * The master catalogue, read-only and public.
 *
 * There is no write endpoint here, and that is not an omission: `identity` does
 * not exist yet (MVP capability 1), so a public write would be a hole. The
 * catalogue is fed by a versioned seed until the admin console exists
 * (ADR-0010, A8 and A14).
 *
 * 🔴 Open, and it has to stay open: the comparator is what a visitor arriving
 * from a search engine sees before they have any reason to have an account
 * (ADR-0010, J2).
 */
@Public()
@ApiTags('catalog')
@Controller('products')
export class CatalogController {
  constructor(
    private readonly searchProducts: SearchProductsUseCase,
    private readonly findProduct: FindProductUseCase,
  ) {}

  @Get()
  @ZodResponse({ status: HttpStatus.OK, type: ProductListDto })
  @ApiResponse({ status: HttpStatus.UNPROCESSABLE_ENTITY, description: 'Falha de validação.' })
  async list(@Query() query: ListProductsQueryDto): Promise<ProductList> {
    return this.searchProducts.execute(query);
  }

  @Get(':productId')
  @ZodResponse({ status: HttpStatus.OK, type: ProductDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Produto não encontrado.' })
  @ApiResponse({ status: HttpStatus.UNPROCESSABLE_ENTITY, description: 'Falha de validação.' })
  async find(@Param() params: FindProductParamsDto): Promise<Product> {
    try {
      return await this.findProduct.execute(params.productId);
    } catch (error) {
      if (error instanceof ProductNotFoundError) {
        // The body carries the specific code; the exception filter honours it
        // instead of falling back to the generic `NOT_FOUND` (ERROR_MODEL).
        throw new NotFoundException({
          code: 'PRODUCT_NOT_FOUND',
          message: 'Produto não encontrado.',
        });
      }

      throw error;
    }
  }
}
