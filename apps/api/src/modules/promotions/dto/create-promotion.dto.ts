import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DiscountType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString, Matches, MaxLength, Min, MinLength } from 'class-validator';

export class CreatePromotionDto {
  @ApiProperty({ example: 'store-id' })
  @IsString()
  storeId: string;

  @ApiPropertyOptional({ example: 'product-id', description: 'Se omitido, a promoção vale para a loja' })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiProperty({ example: 'Black Friday' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ enum: DiscountType, example: DiscountType.PERCENTAGE })
  @IsEnum(DiscountType)
  discountType: DiscountType;

  @ApiProperty({ example: 10, description: 'Percentual (0-100) ou valor fixo, conforme discountType' })
  @IsNumber()
  @Min(0)
  value: number;

  @ApiProperty({ example: '2026-06-20T00:00:00.000Z' })
  @IsDateString()
  startsAt: string;

  @ApiProperty({ example: '2026-06-30T23:59:59.000Z' })
  @IsDateString()
  endsAt: string;

  @ApiPropertyOptional({
    example: 'BLACKFRIDAY10',
    description:
      'Código do cupom. Se preenchido, o cliente precisa informá-lo no checkout para receber o desconto; se omitido, o desconto é aplicado automaticamente.',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @Matches(/^([A-Z0-9_-]{3,20})?$/, {
    message: 'O código do cupom deve ter de 3 a 20 caracteres (letras, números, "-" ou "_")',
  })
  code?: string;

  @ApiPropertyOptional({
    description:
      'Se verdadeiro, este cupom é destacado na página da loja. Apenas um cupom por loja pode ficar destacado; ativar este desfaz o destaque dos demais.',
  })
  @IsOptional()
  @IsBoolean()
  highlighted?: boolean;

  @ApiPropertyOptional({
    example: 'Válido só hoje! Aproveite e leve seu pet para passear com um desconto especial 🐾',
    description: 'Mensagem curta exibida junto ao cupom destacado na página da loja',
  })
  @IsOptional()
  @IsString()
  @MaxLength(140)
  highlightMessage?: string;
}
