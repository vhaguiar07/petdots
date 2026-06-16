import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(requesterId: string, requesterRole: UserRole, dto: CreateProductDto) {
    const store = await this.prisma.store.findUnique({ where: { id: dto.storeId } });
    if (!store) {
      throw new NotFoundException('Loja não encontrada');
    }
    this.assertOwnership(store.ownerId, requesterId, requesterRole);

    return this.prisma.product.create({
      data: {
        storeId: dto.storeId,
        categoryId: dto.categoryId,
        name: dto.name,
        description: dto.description,
        price: dto.price,
        stock: dto.stock,
        petType: dto.petType,
        images: dto.images
          ? { create: dto.images.map((url, position) => ({ url, position })) }
          : undefined,
      },
      include: { images: true },
    });
  }

  findAll(query: QueryProductsDto) {
    const now = new Date();
    const activePromotionFilter = {
      isActive: true,
      code: null,
      startsAt: { lte: now },
      endsAt: { gte: now },
    };

    const where: any = {
      isActive: true,
    };

    if (query.storeId) {
      where.storeId = query.storeId;
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.petType) {
      where.petType = query.petType;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.onSale) {
      where.OR = [
        { promotions: { some: activePromotionFilter } },
        { store: { promotions: { some: { ...activePromotionFilter, productId: null } } } },
      ];
    }

    return this.prisma.product.findMany({
      where,
      include: {
        images: true,
        promotions: { where: { isActive: true, code: null } },
        category: true,
        store: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findMine(requesterId: string, requesterRole: UserRole, storeId: string) {
    if (!storeId) {
      throw new NotFoundException('Loja não encontrada');
    }

    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      throw new NotFoundException('Loja não encontrada');
    }
    this.assertOwnership(store.ownerId, requesterId, requesterRole);

    return this.prisma.product.findMany({
      where: { storeId },
      include: { images: true, category: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { images: true, promotions: { where: { isActive: true, code: null } }, category: true },
    });
    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }
    return product;
  }

  async update(id: string, requesterId: string, requesterRole: UserRole, dto: UpdateProductDto) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { store: true },
    });
    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }
    this.assertOwnership(product.store.ownerId, requesterId, requesterRole);

    const { images, ...rest } = dto;

    return this.prisma.product.update({
      where: { id },
      data: {
        ...rest,
        images: images
          ? {
              deleteMany: {},
              create: images.map((url, position) => ({ url, position })),
            }
          : undefined,
      },
      include: { images: true },
    });
  }

  async remove(id: string, requesterId: string, requesterRole: UserRole) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { store: true },
    });
    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }
    this.assertOwnership(product.store.ownerId, requesterId, requesterRole);

    await this.prisma.product.update({ where: { id }, data: { isActive: false } });
  }

  private assertOwnership(storeOwnerId: string, requesterId: string, requesterRole: UserRole) {
    if (storeOwnerId !== requesterId && requesterRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Você não tem permissão para gerenciar este produto');
    }
  }
}
