import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  MinLength,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'store-id' })
  @IsString()
  storeId: string;

  @ApiPropertyOptional({ description: 'ID de um produto do catálogo global existente. Quando fornecido, os campos nome/imagens são ignorados.' })
  @IsOptional()
  @IsString()
  catalogProductId?: string;

  @ApiPropertyOptional({ example: 'category-id' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ example: 'pet-type-id' })
  @IsOptional()
  @IsString()
  petTypeId?: string;

  @ApiPropertyOptional({ example: 'Ração Premium 10kg' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ example: 'brand-id' })
  @IsOptional()
  @IsString()
  brandId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 199.9 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 50 })
  @IsInt()
  @Min(0)
  stock: number;

  @ApiPropertyOptional({ type: [String], description: 'URLs das imagens do produto' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUrl({ require_tld: false }, { each: true })
  images?: string[];
}
