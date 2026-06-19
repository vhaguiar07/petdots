import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class QueryProductsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  storeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  petTypeId?: string;

  @ApiPropertyOptional({ description: 'Busca por nome do produto' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Quando true, retorna apenas produtos com promoção ativa' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  onSale?: boolean;
}
