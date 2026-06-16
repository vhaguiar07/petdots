import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { slugify } from '../../common/utils/slugify';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCategoryDto) {
    const slug = slugify(dto.name);
    const existing = await this.prisma.category.findFirst({
      where: { OR: [{ name: dto.name }, { slug }] },
    });
    if (existing) {
      throw new ConflictException('Categoria já existe');
    }

    return this.prisma.category.create({ data: { name: dto.name, slug } });
  }

  findAll() {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  async findById(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException('Categoria não encontrada');
    }
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findById(id);
    const data: { name?: string; slug?: string } = {};
    if (dto.name) {
      data.name = dto.name;
      data.slug = slugify(dto.name);
    }
    return this.prisma.category.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findById(id);
    await this.prisma.category.delete({ where: { id } });
  }
}
