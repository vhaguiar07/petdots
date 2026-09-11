import {
  findProductParamsSchema,
  listProductsQuerySchema,
  productListSchema,
  productSchema,
} from '@petdots/contracts';
import { createZodDto } from 'nestjs-zod';

export class FindProductParamsDto extends createZodDto(findProductParamsSchema) {}
export class ListProductsQueryDto extends createZodDto(listProductsQuerySchema) {}
export class ProductDto extends createZodDto(productSchema) {}
export class ProductListDto extends createZodDto(productListSchema) {}
