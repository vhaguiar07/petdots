import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreatePromotionDto } from './create-promotion.dto';

export class UpdatePromotionDto extends PartialType(
  OmitType(CreatePromotionDto, ['storeId'] as const),
) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
