import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class QueryOrdersDto {
  @ApiPropertyOptional({ example: 'store-id' })
  @IsOptional()
  @IsString()
  storeId?: string;
}
