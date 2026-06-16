import { ApiPropertyOptional } from '@nestjs/swagger';
import { StoreType, DeliveryProviderType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class ListStoresQueryDto {
  @ApiPropertyOptional({ enum: StoreType })
  @IsOptional()
  @IsEnum(StoreType)
  storeType?: StoreType;

  @ApiPropertyOptional({ example: -23.55052 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional({ example: -46.633308 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;

  @ApiPropertyOptional({ enum: ['rating', 'newest'] })
  @IsOptional()
  @IsIn(['rating', 'newest'])
  sort?: 'rating' | 'newest';

  @ApiPropertyOptional({ enum: DeliveryProviderType })
  @IsOptional()
  @IsEnum(DeliveryProviderType)
  deliveryProvider?: DeliveryProviderType;

  @ApiPropertyOptional({ example: 6 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
