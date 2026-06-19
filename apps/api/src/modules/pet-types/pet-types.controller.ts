import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { PetTypesService } from './pet-types.service';
import { CreatePetTypeDto } from './dto/create-pet-type.dto';
import { UpdatePetTypeDto } from './dto/update-pet-type.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditLog } from '../../common/decorators/audit-log.decorator';

@ApiTags('pet-types')
@ApiBearerAuth()
@Controller('pet-types')
export class PetTypesController {
  constructor(private readonly petTypesService: PetTypesService) {}

  @Roles(UserRole.ADMIN)
  @AuditLog({ entity: 'PetType', action: 'CREATE' })
  @Post()
  @ApiOperation({ summary: 'Cria um tipo de pet (admin)' })
  create(@Body() dto: CreatePetTypeDto) {
    return this.petTypesService.create(dto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Lista todos os tipos de pet' })
  findAll() {
    return this.petTypesService.findAll();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Detalha um tipo de pet pelo id' })
  findOne(@Param('id') id: string) {
    return this.petTypesService.findById(id);
  }

  @Roles(UserRole.ADMIN)
  @AuditLog({ entity: 'PetType', action: 'UPDATE' })
  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza um tipo de pet (admin)' })
  update(@Param('id') id: string, @Body() dto: UpdatePetTypeDto) {
    return this.petTypesService.update(id, dto);
  }

  @Roles(UserRole.ADMIN)
  @AuditLog({ entity: 'PetType', action: 'DELETE' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove um tipo de pet (admin)' })
  async remove(@Param('id') id: string) {
    await this.petTypesService.remove(id);
  }
}
