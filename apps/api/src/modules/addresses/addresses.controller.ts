import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuditLog } from '../../common/decorators/audit-log.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';

@ApiTags('addresses')
@ApiBearerAuth()
@Controller('addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @AuditLog({ entity: 'Address', action: 'CREATE' })
  @Post()
  @ApiOperation({ summary: 'Cadastra um endereço para o usuário autenticado' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAddressDto) {
    return this.addressesService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lista os endereços do usuário autenticado' })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.addressesService.findAllForUser(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha um endereço do usuário autenticado' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.addressesService.findOwned(id, user.id);
  }

  @AuditLog({ entity: 'Address', action: 'UPDATE' })
  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza um endereço do usuário autenticado' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addressesService.update(id, user.id, dto);
  }

  @AuditLog({ entity: 'Address', action: 'DELETE' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove um endereço do usuário autenticado' })
  async remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.addressesService.remove(id, user.id);
  }
}
