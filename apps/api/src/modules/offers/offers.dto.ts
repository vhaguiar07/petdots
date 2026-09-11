import { comparedOfferListSchema, compareOffersQuerySchema } from '@petdots/contracts';
import { createZodDto } from 'nestjs-zod';

export class ComparedOfferListDto extends createZodDto(comparedOfferListSchema) {}
export class CompareOffersQueryDto extends createZodDto(compareOffersQuerySchema) {}
