import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, Min } from 'class-validator';

export class UpsertPriceAlertDto {
  @ApiProperty()
  @IsString()
  catalogProductId: string;

  @ApiProperty({ example: 49.9 })
  @IsNumber()
  @Min(0)
  targetPrice: number;
}
