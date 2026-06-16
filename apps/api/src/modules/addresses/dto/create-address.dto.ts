import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsLatitude, IsLongitude, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateAddressDto {
  @ApiPropertyOptional({ example: 'Casa' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiProperty({ example: 'Rua das Flores' })
  @IsString()
  @MinLength(2)
  street: string;

  @ApiProperty({ example: '123' })
  @IsString()
  number: string;

  @ApiPropertyOptional({ example: 'Apto 45' })
  @IsOptional()
  @IsString()
  complement?: string;

  @ApiProperty({ example: 'Centro' })
  @IsString()
  neighborhood: string;

  @ApiProperty({ example: 'São Paulo' })
  @IsString()
  city: string;

  @ApiProperty({ example: 'SP' })
  @IsString()
  state: string;

  @ApiProperty({ example: '01001-000' })
  @IsString()
  zipCode: string;

  @ApiPropertyOptional({ example: -23.55052 })
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional({ example: -46.633308 })
  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
