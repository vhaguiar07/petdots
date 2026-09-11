import { deliveryAreaListSchema, listDeliveryAreasQuerySchema } from '@petdots/contracts';
import { createZodDto } from 'nestjs-zod';

export class DeliveryAreaListDto extends createZodDto(deliveryAreaListSchema) {}
export class ListDeliveryAreasQueryDto extends createZodDto(listDeliveryAreasQuerySchema) {}
