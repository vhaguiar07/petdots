import { ApiPropertyOptional } from '@nestjs/swagger';
import { PetType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class QueryProductsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  storeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;
  @ApiPropertyOptional({ description: 'Busca por nome do produto' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: PetType })
  @IsOptional()
  @IsEnum(PetType)
  petType?: PetType;

  @ApiPropertyOptional({ description: 'Quando true, retorna apenas produtos com promoção ativa' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  onSale?: boolean;
}
