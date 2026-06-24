import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DiscountType, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';

@Injectable()
export class PromotionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(requesterId: string, requesterRole: UserRole, dto: CreatePromotionDto) {
    const store = await this.prisma.store.findUnique({ where: { id: dto.storeId } });
    if (!store) {
      throw new NotFoundException('Loja não encontrada');
    }
    this.assertOwnership(store.ownerId, requesterId, requesterRole);
    this.assertValidValue(dto.discountType, dto.value);

    if (dto.storeProductId) {
      const storeProduct = await this.prisma.storeProduct.findUnique({
        where: { id: dto.storeProductId },
      });
      if (!storeProduct || storeProduct.storeId !== dto.storeId) {
        throw new NotFoundException('Produto não encontrado nesta loja');
      }
    }

    if (new Date(dto.endsAt) <= new Date(dto.startsAt)) {
      throw new BadRequestException('A data de término deve ser posterior à data de início');
    }

    const code = dto.code || null;
    if (code) {
      await this.assertCodeAvailable(dto.storeId, code);
    }

    if (dto.highlighted && !code) {
      throw new BadRequestException('Apenas cupons (com código) podem ser destacados na página da loja');
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.highlighted) {
        await tx.promotion.updateMany({
          where: { storeId: dto.storeId, highlighted: true },
          data: { highlighted: false },
        });
      }

      return tx.promotion.create({
        data: {
          storeId: dto.storeId,
          storeProductId: dto.storeProductId,
          name: dto.name,
          discountType: dto.discountType,
          value: dto.value,
          code,
          startsAt: new Date(dto.startsAt),
          endsAt: new Date(dto.endsAt),
          highlighted: dto.highlighted ?? false,
          highlightMessage: dto.highlightMessage || null,
        },
      });
    });
  }

  findActiveForStore(storeId: string) {
    const now = new Date();
    return this.prisma.promotion.findMany({
      where: {
        storeId,
        code: null,
        isActive: true,
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
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

    return this.prisma.promotion.findMany({
      where: { storeId },
      include: {
        storeProduct: {
          select: {
            id: true,
            catalogProduct: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findHighlightedCoupon(storeId: string) {
    const now = new Date();
    return this.prisma.promotion.findFirst({
      where: {
        storeId,
        highlighted: true,
        isActive: true,
        code: { not: null },
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
    });
  }

  async findCouponForStore(storeId: string, code: string) {
    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      return null;
    }

    const now = new Date();
    return this.prisma.promotion.findFirst({
      where: {
        storeId,
        code: normalized,
        isActive: true,
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
    });
  }

  async findById(id: string) {
    const promotion = await this.prisma.promotion.findUnique({ where: { id } });
    if (!promotion) {
      throw new NotFoundException('Promoção não encontrada');
    }
    return promotion;
  }

  async update(id: string, requesterId: string, requesterRole: UserRole, dto: UpdatePromotionDto) {
    const promotion = await this.findById(id);
    const store = await this.prisma.store.findUniqueOrThrow({ where: { id: promotion.storeId } });
    this.assertOwnership(store.ownerId, requesterId, requesterRole);

    if (dto.discountType || dto.value !== undefined) {
      this.assertValidValue(dto.discountType ?? promotion.discountType, dto.value ?? Number(promotion.value));
    }

    let code: string | null | undefined;
    if (dto.code !== undefined) {
      code = dto.code || null;
      if (code && code !== promotion.code) {
        await this.assertCodeAvailable(promotion.storeId, code, id);
      }
    }

    if (dto.highlighted && (code ?? promotion.code) === null) {
      throw new BadRequestException('Apenas cupons (com código) podem ser destacados na página da loja');
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.highlighted) {
        await tx.promotion.updateMany({
          where: { storeId: promotion.storeId, highlighted: true, id: { not: id } },
          data: { highlighted: false },
        });
      }

      return tx.promotion.update({
        where: { id },
        data: {
          ...dto,
          code,
          highlightMessage: dto.highlightMessage !== undefined ? dto.highlightMessage || null : undefined,
          startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
          endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        },
      });
    });
  }

  async remove(id: string, requesterId: string, requesterRole: UserRole) {
    const promotion = await this.findById(id);
    const store = await this.prisma.store.findUniqueOrThrow({ where: { id: promotion.storeId } });
    this.assertOwnership(store.ownerId, requesterId, requesterRole);

    await this.prisma.promotion.update({ where: { id }, data: { isActive: false } });
  }

  private async assertCodeAvailable(storeId: string, code: string, excludeId?: string) {
    const existing = await this.prisma.promotion.findFirst({
      where: { storeId, code, isActive: true, id: excludeId ? { not: excludeId } : undefined },
    });
    if (existing) {
      throw new BadRequestException('Já existe uma promoção ativa com este código nesta loja');
    }
  }

  private assertValidValue(discountType: DiscountType, value: number) {
    if (discountType === DiscountType.PERCENTAGE && value > 100) {
      throw new BadRequestException('Desconto percentual não pode ser maior que 100');
    }
  }

  private assertOwnership(storeOwnerId: string, requesterId: string, requesterRole: UserRole) {
    if (storeOwnerId !== requesterId && requesterRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Você não tem permissão para gerenciar esta promoção');
    }
  }
}
