import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { PromotionsService } from './promotions.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuditLog } from '../../common/decorators/audit-log.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';

@ApiTags('promotions')
@ApiBearerAuth()
@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Roles(UserRole.STORE_OWNER, UserRole.ADMIN)
  @AuditLog({ entity: 'Promotion', action: 'CREATE' })
  @Post()
  @ApiOperation({ summary: 'Cria uma promoção para a loja ou um produto específico' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePromotionDto) {
    return this.promotionsService.create(user.id, user.role, dto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Lista promoções ativas de uma loja' })
  findActiveForStore(@Query('storeId') storeId: string) {
    return this.promotionsService.findActiveForStore(storeId);
  }

  @Roles(UserRole.STORE_OWNER, UserRole.ADMIN)
  @Get('mine')
  @ApiOperation({ summary: 'Lista todas as promoções (ativas e inativas, descontos e cupons) da loja do lojista autenticado' })
  findMine(@CurrentUser() user: AuthenticatedUser, @Query('storeId') storeId: string) {
    return this.promotionsService.findMine(user.id, user.role, storeId);
  }

  @Public()
  @Get('coupon')
  @ApiOperation({ summary: 'Valida um cupom para uma loja' })
  async findCoupon(@Query('storeId') storeId: string, @Query('code') code: string) {
    const promotion = await this.promotionsService.findCouponForStore(storeId, code);
    if (!promotion) {
      throw new NotFoundException('Cupom inválido ou expirado');
    }
    return promotion;
  }

  @Public()
  @Get('highlighted')
  @ApiOperation({ summary: 'Retorna o cupom destacado na página da loja (ou null)' })
  findHighlighted(@Query('storeId') storeId: string) {
    return this.promotionsService.findHighlightedCoupon(storeId);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Detalha uma promoção pelo id' })
  findOne(@Param('id') id: string) {
    return this.promotionsService.findById(id);
  }

  @Roles(UserRole.STORE_OWNER, UserRole.ADMIN)
  @AuditLog({ entity: 'Promotion', action: 'UPDATE' })
  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza uma promoção (apenas o lojista proprietário ou admin)' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePromotionDto,
  ) {
    return this.promotionsService.update(id, user.id, user.role, dto);
  }

  @Roles(UserRole.STORE_OWNER, UserRole.ADMIN)
  @AuditLog({ entity: 'Promotion', action: 'DELETE' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desativa uma promoção' })
  async remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.promotionsService.remove(id, user.id, user.role);
  }
}
