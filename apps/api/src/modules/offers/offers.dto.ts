import {
  comparedOfferListSchema,
  compareOffersQuerySchema,
  createStoreOfferSchema,
  listStoreOffersQuerySchema,
  storeOfferListSchema,
  storeOfferParamsSchema,
  storeOfferSchema,
  updateOfferAvailabilitySchema,
  updateOfferPriceSchema,
} from '@petdots/contracts';
import { createZodDto } from 'nestjs-zod';

export class ComparedOfferListDto extends createZodDto(comparedOfferListSchema) {}
export class CompareOffersQueryDto extends createZodDto(compareOffersQuerySchema) {}
export class StoreOfferListDto extends createZodDto(storeOfferListSchema) {}
export class StoreOfferDto extends createZodDto(storeOfferSchema) {}
export class StoreOfferParamsDto extends createZodDto(storeOfferParamsSchema) {}
export class ListStoreOffersQueryDto extends createZodDto(listStoreOffersQuerySchema) {}
export class CreateStoreOfferDto extends createZodDto(createStoreOfferSchema) {}
export class UpdateOfferPriceDto extends createZodDto(updateOfferPriceSchema) {}
export class UpdateOfferAvailabilityDto extends createZodDto(updateOfferAvailabilitySchema) {}
