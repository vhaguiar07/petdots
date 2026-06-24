import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { BrandsService } from './brands.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditLog } from '../../common/decorators/audit-log.decorator';

@ApiTags('brands')
@ApiBearerAuth()
@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Roles(UserRole.ADMIN)
  @AuditLog({ entity: 'Brand', action: 'CREATE' })
  @Post()
  @ApiOperation({ summary: 'Cria uma marca (admin)' })
  create(@Body() dto: CreateBrandDto) {
    return this.brandsService.create(dto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Lista todas as marcas' })
  findAll() {
    return this.brandsService.findAll();
  }

  @Roles(UserRole.ADMIN)
  @AuditLog({ entity: 'Brand', action: 'UPDATE' })
  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza uma marca (admin)' })
  update(@Param('id') id: string, @Body() dto: UpdateBrandDto) {
    return this.brandsService.update(id, dto);
  }

  @Roles(UserRole.ADMIN)
  @AuditLog({ entity: 'Brand', action: 'DELETE' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove uma marca (admin)' })
  async remove(@Param('id') id: string) {
    await this.brandsService.remove(id);
  }
}
