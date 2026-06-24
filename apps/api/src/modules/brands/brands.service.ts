import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Injectable()
export class BrandsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBrandDto) {
    const existing = await this.prisma.brand.findUnique({ where: { name: dto.name } });
    if (existing) throw new ConflictException('Marca já existe');
    return this.prisma.brand.create({ data: { name: dto.name } });
  }

  findAll() {
    return this.prisma.brand.findMany({ orderBy: { name: 'asc' } });
  }

  async findById(id: string) {
    const brand = await this.prisma.brand.findUnique({ where: { id } });
    if (!brand) throw new NotFoundException('Marca não encontrada');
    return brand;
  }

  async update(id: string, dto: UpdateBrandDto) {
    await this.findById(id);
    return this.prisma.brand.update({ where: { id }, data: { name: dto.name } });
  }

  async remove(id: string) {
    await this.findById(id);
    await this.prisma.brand.delete({ where: { id } });
  }
}
