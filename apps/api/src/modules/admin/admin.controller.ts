import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { AdminService } from './admin.service';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';
import { QueryStoresDto } from './dto/query-stores.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateStoreStatusDto } from './dto/update-store-status.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditLog } from '../../common/decorators/audit-log.decorator';

@ApiTags('admin')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stores')
  @ApiOperation({ summary: 'Lista todas as lojas, com filtro opcional por status' })
  listStores(@Query() query: QueryStoresDto) {
    return this.adminService.listStores(query);
  }

  @AuditLog({ entity: 'Store', action: 'UPDATE_STATUS' })
  @Patch('stores/:id/status')
  @ApiOperation({ summary: 'Aprova, suspende ou reativa uma loja' })
  updateStoreStatus(@Param('id') id: string, @Body() dto: UpdateStoreStatusDto) {
    return this.adminService.updateStoreStatus(id, dto);
  }

  @Get('users')
  @ApiOperation({ summary: 'Lista usuários, com filtro opcional por papel' })
  listUsers(@Query() query: QueryUsersDto) {
    return this.adminService.listUsers(query);
  }

  @AuditLog({ entity: 'User', action: 'UPDATE' })
  @Patch('users/:id')
  @ApiOperation({ summary: 'Atualiza papel e/ou status de ativação de um usuário' })
  updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.adminService.updateUser(id, dto);
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Lista logs de auditoria, paginado' })
  listAuditLogs(@Query() query: QueryAuditLogsDto) {
    return this.adminService.listAuditLogs(query);
  }
}
