import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemInputDto {
  @ApiProperty({ example: 'product-id' })
  @IsString()
  productId: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @ApiProperty({ example: 'store-id' })
  @IsString()
  storeId: string;

  @ApiProperty({ example: 'address-id' })
  @IsString()
  addressId: string;

  @ApiProperty({ type: [OrderItemInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemInputDto)
  items: OrderItemInputDto[];

  @ApiPropertyOptional({ example: 'BLACKFRIDAY10', description: 'Código de cupom de desconto' })
  @IsOptional()
  @IsString()
  couponCode?: string;
}
