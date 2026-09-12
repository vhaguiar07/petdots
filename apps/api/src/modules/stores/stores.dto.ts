import {
  deliveryAreaListSchema,
  findStoreParamsSchema,
  listDeliveryAreasQuerySchema,
  storeSchema,
} from '@petdots/contracts';
import { createZodDto } from 'nestjs-zod';

export class DeliveryAreaListDto extends createZodDto(deliveryAreaListSchema) {}
export class ListDeliveryAreasQueryDto extends createZodDto(listDeliveryAreasQuerySchema) {}
export class FindStoreParamsDto extends createZodDto(findStoreParamsSchema) {}
export class StoreDto extends createZodDto(storeSchema) {}
