import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { StoreStatus } from '@prisma/client';

export class UpdateStoreStatusDto {
  @ApiProperty({ enum: StoreStatus, example: StoreStatus.ACTIVE })
  @IsEnum(StoreStatus)
  status: StoreStatus;
}
