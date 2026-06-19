import { PartialType } from '@nestjs/swagger';
import { CreatePetTypeDto } from './create-pet-type.dto';

export class UpdatePetTypeDto extends PartialType(CreatePetTypeDto) {}
