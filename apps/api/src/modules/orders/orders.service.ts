import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DiscountType, OrderStatus, Prisma, Promotion, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersGateway } from './orders.gateway';
import { DeliveryProviderFactory } from '../delivery/delivery-provider.factory';
import { PromotionsService } from '../promotions/promotions.service';

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const ORDER_INCLUDE = {
  items: {
    include: {
      storeProduct: {
        include: { catalogProduct: { include: { images: true } } },
      },
    },
  },
  address: true,
  store: true,
  delivery: true,
} satisfies Prisma.OrderInclude;

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.CANCELLED],
  [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersGateway: OrdersGateway,
    private readonly deliveryProviderFactory: DeliveryProviderFactory,
    private readonly promotionsService: PromotionsService,
  ) {}

  async create(customerId: string, dto: CreateOrderDto) {
    const address = await this.prisma.address.findUnique({ where: { id: dto.addressId } });
    if (!address || address.userId !== customerId) {
      throw new NotFoundException('Endereço não encontrado');
    }

    const store = await this.prisma.store.findUnique({ where: { id: dto.storeId } });
    if (!store) {
      throw new NotFoundException('Loja não encontrada');
    }
    if (store.status !== 'ACTIVE') {
      throw new BadRequestException('Esta loja não está disponível para pedidos');
    }

    if (
      store.latitude !== null &&
      store.longitude !== null &&
      address.latitude !== null &&
      address.longitude !== null
    ) {
      const distanceKm = haversineKm(
        store.latitude,
        store.longitude,
        address.latitude,
        address.longitude,
      );
      if (distanceKm > store.deliveryRadiusKm) {
        throw new BadRequestException(
          `Esta loja não realiza entregas neste endereço (distância: ${distanceKm.toFixed(1)} km, raio máximo: ${store.deliveryRadiusKm} km)`,
        );
      }
    }

    const storeProductIds = dto.items.map((item) => item.storeProductId);
    const storeProducts = await this.prisma.storeProduct.findMany({
      where: { id: { in: storeProductIds } },
      include: { catalogProduct: true },
    });

    const now = new Date();
    const promotions = await this.prisma.promotion.findMany({
      where: {
        storeId: dto.storeId,
        code: null,
        isActive: true,
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
    });

    let appliedCouponCode: string | null = null;
    if (dto.couponCode) {
      const coupon = await this.promotionsService.findCouponForStore(dto.storeId, dto.couponCode);
      if (!coupon) {
        throw new BadRequestException('Cupom inválido ou expirado');
      }
      promotions.push(coupon);
      appliedCouponCode = coupon.code;
    }

    let subtotal = 0;
    let discountTotal = 0;
    const orderItemsData: Prisma.OrderItemCreateManyOrderInput[] = [];
    const stockUpdates: { storeProductId: string; quantity: number }[] = [];

    for (const item of dto.items) {
      const storeProduct = storeProducts.find((p) => p.id === item.storeProductId);
      if (!storeProduct || storeProduct.storeId !== dto.storeId || !storeProduct.isActive) {
        throw new NotFoundException(`Produto ${item.storeProductId} não encontrado nesta loja`);
      }
      if (storeProduct.stock < item.quantity) {
        throw new BadRequestException(
          `Estoque insuficiente para o produto "${storeProduct.catalogProduct.name}"`,
        );
      }

      const originalPrice = Number(storeProduct.price);
      const discountPerUnit = this.bestDiscountPerUnit(storeProduct.id, promotions, originalPrice);
      const unitPrice = Math.max(originalPrice - discountPerUnit, 0);

      subtotal += originalPrice * item.quantity;
      discountTotal += discountPerUnit * item.quantity;

      orderItemsData.push({
        storeProductId: storeProduct.id,
        quantity: item.quantity,
        unitPrice,
      });
      stockUpdates.push({ storeProductId: storeProduct.id, quantity: item.quantity });
    }

    const deliveryFee = 0;
    const total = subtotal - discountTotal + deliveryFee;

    const order = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          customerId,
          storeId: dto.storeId,
          addressId: dto.addressId,
          subtotal,
          discountTotal,
          deliveryFee,
          total,
          couponCode: appliedCouponCode,
          items: { createMany: { data: orderItemsData } },
        },
        include: ORDER_INCLUDE,
      });

      for (const update of stockUpdates) {
        await tx.storeProduct.update({
          where: { id: update.storeProductId },
          data: { stock: { decrement: update.quantity } },
        });
      }

      const delivery = await this.deliveryProviderFactory
        .resolve(store.deliveryProvider)
        .createDelivery(tx, order.id);

      return { ...order, delivery };
    });

    this.ordersGateway.emitOrderCreated(order);

    return order;
  }

  findMyOrders(customerId: string) {
    return this.prisma.order.findMany({
      where: { customerId },
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findForStore(requesterId: string, requesterRole: UserRole, storeId: string) {
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      throw new NotFoundException('Loja não encontrada');
    }
    this.assertStoreOwnership(store.ownerId, requesterId, requesterRole);

    return this.prisma.order.findMany({
      where: { storeId },
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, requesterId: string, requesterRole: UserRole) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: ORDER_INCLUDE });
    if (!order) {
      throw new NotFoundException('Pedido não encontrado');
    }

    const isCustomer = order.customerId === requesterId;
    const isStoreOwner = order.store.ownerId === requesterId;
    if (!isCustomer && !isStoreOwner && requesterRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Você não tem permissão para acessar este pedido');
    }

    return order;
  }

  async updateStatus(
    id: string,
    requesterId: string,
    requesterRole: UserRole,
    status: OrderStatus,
  ) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: { store: true } });
    if (!order) {
      throw new NotFoundException('Pedido não encontrado');
    }
    this.assertStoreOwnership(order.store.ownerId, requesterId, requesterRole);

    this.assertValidTransition(order.status, status);

    if (status === OrderStatus.CANCELLED && order.status !== OrderStatus.CANCELLED) {
      await this.restoreStock(id);
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: { status },
      include: ORDER_INCLUDE,
    });

    const delivery = await this.deliveryProviderFactory
      .resolve(order.store.deliveryProvider)
      .syncStatus(this.prisma, id, status);
    if (delivery) {
      updated.delivery = delivery;
    }

    this.ordersGateway.emitOrderUpdated(updated);

    return updated;
  }

  async cancel(id: string, customerId: string) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: { store: true } });
    if (!order) {
      throw new NotFoundException('Pedido não encontrado');
    }
    if (order.customerId !== customerId) {
      throw new ForbiddenException('Você não tem permissão para cancelar este pedido');
    }
    this.assertValidTransition(order.status, OrderStatus.CANCELLED);

    await this.restoreStock(id);

    const updated = await this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.CANCELLED },
      include: ORDER_INCLUDE,
    });

    const delivery = await this.deliveryProviderFactory
      .resolve(order.store.deliveryProvider)
      .syncStatus(this.prisma, id, OrderStatus.CANCELLED);
    if (delivery) {
      updated.delivery = delivery;
    }

    this.ordersGateway.emitOrderUpdated(updated);

    return updated;
  }

  private async restoreStock(orderId: string) {
    const items = await this.prisma.orderItem.findMany({ where: { orderId } });
    for (const item of items) {
      await this.prisma.storeProduct.update({
        where: { id: item.storeProductId },
        data: { stock: { increment: item.quantity } },
      });
    }
  }

  private assertValidTransition(current: OrderStatus, next: OrderStatus) {
    if (!ALLOWED_TRANSITIONS[current].includes(next)) {
      throw new BadRequestException(`Não é possível mudar o status de ${current} para ${next}`);
    }
  }

  private bestDiscountPerUnit(storeProductId: string, promotions: Promotion[], originalPrice: number) {
    const applicable = promotions.filter(
      (promo) => promo.storeProductId === storeProductId || promo.storeProductId === null,
    );

    let bestDiscount = 0;
    for (const promo of applicable) {
      const discount =
        promo.discountType === DiscountType.PERCENTAGE
          ? originalPrice * (Number(promo.value) / 100)
          : Number(promo.value);
      if (discount > bestDiscount) {
        bestDiscount = discount;
      }
    }

    return Math.min(bestDiscount, originalPrice);
  }

  private assertStoreOwnership(storeOwnerId: string, requesterId: string, requesterRole: UserRole) {
    if (storeOwnerId !== requesterId && requesterRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Você não tem permissão para gerenciar pedidos desta loja');
    }
  }
}
