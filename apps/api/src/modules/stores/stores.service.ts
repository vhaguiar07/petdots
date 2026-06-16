import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { ListStoresQueryDto } from './dto/list-stores-query.dto';
import { slugify } from '../../common/utils/slugify';
import { OrderStatus, Prisma, Store, UserRole } from '@prisma/client';
import { GeocodingService } from '../../common/geocoding/geocoding.service';

const REVENUE_BY_DAY_WINDOW_DAYS = 30;
const TOP_PRODUCTS_LIMIT = 5;
const IN_PROGRESS_STATUSES: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.OUT_FOR_DELIVERY,
];

const EARTH_RADIUS_KM = 6371;
const NEARBY_RADIUS_KM = 20;
const NEARBY_FALLBACK_LIMIT = 10;
const TOP_RATED_LIMIT = 6;

const STORE_ADDRESS_FIELDS = [
  'street',
  'number',
  'neighborhood',
  'city',
  'state',
  'zipCode',
] as const;

export type StoreWithDistance = Store & { distanceKm?: number };

export interface StoreStatsRevenuePoint {
  date: string;
  revenue: number;
}

export interface StoreStatsTopProduct {
  productId: string;
  name: string;
  quantitySold: number;
  revenue: number;
}

export interface StoreStats {
  revenueDelivered: number;
  revenueInProgress: number;
  ordersCount: number;
  cancelledOrdersCount: number;
  activeProductsCount: number;
  ordersByStatus: Record<OrderStatus, number>;
  revenueByDay: StoreStatsRevenuePoint[];
  topProducts: StoreStatsTopProduct[];
}

