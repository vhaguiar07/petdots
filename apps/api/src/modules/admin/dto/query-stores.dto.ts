import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { StoreStatus } from '@prisma/client';

export class QueryStoresDto {
  @ApiPropertyOptional({ enum: StoreStatus })
  @IsOptional()
  @IsEnum(StoreStatus)
  status?: StoreStatus;
}
