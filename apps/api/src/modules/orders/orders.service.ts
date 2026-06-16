import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DiscountType, OrderStatus, Prisma, Product, Promotion, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersGateway } from './orders.gateway';
import { DeliveryProviderFactory } from '../delivery/delivery-provider.factory';
import { PromotionsService } from '../promotions/promotions.service';

const ORDER_INCLUDE = {
  items: { include: { product: true } },
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

    const productIds = dto.items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
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
    const stockUpdates: { productId: string; quantity: number }[] = [];

    for (const item of dto.items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product || product.storeId !== dto.storeId || !product.isActive) {
        throw new NotFoundException(`Produto ${item.productId} não encontrado nesta loja`);
      }
      if (product.stock < item.quantity) {
        throw new BadRequestException(`Estoque insuficiente para o produto "${product.name}"`);
      }

      const originalPrice = Number(product.price);
      const discountPerUnit = this.bestDiscountPerUnit(product, promotions, originalPrice);
      const unitPrice = Math.max(originalPrice - discountPerUnit, 0);

      subtotal += originalPrice * item.quantity;
      discountTotal += discountPerUnit * item.quantity;

      orderItemsData.push({
        productId: product.id,
        quantity: item.quantity,
        unitPrice,
      });
      stockUpdates.push({ productId: product.id, quantity: item.quantity });
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
        await tx.product.update({
          where: { id: update.productId },
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
      await this.prisma.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }
  }

  private assertValidTransition(current: OrderStatus, next: OrderStatus) {
    if (!ALLOWED_TRANSITIONS[current].includes(next)) {
      throw new BadRequestException(`Não é possível mudar o status de ${current} para ${next}`);
    }
  }

  private bestDiscountPerUnit(product: Product, promotions: Promotion[], originalPrice: number) {
    const applicable = promotions.filter(
      (promo) => promo.productId === product.id || promo.productId === null,
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
