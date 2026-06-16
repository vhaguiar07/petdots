import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuditLog } from '../../common/decorators/audit-log.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Roles(UserRole.CUSTOMER, UserRole.ADMIN)
  @AuditLog({ entity: 'Order', action: 'CREATE' })
  @Post()
  @ApiOperation({ summary: 'Cria um pedido para o cliente autenticado' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({
    summary:
      'Lista pedidos do cliente autenticado, ou da loja informada (para lojista/admin)',
  })
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryOrdersDto) {
    if (query.storeId) {
      return this.ordersService.findForStore(user.id, user.role, query.storeId);
    }
    return this.ordersService.findMyOrders(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha um pedido (cliente, lojista da loja ou admin)' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.findById(id, user.id, user.role);
  }

  @Roles(UserRole.STORE_OWNER, UserRole.ADMIN)
  @AuditLog({ entity: 'Order', action: 'UPDATE_STATUS' })
  @Patch(':id/status')
  @ApiOperation({ summary: 'Atualiza o status de um pedido (lojista da loja ou admin)' })
  updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, user.id, user.role, dto.status);
  }

  @Roles(UserRole.CUSTOMER, UserRole.ADMIN)
  @AuditLog({ entity: 'Order', action: 'CANCEL' })
  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancela um pedido (apenas o cliente que o fez, se ainda PENDING)' })
  cancel(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.cancel(id, user.id);
  }
}
