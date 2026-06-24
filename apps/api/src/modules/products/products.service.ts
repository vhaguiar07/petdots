import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PriceAlertsService } from '../price-alerts/price-alerts.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';

const STORE_PRODUCT_INCLUDE = {
  catalogProduct: {
    include: { images: true, category: true, petType: true, brand: true },
  },
  promotions: { where: { isActive: true, code: null } },
} as const;

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly priceAlertsService: PriceAlertsService,
  ) {}

  async create(requesterId: string, requesterRole: UserRole, dto: CreateProductDto) {
    const store = await this.prisma.store.findUnique({ where: { id: dto.storeId } });
    if (!store) {
      throw new NotFoundException('Loja não encontrada');
    }
    this.assertOwnership(store.ownerId, requesterId, requesterRole);

    return this.prisma.$transaction(async (tx) => {
      let catalogProductId: string;

      if (dto.catalogProductId) {
        const existing = await tx.catalogProduct.findUnique({ where: { id: dto.catalogProductId } });
        if (!existing) throw new NotFoundException('Produto do catálogo não encontrado');

        const alreadyAdded = await tx.storeProduct.findUnique({
          where: { storeId_catalogProductId: { storeId: dto.storeId, catalogProductId: dto.catalogProductId } },
        });
        if (alreadyAdded) throw new BadRequestException('Sua loja já possui este produto no catálogo');

        catalogProductId = dto.catalogProductId;
      } else {
        if (!dto.name) throw new BadRequestException('O campo "name" é obrigatório ao criar um novo produto');

        const catalogProduct = await tx.catalogProduct.create({
          data: {
            createdByStoreId: dto.storeId,
            categoryId: dto.categoryId,
            petTypeId: dto.petTypeId,
            brandId: dto.brandId,
            name: dto.name,
            barcode: dto.barcode,
            description: dto.description,
            status: 'PENDING_REVIEW',
            images: dto.images
              ? { create: dto.images.map((url, position) => ({ url, position })) }
              : undefined,
          },
        });
        catalogProductId = catalogProduct.id;
      }

      return tx.storeProduct.create({
        data: {
          storeId: dto.storeId,
          catalogProductId,
          price: dto.price,
          stock: dto.stock,
        },
        include: STORE_PRODUCT_INCLUDE,
      });
    });
  }

  searchCatalog(search: string) {
    return this.prisma.catalogProduct.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { brand: { name: { contains: search, mode: 'insensitive' } } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      },
      include: { images: true, category: true, petType: true, brand: true },
      orderBy: [{ storeProducts: { _count: 'desc' } }, { name: 'asc' }],
      take: 20,
    });
  }

  async findAll(query: QueryProductsDto) {
    const now = new Date();
    const activePromotionFilter = {
      isActive: true,
      code: null,
      startsAt: { lte: now },
      endsAt: { gte: now },
    };

    const where: any = {
      isActive: true,
      catalogProduct: {
        status: 'ACTIVE',
      },
    };

    if (query.storeId) {
      where.storeId = query.storeId;
    }

    if (query.categoryId) {
      where.catalogProduct = { ...where.catalogProduct, categoryId: query.categoryId };
    }

    if (query.petTypeId) {
      where.catalogProduct = { ...where.catalogProduct, petTypeId: query.petTypeId };
    }

    if (query.search) {
      where.OR = [
        { catalogProduct: { name: { contains: query.search, mode: 'insensitive' } } },
        { catalogProduct: { description: { contains: query.search, mode: 'insensitive' } } },
        { customDescription: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.onSale) {
      where.OR = [
        { promotions: { some: activePromotionFilter } },
        { store: { promotions: { some: { ...activePromotionFilter, storeProductId: null } } } },
      ];
    }

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.prisma.storeProduct.findMany({
        where,
        include: { ...STORE_PRODUCT_INCLUDE, store: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.storeProduct.count({ where }),
    ]);

    return { items, total, page, pageSize };
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

    return this.prisma.storeProduct.findMany({
      where: { storeId },
      include: {
        catalogProduct: { include: { images: true, category: true, petType: true, brand: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const storeProduct = await this.prisma.storeProduct.findUnique({
      where: { id },
      include: STORE_PRODUCT_INCLUDE,
    });
    if (!storeProduct) {
      throw new NotFoundException('Produto não encontrado');
    }
    return storeProduct;
  }

  async update(id: string, requesterId: string, requesterRole: UserRole, dto: UpdateProductDto) {
    const storeProduct = await this.prisma.storeProduct.findUnique({
      where: { id },
      include: { store: true, catalogProduct: true },
    });
    if (!storeProduct) {
      throw new NotFoundException('Produto não encontrado');
    }
    this.assertOwnership(storeProduct.store.ownerId, requesterId, requesterRole);

    const { images, name, description, categoryId, petTypeId, brandId, price, stock, isActive } = dto;

    return this.prisma.$transaction(async (tx) => {
      if (name !== undefined || description !== undefined || categoryId !== undefined || petTypeId !== undefined || brandId !== undefined || images !== undefined) {
        await tx.catalogProduct.update({
          where: { id: storeProduct.catalogProductId },
          data: {
            ...(name !== undefined && { name }),
            ...(description !== undefined && { description }),
            ...(categoryId !== undefined && { categoryId }),
            ...(petTypeId !== undefined && { petTypeId }),
            ...(brandId !== undefined && { brandId }),
            ...(images !== undefined && {
              images: {
                deleteMany: {},
                create: images.map((url, position) => ({ url, position })),
              },
            }),
          },
        });
      }

      const updated = await tx.storeProduct.update({
        where: { id },
        data: {
          ...(price !== undefined && { price }),
          ...(stock !== undefined && { stock }),
          ...(isActive !== undefined && { isActive }),
        },
        include: STORE_PRODUCT_INCLUDE,
      });

      if (price !== undefined && Number(price) !== Number(storeProduct.price)) {
        await tx.priceHistory.create({ data: { storeProductId: id, price } });
        await this.priceAlertsService.checkAlerts(storeProduct.catalogProductId, Number(price));
      }

      return updated;
    });
  }

  // ---- Featured ("Premium Choice") -------------------------------------

  async getFeatured(limit = 6) {
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT sp.id
      FROM store_products sp
      INNER JOIN catalog_products cp ON cp.id = sp."catalogProductId"
      LEFT JOIN (
        SELECT oi."storeProductId", SUM(oi.quantity)::float AS qty
        FROM order_items oi
        INNER JOIN orders o ON o.id = oi."orderId"
        WHERE o."createdAt" >= NOW() - INTERVAL '7 days'
        GROUP BY oi."storeProductId"
      ) recent ON recent."storeProductId" = sp.id
      WHERE sp."isActive" = true
        AND sp.stock > 0
        AND sp."avgRating" >= 3.5
        AND sp."reviewCount" >= 3
        AND cp.status = 'ACTIVE'
      ORDER BY (
        sp."avgRating" * 0.5
        + LN(sp."reviewCount" + 1) * 0.3
        + COALESCE(recent.qty, 0) * 0.2
      ) DESC
      LIMIT ${limit}
    `;

    if (rows.length === 0) return [];

    const ids = rows.map((r) => r.id);
    const products = await this.prisma.storeProduct.findMany({
      where: { id: { in: ids } },
      include: { ...STORE_PRODUCT_INCLUDE, store: true },
    });

    // preserve ranking order
    return ids.map((id) => products.find((p) => p.id === id)).filter(Boolean);
  }

  // ---- Idea 1: Price comparison ----------------------------------------

  comparePrices(catalogProductId: string) {
    return this.prisma.storeProduct.findMany({
      where: { catalogProductId, isActive: true, stock: { gt: 0 } },
      include: {
        store: { select: { id: true, name: true, slug: true, logoUrl: true, avgRating: true, deliveryTimeMinutes: true } },
        promotions: { where: { isActive: true, code: null, startsAt: { lte: new Date() }, endsAt: { gte: new Date() } } },
      },
      orderBy: { price: 'asc' },
    });
  }

  // ---- Idea 2: Global product reputation --------------------------------

  async globalReputation(catalogProductId: string) {
    const storeProducts = await this.prisma.storeProduct.findMany({
      where: { catalogProductId },
      select: { id: true },
    });
    const ids = storeProducts.map((sp) => sp.id);

    const agg = await this.prisma.productReview.aggregate({
      where: { storeProductId: { in: ids } },
      _avg: { rating: true },
      _count: { id: true },
    });

    const distribution = await this.prisma.productReview.groupBy({
      by: ['rating'],
      where: { storeProductId: { in: ids } },
      _count: { id: true },
      orderBy: { rating: 'desc' },
    });

    return {
      catalogProductId,
      avgRating: agg._avg.rating ?? 0,
      totalReviews: agg._count.id,
      distribution: distribution.map((d) => ({ rating: d.rating, count: d._count.id })),
    };
  }

  // ---- Idea 3: Global best-sellers ranking ------------------------------

  async globalRankings(limit = 20) {
    const result = await this.prisma.orderItem.groupBy({
      by: ['storeProductId'],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit * 3, // fetch more to account for distinct catalogProductId
    });

    const storeProductIds = result.map((r) => r.storeProductId);
    const storeProducts = await this.prisma.storeProduct.findMany({
      where: { id: { in: storeProductIds } },
      select: { id: true, catalogProductId: true },
    });

    const spMap = new Map(storeProducts.map((sp) => [sp.id, sp.catalogProductId]));
    const totals = new Map<string, number>();
    for (const r of result) {
      const cpId = spMap.get(r.storeProductId);
      if (!cpId) continue;
      totals.set(cpId, (totals.get(cpId) ?? 0) + (r._sum.quantity ?? 0));
    }

    const ranked = [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);

    const catalogProducts = await this.prisma.catalogProduct.findMany({
      where: { id: { in: ranked.map(([id]) => id) } },
      include: { images: true, category: true, brand: true },
    });

    const cpMap = new Map(catalogProducts.map((cp) => [cp.id, cp]));
    return ranked
      .map(([catalogProductId, totalSold]) => ({ catalogProduct: cpMap.get(catalogProductId), totalSold }))
      .filter((r) => r.catalogProduct != null);
  }

  // ---- Idea 5: Price history for a StoreProduct -------------------------

  getPriceHistory(storeProductId: string) {
    return this.prisma.priceHistory.findMany({
      where: { storeProductId },
      orderBy: { recordedAt: 'asc' },
    });
  }

  async remove(id: string, requesterId: string, requesterRole: UserRole) {
    const storeProduct = await this.prisma.storeProduct.findUnique({
      where: { id },
      include: { store: true },
    });
    if (!storeProduct) {
      throw new NotFoundException('Produto não encontrado');
    }
    this.assertOwnership(storeProduct.store.ownerId, requesterId, requesterRole);

    await this.prisma.storeProduct.update({ where: { id }, data: { isActive: false } });
  }

  private assertOwnership(storeOwnerId: string, requesterId: string, requesterRole: UserRole) {
    if (storeOwnerId !== requesterId && requesterRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Você não tem permissão para gerenciar este produto');
    }
  }
}
