import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePetTypeDto } from './dto/create-pet-type.dto';
import { UpdatePetTypeDto } from './dto/update-pet-type.dto';
import { slugify } from '../../common/utils/slugify';

@Injectable()
export class PetTypesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePetTypeDto) {
    const slug = slugify(dto.name);
    const existing = await this.prisma.petType.findFirst({
      where: { OR: [{ name: dto.name }, { slug }] },
    });
    if (existing) {
      throw new ConflictException('Tipo de pet já existe');
    }

    return this.prisma.petType.create({
      data: { name: dto.name, slug },
    });
  }

  findAll() {
    return this.prisma.petType.findMany({ orderBy: { name: 'asc' } });
  }

  async findById(id: string) {
    const petType = await this.prisma.petType.findUnique({ where: { id } });
    if (!petType) {
      throw new NotFoundException('Tipo de pet não encontrado');
    }
    return petType;
  }

  async update(id: string, dto: UpdatePetTypeDto) {
    await this.findById(id);
    const data: { name?: string; slug?: string } = {};
    if (dto.name) {
      data.name = dto.name;
      data.slug = slugify(dto.name);
    }
    return this.prisma.petType.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findById(id);
    await this.prisma.petType.delete({ where: { id } });
  }
}
