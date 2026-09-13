import {
  createPetSchema,
  findPetParamsSchema,
  petListSchema,
  petSchema,
  tutorProfileSchema,
  updatePetSchema,
  upsertTutorProfileSchema,
} from '@petdots/contracts';
import { createZodDto } from 'nestjs-zod';

export class UpsertTutorProfileDto extends createZodDto(upsertTutorProfileSchema) {}
export class TutorProfileDto extends createZodDto(tutorProfileSchema) {}
export class CreatePetDto extends createZodDto(createPetSchema) {}
export class UpdatePetDto extends createZodDto(updatePetSchema) {}
export class PetDto extends createZodDto(petSchema) {}
export class PetListDto extends createZodDto(petListSchema) {}
export class FindPetParamsDto extends createZodDto(findPetParamsSchema) {}
