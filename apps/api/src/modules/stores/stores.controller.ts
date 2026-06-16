import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { StoresService } from './stores.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { ListStoresQueryDto } from './dto/list-stores-query.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuditLog } from '../../common/decorators/audit-log.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';

@ApiTags('stores')
@ApiBearerAuth()
@Controller('stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Roles(UserRole.STORE_OWNER, UserRole.ADMIN)
  @AuditLog({ entity: 'Store', action: 'CREATE' })
  @Post()
  @ApiOperation({ summary: 'Cria a loja virtual do lojista autenticado' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateStoreDto) {
    return this.storesService.create(user.id, dto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Lista lojas ativas no marketplace' })
  findAll(@Query() query: ListStoresQueryDto) {
    return this.storesService.findAll(query);
  }

  @Roles(UserRole.STORE_OWNER, UserRole.ADMIN)
  @Get('me')
  @ApiOperation({
    summary:
      'Retorna a loja do lojista autenticado (ou null se ainda não criou uma)',
  })
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.storesService.findByOwner(user.id);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Detalha uma loja pelo id' })
  findOne(@Param('id') id: string) {
    return this.storesService.findById(id);
  }

  @Roles(UserRole.STORE_OWNER, UserRole.ADMIN)
  @Get(':id/stats')
  @ApiOperation({
    summary:
      'Retorna indicadores e estatísticas da loja para o painel do lojista',
  })
  getStats(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.storesService.getStats(id, user.id, user.role);
  }

  @Roles(UserRole.STORE_OWNER, UserRole.ADMIN)
  @AuditLog({ entity: 'Store', action: 'UPDATE' })
  @Patch(':id')
  @ApiOperation({
    summary: 'Atualiza dados da loja (apenas o proprietário ou admin)',
  })
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateStoreDto,
  ) {
    return this.storesService.update(id, user.id, user.role, dto);
  }
}
