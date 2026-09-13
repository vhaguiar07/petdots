import { findPostalCodeParamsSchema, postalCodeAddressSchema } from '@petdots/contracts';
import { createZodDto } from 'nestjs-zod';

export class FindPostalCodeParamsDto extends createZodDto(findPostalCodeParamsSchema) {}
export class PostalCodeAddressDto extends createZodDto(postalCodeAddressSchema) {}
