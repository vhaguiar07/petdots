import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PriceAlertsService } from './price-alerts.service';
import { UpsertPriceAlertDto } from './dto/upsert-price-alert.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';

@ApiTags('price-alerts')
@ApiBearerAuth()
@Controller('price-alerts')
export class PriceAlertsController {
  constructor(private readonly priceAlertsService: PriceAlertsService) {}

  @Put()
  @ApiOperation({ summary: 'Cria ou atualiza um alerta de preço para um produto do catálogo' })
  upsert(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpsertPriceAlertDto) {
    return this.priceAlertsService.upsert(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lista os alertas de preço ativos do usuário autenticado' })
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.priceAlertsService.listMine(user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove um alerta de preço' })
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    await this.priceAlertsService.remove(user.id, id);
  }
}
