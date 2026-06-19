import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreatePetTypeDto {
  @ApiProperty({ example: 'Cães' })
  @IsString()
  @MinLength(2)
  name: string;
}
