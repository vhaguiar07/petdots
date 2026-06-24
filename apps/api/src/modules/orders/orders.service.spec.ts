import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DiscountType, DeliveryProviderType, OrderStatus, UserRole } from '@prisma/client';
import { OrdersService } from './orders.service';
import { OrdersGateway } from './orders.gateway';
import { PrismaService } from '../../prisma/prisma.service';
import { DeliveryProviderFactory } from '../delivery/delivery-provider.factory';
import { PromotionsService } from '../promotions/promotions.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: any;
  let promotionsService: { findCouponForStore: jest.Mock };

  const address = { id: 'addr-1', userId: 'customer-1' };
  const store = {
    id: 'store-1',
    ownerId: 'owner-1',
    status: 'ACTIVE',
    deliveryProvider: DeliveryProviderType.SELF,
  };
  const storeProduct = {
    id: 'product-1',
    storeId: 'store-1',
    catalogProduct: { name: 'Ração Premium' },
    price: 100,
    stock: 10,
    isActive: true,
  };

  beforeEach(async () => {
    prisma = {
      address: { findUnique: jest.fn() },
      store: { findUnique: jest.fn() },
      storeProduct: { findMany: jest.fn(), update: jest.fn() },
      promotion: { findMany: jest.fn() },
      order: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      orderItem: { findMany: jest.fn() },
      delivery: { update: jest.fn() },
      $transaction: jest.fn(),
    };

    const ordersGateway = { emitOrderCreated: jest.fn(), emitOrderUpdated: jest.fn() };
    promotionsService = { findCouponForStore: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prisma },
        { provide: OrdersGateway, useValue: ordersGateway },
        { provide: PromotionsService, useValue: promotionsService },
        DeliveryProviderFactory,
      ],
    }).compile();

    service = module.get(OrdersService);
  });

  describe('create', () => {
    const dto = {
      storeId: 'store-1',
      addressId: 'addr-1',
      items: [{ storeProductId: 'product-1', quantity: 2 }],
    };

    beforeEach(() => {
      prisma.address.findUnique.mockResolvedValue(address);
      prisma.store.findUnique.mockResolvedValue(store);
      prisma.storeProduct.findMany.mockResolvedValue([storeProduct]);
      prisma.promotion.findMany.mockResolvedValue([]);
      prisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          order: { create: jest.fn().mockResolvedValue({ id: 'order-1' }) },
          storeProduct: { update: jest.fn() },
          delivery: { create: jest.fn().mockResolvedValue({ id: 'delivery-1' }) },
        };
        return callback(tx);
      });
    });

    it('throws NotFoundException if address does not belong to the customer', async () => {
      prisma.address.findUnique.mockResolvedValue({ id: 'addr-1', userId: 'someone-else' });
      await expect(service.create('customer-1', dto)).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException if store does not exist', async () => {
      prisma.store.findUnique.mockResolvedValue(null);
      await expect(service.create('customer-1', dto)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if store is not active', async () => {
      prisma.store.findUnique.mockResolvedValue({ ...store, status: 'PENDING_APPROVAL' });
      await expect(service.create('customer-1', dto)).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException if product does not belong to the store', async () => {
      prisma.storeProduct.findMany.mockResolvedValue([{ ...storeProduct, storeId: 'other-store' }]);
      await expect(service.create('customer-1', dto)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if stock is insufficient', async () => {
      prisma.storeProduct.findMany.mockResolvedValue([{ ...storeProduct, stock: 1 }]);
      await expect(service.create('customer-1', dto)).rejects.toThrow(BadRequestException);
    });

    it('creates the order applying the best active promotion', async () => {
      prisma.promotion.findMany.mockResolvedValue([
        {
          id: 'promo-1',
          storeId: 'store-1',
          storeProductId: null,
          discountType: DiscountType.PERCENTAGE,
          value: 10,
        },
        {
          id: 'promo-2',
          storeId: 'store-1',
          storeProductId: 'product-1',
          discountType: DiscountType.FIXED_AMOUNT,
          value: 30,
        },
      ]);

      let tx!: any;
      prisma.$transaction.mockImplementation(async (callback: any) => {
        tx = {
          order: { create: jest.fn().mockResolvedValue({ id: 'order-1' }) },
          storeProduct: { update: jest.fn() },
          delivery: { create: jest.fn().mockResolvedValue({ id: 'delivery-1' }) },
        };
        return callback(tx);
      });

      await service.create('customer-1', dto);

      expect(tx.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            customerId: 'customer-1',
            storeId: 'store-1',
            addressId: 'addr-1',
            subtotal: 200,
            discountTotal: 60,
            deliveryFee: 0,
            total: 140,
            items: { createMany: { data: [{ storeProductId: 'product-1', quantity: 2, unitPrice: 70 }] } },
          }),
        }),
      );
      expect(tx.storeProduct.update).toHaveBeenCalledWith({
        where: { id: 'product-1' },
        data: { stock: { decrement: 2 } },
      });
    });

    it('applies a valid coupon and persists its code on the order', async () => {
      promotionsService.findCouponForStore.mockResolvedValue({
        id: 'promo-coupon',
        storeId: 'store-1',
        storeProductId: null,
        discountType: DiscountType.PERCENTAGE,
        value: 20,
        code: 'PROMO20',
      });

      let tx!: any;
      prisma.$transaction.mockImplementation(async (callback: any) => {
        tx = {
          order: { create: jest.fn().mockResolvedValue({ id: 'order-1' }) },
          storeProduct: { update: jest.fn() },
          delivery: { create: jest.fn().mockResolvedValue({ id: 'delivery-1' }) },
        };
        return callback(tx);
      });

      await service.create('customer-1', { ...dto, couponCode: 'promo20' });

      expect(promotionsService.findCouponForStore).toHaveBeenCalledWith('store-1', 'promo20');
      expect(tx.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subtotal: 200,
            discountTotal: 40,
            total: 160,
            couponCode: 'PROMO20',
          }),
        }),
      );
    });

    it('throws BadRequestException if the coupon code is invalid or expired', async () => {
      promotionsService.findCouponForStore.mockResolvedValue(null);
      await expect(service.create('customer-1', { ...dto, couponCode: 'INVALID' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('only queries automatic (code-less) promotions for the store', async () => {
      await service.create('customer-1', dto);
      expect(prisma.promotion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ storeId: 'store-1', code: null }),
        }),
      );
    });
  });

  describe('findById', () => {
    const order = {
      id: 'order-1',
      customerId: 'customer-1',
      status: OrderStatus.PENDING,
      store: { id: 'store-1', ownerId: 'owner-1' },
    };

    it('throws NotFoundException if order does not exist', async () => {
      prisma.order.findUnique.mockResolvedValue(null);
      await expect(service.findById('order-1', 'customer-1', UserRole.CUSTOMER)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException for users unrelated to the order', async () => {
      prisma.order.findUnique.mockResolvedValue(order);
      await expect(service.findById('order-1', 'someone-else', UserRole.CUSTOMER)).rejects.toThrow(ForbiddenException);
    });

    it('allows the customer who placed the order', async () => {
      prisma.order.findUnique.mockResolvedValue(order);
      await expect(service.findById('order-1', 'customer-1', UserRole.CUSTOMER)).resolves.toEqual(order);
    });

    it('allows the store owner', async () => {
      prisma.order.findUnique.mockResolvedValue(order);
      await expect(service.findById('order-1', 'owner-1', UserRole.STORE_OWNER)).resolves.toEqual(order);
    });

    it('allows admins', async () => {
      prisma.order.findUnique.mockResolvedValue(order);
      await expect(service.findById('order-1', 'admin-1', UserRole.ADMIN)).resolves.toEqual(order);
    });
  });

  describe('updateStatus', () => {
    const order = {
      id: 'order-1',
      status: OrderStatus.PENDING,
      store: { ownerId: 'owner-1', deliveryProvider: DeliveryProviderType.SELF },
    };

    beforeEach(() => {
      prisma.delivery.update.mockResolvedValue({ id: 'delivery-1' });
    });

    it('throws ForbiddenException if requester does not own the store', async () => {
      prisma.order.findUnique.mockResolvedValue(order);
      await expect(
        service.updateStatus('order-1', 'someone-else', UserRole.STORE_OWNER, OrderStatus.CONFIRMED),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException for invalid transitions', async () => {
      prisma.order.findUnique.mockResolvedValue(order);
      await expect(
        service.updateStatus('order-1', 'owner-1', UserRole.STORE_OWNER, OrderStatus.DELIVERED),
      ).rejects.toThrow(BadRequestException);
    });

    it('updates the status for a valid transition', async () => {
      prisma.order.findUnique.mockResolvedValue(order);
      prisma.order.update.mockResolvedValue({ ...order, status: OrderStatus.CONFIRMED });

      const result = await service.updateStatus('order-1', 'owner-1', UserRole.STORE_OWNER, OrderStatus.CONFIRMED);
      expect(result.status).toBe(OrderStatus.CONFIRMED);
    });

    it('restores stock when cancelling', async () => {
      prisma.order.findUnique.mockResolvedValue(order);
      prisma.orderItem.findMany.mockResolvedValue([{ storeProductId: 'product-1', quantity: 2 }]);
      prisma.order.update.mockResolvedValue({ ...order, status: OrderStatus.CANCELLED });

      await service.updateStatus('order-1', 'owner-1', UserRole.STORE_OWNER, OrderStatus.CANCELLED);

      expect(prisma.storeProduct.update).toHaveBeenCalledWith({
        where: { id: 'product-1' },
        data: { stock: { increment: 2 } },
      });
    });
  });

  describe('cancel', () => {
    beforeEach(() => {
      prisma.delivery.update.mockResolvedValue({ id: 'delivery-1' });
    });

    it('throws ForbiddenException if the order belongs to another customer', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        customerId: 'other-customer',
        status: OrderStatus.PENDING,
        store: { ownerId: 'owner-1', deliveryProvider: DeliveryProviderType.SELF },
      });
      await expect(service.cancel('order-1', 'customer-1')).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException if the order is no longer cancellable', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        customerId: 'customer-1',
        status: OrderStatus.DELIVERED,
        store: { ownerId: 'owner-1', deliveryProvider: DeliveryProviderType.SELF },
      });
      await expect(service.cancel('order-1', 'customer-1')).rejects.toThrow(BadRequestException);
    });

    it('cancels a pending order and restores stock', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'order-1',
        customerId: 'customer-1',
        status: OrderStatus.PENDING,
        store: { ownerId: 'owner-1', deliveryProvider: DeliveryProviderType.SELF },
      });
      prisma.orderItem.findMany.mockResolvedValue([{ storeProductId: 'product-1', quantity: 2 }]);
      prisma.order.update.mockResolvedValue({ id: 'order-1', status: OrderStatus.CANCELLED });

      const result = await service.cancel('order-1', 'customer-1');

      expect(result.status).toBe(OrderStatus.CANCELLED);
      expect(prisma.storeProduct.update).toHaveBeenCalledWith({
        where: { id: 'product-1' },
        data: { stock: { increment: 2 } },
      });
    });
  });
});
