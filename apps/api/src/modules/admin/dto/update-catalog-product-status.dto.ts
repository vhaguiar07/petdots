import { IsEnum } from 'class-validator';
import { CatalogProductStatus } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCatalogProductStatusDto {
  @ApiProperty({ enum: CatalogProductStatus })
  @IsEnum(CatalogProductStatus)
  status: CatalogProductStatus;
}
