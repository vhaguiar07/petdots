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

  @ApiPropertyOptional({ example: 'category-id' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ example: 'pet-type-id' })
  @IsOptional()
  @IsString()
  petTypeId?: string;

  @ApiProperty({ example: 'Ração Premium 10kg' })
  @IsString()
  @MinLength(2)
  name: string;

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
