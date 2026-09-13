import {
  deliveryAreaListSchema,
  findStoreParamsSchema,
  listDeliveryAreasQuerySchema,
  storeMembershipListSchema,
  storeSchema,
  updateOpeningHoursSchema,
} from '@petdots/contracts';
import { createZodDto } from 'nestjs-zod';

export class DeliveryAreaListDto extends createZodDto(deliveryAreaListSchema) {}
export class ListDeliveryAreasQueryDto extends createZodDto(listDeliveryAreasQuerySchema) {}
export class FindStoreParamsDto extends createZodDto(findStoreParamsSchema) {}
export class StoreDto extends createZodDto(storeSchema) {}
export class StoreMembershipListDto extends createZodDto(storeMembershipListSchema) {}
export class UpdateOpeningHoursDto extends createZodDto(updateOpeningHoursSchema) {}