@Injectable()
export class StoresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geocodingService: GeocodingService,
  ) {}

  async create(ownerId: string, dto: CreateStoreDto) {
    const baseSlug = slugify(dto.name);
    const slug = await this.ensureUniqueSlug(baseSlug);

    const coordinates = await this.geocodingService.geocodeAddress({
      street: dto.street,
      number: dto.number,
      neighborhood: dto.neighborhood,
      city: dto.city,
      state: dto.state,
      zipCode: dto.zipCode,
    });

    return this.prisma.store.create({
      data: {
        ownerId,
        name: dto.name,
        description: dto.description,
        deliveryProvider: dto.deliveryProvider,
        storeType: dto.storeType,
        street: dto.street,
        number: dto.number,
        neighborhood: dto.neighborhood,
        city: dto.city,
        state: dto.state,
        zipCode: dto.zipCode,
        latitude: coordinates?.latitude,
        longitude: coordinates?.longitude,
        slug,
      },
    });
  }

  async findAll(query: ListStoresQueryDto = {}): Promise<StoreWithDistance[]> {
    const whereClause: any = {
      status: 'ACTIVE',
    };

    if (query.storeType) {
      whereClause.storeType = query.storeType;
    }

    if (query.deliveryProvider) {
      whereClause.deliveryProvider = query.deliveryProvider;
    }

    const stores = await this.prisma.store.findMany({ where: whereClause });

    if (query.sort === 'rating') {
      return [...stores]
        .sort((a, b) => b.avgRating - a.avgRating || b.reviewCount - a.reviewCount)
        .slice(0, query.limit ?? TOP_RATED_LIMIT);
    }

    if (query.sort === 'newest') {
      return [...stores]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, query.limit ?? NEARBY_FALLBACK_LIMIT);
    }

    if (query.lat !== undefined && query.lng !== undefined) {
      const withDistance: StoreWithDistance[] = stores
        .filter((store) => store.latitude !== null && store.longitude !== null)
        .map((store) => ({
          ...store,
          distanceKm: this.haversineDistanceKm(
            query.lat as number,
            query.lng as number,
            store.latitude as number,
            store.longitude as number,
          ),
        }))
        .sort((a, b) => (a.distanceKm as number) - (b.distanceKm as number));

      const nearby = withDistance.filter((store) => (store.distanceKm as number) <= NEARBY_RADIUS_KM);
      if (nearby.length > 0) {
        return nearby;
      }

      return withDistance.slice(0, query.limit ?? NEARBY_FALLBACK_LIMIT);
    }

    return stores;
  }

  findByOwner(ownerId: string) {
    return this.prisma.store.findFirst({ where: { ownerId } });
  }

  async findById(id: string) {
    const store = await this.prisma.store.findUnique({ where: { id } });
    if (!store) {
      throw new NotFoundException('Loja não encontrada');
    }
    return store;
  }

  async update(
    id: string,
    requesterId: string,
    requesterRole: UserRole,
    dto: UpdateStoreDto,
  ) {
    const store = await this.findById(id);

    if (store.ownerId !== requesterId && requesterRole !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Você não tem permissão para editar esta loja',
      );
    }

    const addressChanged = STORE_ADDRESS_FIELDS.some((field) => dto[field] !== undefined);
    let coordinates: { latitude: number; longitude: number } | null = null;
    if (addressChanged) {
      coordinates = await this.geocodingService.geocodeAddress({
        street: dto.street ?? store.street ?? '',
        number: dto.number ?? store.number ?? '',
        neighborhood: dto.neighborhood ?? store.neighborhood ?? '',
        city: dto.city ?? store.city ?? '',
        state: dto.state ?? store.state ?? '',
        zipCode: dto.zipCode ?? store.zipCode ?? '',
      });
    }

    const { businessHours, ...rest } = dto;

    return this.prisma.store.update({
      where: { id },
      data: {
        ...rest,
        ...(businessHours !== undefined
          ? { businessHours: businessHours as unknown as Prisma.InputJsonValue }
          : {}),
        ...(addressChanged
          ? { latitude: coordinates?.latitude ?? null, longitude: coordinates?.longitude ?? null }
          : {}),
      },
    });
  }

  async getStats(
    storeId: string,
    requesterId: string,
    requesterRole: UserRole,
  ): Promise<StoreStats> {
    const store = await this.findById(storeId);
    if (store.ownerId !== requesterId && requesterRole !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Você não tem permissão para ver as estatísticas desta loja',
      );
    }

    const orders = await this.prisma.order.findMany({
      where: { storeId },
      select: { status: true, total: true, createdAt: true },
    });

    const ordersByStatus = Object.fromEntries(
      Object.values(OrderStatus).map((status) => [status, 0]),
    ) as Record<OrderStatus, number>;

    let revenueDelivered = 0;
    let revenueInProgress = 0;
    let ordersCount = 0;
    let cancelledOrdersCount = 0;

    for (const order of orders) {
      ordersByStatus[order.status] += 1;
      const total = Number(order.total);

      if (order.status === OrderStatus.DELIVERED) {
        revenueDelivered += total;
        ordersCount += 1;
      } else if (order.status === OrderStatus.CANCELLED) {
        cancelledOrdersCount += 1;
      } else if (IN_PROGRESS_STATUSES.includes(order.status)) {
        revenueInProgress += total;
        ordersCount += 1;
      }
    }

    const revenueByDay = this.buildRevenueByDay(
      orders.filter((order) => order.status === OrderStatus.DELIVERED),
    );

    const activeProductsCount = await this.prisma.product.count({
      where: { storeId, isActive: true },
    });

    const topProducts = await this.getTopProducts(storeId);

    return {
      revenueDelivered,
      revenueInProgress,
      ordersCount,
      cancelledOrdersCount,
      activeProductsCount,
      ordersByStatus,
      revenueByDay,
      topProducts,
    };
  }

  private buildRevenueByDay(
    deliveredOrders: { total: Prisma.Decimal; createdAt: Date }[],
  ): StoreStatsRevenuePoint[] {
    const revenueByDate = new Map<string, number>();
    for (const order of deliveredOrders) {
      const date = order.createdAt.toISOString().slice(0, 10);
      revenueByDate.set(
        date,
        (revenueByDate.get(date) ?? 0) + Number(order.total),
      );
    }

    const points: StoreStatsRevenuePoint[] = [];
    const today = new Date();
    for (let i = REVENUE_BY_DAY_WINDOW_DAYS - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setUTCDate(date.getUTCDate() - i);
      const key = date.toISOString().slice(0, 10);
      points.push({ date: key, revenue: revenueByDate.get(key) ?? 0 });
    }

    return points;
  }

  private async getTopProducts(
    storeId: string,
  ): Promise<StoreStatsTopProduct[]> {
    const items = await this.prisma.orderItem.findMany({
      where: { order: { storeId, status: OrderStatus.DELIVERED } },
      select: {
        productId: true,
        quantity: true,
        unitPrice: true,
        product: { select: { name: true } },
      },
    });

    const byProduct = new Map<string, StoreStatsTopProduct>();
    for (const item of items) {
      const existing = byProduct.get(item.productId);
      const revenue = Number(item.unitPrice) * item.quantity;
      if (existing) {
        existing.quantitySold += item.quantity;
        existing.revenue += revenue;
      } else {
        byProduct.set(item.productId, {
          productId: item.productId,
          name: item.product.name,
          quantitySold: item.quantity,
          revenue,
        });
      }
    }

    return Array.from(byProduct.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, TOP_PRODUCTS_LIMIT);
  }

  private async ensureUniqueSlug(baseSlug: string): Promise<string> {
    let slug = baseSlug;
    let suffix = 1;
    while (await this.prisma.store.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${++suffix}`;
    }
    return slug;
  }

  private haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
