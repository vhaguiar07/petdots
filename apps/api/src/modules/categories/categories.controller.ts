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
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditLog } from '../../common/decorators/audit-log.decorator';

@ApiTags('categories')
@ApiBearerAuth()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Roles(UserRole.ADMIN)
  @AuditLog({ entity: 'Category', action: 'CREATE' })
  @Post()
  @ApiOperation({ summary: 'Cria uma categoria de produtos (admin)' })
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Lista todas as categorias' })
  findAll() {
    return this.categoriesService.findAll();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Detalha uma categoria pelo id' })
  findOne(@Param('id') id: string) {
    return this.categoriesService.findById(id);
  }

  @Roles(UserRole.ADMIN)
  @AuditLog({ entity: 'Category', action: 'UPDATE' })
  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza uma categoria (admin)' })
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  @Roles(UserRole.ADMIN)
  @AuditLog({ entity: 'Category', action: 'DELETE' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove uma categoria (admin)' })
  async remove(@Param('id') id: string) {
    await this.categoriesService.remove(id);
  }
}
