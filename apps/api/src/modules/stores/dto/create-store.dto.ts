import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { DeliveryProviderType } from '@prisma/client';

const TIME_PATTERN = /^([01]\d|2[0-3]):(00|30)$/;

export class DayScheduleDto {
  @ApiProperty({ example: '08:00' })
  @IsString()
  @Matches(TIME_PATTERN, { message: 'Horário inválido' })
  open: string;

  @ApiProperty({ example: '19:00' })
  @IsString()
  @Matches(TIME_PATTERN, { message: 'Horário inválido' })
  close: string;
}

export class BusinessHoursDto {
  @ApiPropertyOptional({ type: DayScheduleDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => DayScheduleDto)
  weekdays?: DayScheduleDto | null;

  @ApiPropertyOptional({ type: DayScheduleDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => DayScheduleDto)
  saturday?: DayScheduleDto | null;

  @ApiPropertyOptional({ type: DayScheduleDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => DayScheduleDto)
  sunday?: DayScheduleDto | null;
}

export class CreateStoreDto {
  @ApiProperty({ example: 'Pet Shop Amigo Fiel' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    enum: DeliveryProviderType,
    default: DeliveryProviderType.SELF,
  })
  @IsOptional()
  @IsEnum(DeliveryProviderType)
  deliveryProvider?: DeliveryProviderType;

  @ApiProperty({ example: 'Rua das Flores' })
  @IsString()
  @MinLength(2)
  street: string;

  @ApiProperty({ example: '123' })
  @IsString()
  number: string;

  @ApiProperty({ example: 'Centro' })
  @IsString()
  neighborhood: string;

  @ApiProperty({ example: 'São Paulo' })
  @IsString()
  city: string;

  @ApiProperty({ example: 'SP' })
  @IsString()
  @MaxLength(2)
  state: string;

  @ApiProperty({ example: '01001-000' })
  @IsString()
  @Matches(/^\d{5}-?\d{3}$/, { message: 'CEP inválido' })
  zipCode: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  whatsapp?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  instagram?: string;

  @ApiPropertyOptional({ type: BusinessHoursDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BusinessHoursDto)
  businessHours?: BusinessHoursDto;

  @ApiPropertyOptional({ example: 45, description: 'Tempo estimado de entrega em minutos (1–300)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(300)
  deliveryTimeMinutes?: number;
}
