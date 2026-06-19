import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatus, UserRole } from '@prisma/client';
import { StoresService } from './stores.service';
import { PrismaService } from '../../prisma/prisma.service';
import { GeocodingService } from '../../common/geocoding/geocoding.service';

describe('StoresService', () => {
  let service: StoresService;
  let prisma: {
    store: Record<string, jest.Mock>;
    order: Record<string, jest.Mock>;
    orderItem: Record<string, jest.Mock>;
    product: Record<string, jest.Mock>;
  };
  let geocodingService: { geocodeAddress: jest.Mock };

  const store = { id: 'store-1', ownerId: 'owner-1' };

  const address = {
    street: 'Rua das Flores',
    number: '123',
    neighborhood: 'Centro',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '01001-000',
  };

  beforeEach(async () => {
    prisma = {
      store: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
      order: { findMany: jest.fn() },
      orderItem: { findMany: jest.fn() },
      product: { count: jest.fn() },
    };
    geocodingService = { geocodeAddress: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoresService,
        { provide: PrismaService, useValue: prisma },
        { provide: GeocodingService, useValue: geocodingService },
      ],
    }).compile();

    service = module.get(StoresService);
  });

  describe('getStats', () => {
    it('throws NotFoundException if store does not exist', async () => {
      prisma.store.findUnique.mockResolvedValue(null);

      await expect(
        service.getStats('store-1', 'owner-1', UserRole.STORE_OWNER),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if requester is not the owner or admin', async () => {
      prisma.store.findUnique.mockResolvedValue(store);

      await expect(
        service.getStats('store-1', 'someone-else', UserRole.STORE_OWNER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows an admin to view stats even if not the store owner', async () => {
      prisma.store.findUnique.mockResolvedValue(store);
      prisma.order.findMany.mockResolvedValue([]);
      prisma.orderItem.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);

      await expect(
        service.getStats('store-1', 'admin-1', UserRole.ADMIN),
      ).resolves.toBeDefined();
    });

    it('only counts DELIVERED orders as revenue, splits in-progress revenue and excludes cancelled orders', async () => {
      prisma.store.findUnique.mockResolvedValue(store);
      prisma.order.findMany.mockResolvedValue([
        {
          status: OrderStatus.DELIVERED,
          total: '100.00',
          createdAt: new Date('2026-06-10'),
        },
        {
          status: OrderStatus.DELIVERED,
          total: '50.00',
          createdAt: new Date('2026-06-10'),
        },
        {
          status: OrderStatus.CANCELLED,
          total: '200.00',
          createdAt: new Date('2026-06-11'),
        },
        {
          status: OrderStatus.PREPARING,
          total: '70.00',
          createdAt: new Date('2026-06-12'),
        },
      ]);
      prisma.orderItem.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(3);

      const result = await service.getStats(
        'store-1',
        'owner-1',
        UserRole.STORE_OWNER,
      );

      expect(result.revenueDelivered).toBe(150);
      expect(result.revenueInProgress).toBe(70);
      expect(result.ordersCount).toBe(3);
      expect(result.cancelledOrdersCount).toBe(1);
      expect(result.activeProductsCount).toBe(3);
      expect(result.ordersByStatus[OrderStatus.DELIVERED]).toBe(2);
      expect(result.ordersByStatus[OrderStatus.CANCELLED]).toBe(1);
      expect(result.ordersByStatus[OrderStatus.PREPARING]).toBe(1);
    });

    it('builds a 30-day revenue series from DELIVERED orders', async () => {
      prisma.store.findUnique.mockResolvedValue(store);
      const today = new Date().toISOString().slice(0, 10);
      prisma.order.findMany.mockResolvedValue([
        {
          status: OrderStatus.DELIVERED,
          total: '100.00',
          createdAt: new Date(),
        },
      ]);
      prisma.orderItem.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);

      const result = await service.getStats(
        'store-1',
        'owner-1',
        UserRole.STORE_OWNER,
      );

      expect(result.revenueByDay).toHaveLength(30);
      expect(result.revenueByDay[result.revenueByDay.length - 1]).toEqual({
        date: today,
        revenue: 100,
      });
    });

    it('aggregates top products by revenue from DELIVERED order items', async () => {
      prisma.store.findUnique.mockResolvedValue(store);
      prisma.order.findMany.mockResolvedValue([]);
      prisma.orderItem.findMany.mockResolvedValue([
        {
          productId: 'p1',
          quantity: 2,
          unitPrice: '10.00',
          product: { name: 'Ração A' },
        },
        {
          productId: 'p1',
          quantity: 1,
          unitPrice: '10.00',
          product: { name: 'Ração A' },
        },
        {
          productId: 'p2',
          quantity: 5,
          unitPrice: '50.00',
          product: { name: 'Brinquedo B' },
        },
      ]);
      prisma.product.count.mockResolvedValue(0);

      const result = await service.getStats(
        'store-1',
        'owner-1',
        UserRole.STORE_OWNER,
      );

      expect(result.topProducts).toEqual([
        { productId: 'p2', name: 'Brinquedo B', quantitySold: 5, revenue: 250 },
        { productId: 'p1', name: 'Ração A', quantitySold: 3, revenue: 30 },
      ]);
    });
  });

  describe('create', () => {
    it('geocodes the store address and persists the coordinates', async () => {
      prisma.store.findUnique.mockResolvedValue(null);
      geocodingService.geocodeAddress.mockResolvedValue({ latitude: -23.55, longitude: -46.63 });
      prisma.store.create.mockResolvedValue({ id: 'store-1', ...address });

      await service.create('owner-1', { name: 'Pet Shop Amigo Fiel', ...address });

      expect(geocodingService.geocodeAddress).toHaveBeenCalledWith(address);
      expect(prisma.store.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          latitude: -23.55,
          longitude: -46.63,
          ...address,
        }),
      });
    });

    it('creates the store without coordinates when geocoding finds nothing', async () => {
      prisma.store.findUnique.mockResolvedValue(null);
      geocodingService.geocodeAddress.mockResolvedValue(null);
      prisma.store.create.mockResolvedValue({ id: 'store-1', ...address });

      await service.create('owner-1', { name: 'Pet Shop Amigo Fiel', ...address });

      expect(prisma.store.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          latitude: undefined,
          longitude: undefined,
        }),
      });
    });
  });

  describe('update', () => {
    it('re-geocodes when an address field changes, merging with the existing address', async () => {
      prisma.store.findUnique.mockResolvedValue({ id: 'store-1', ownerId: 'owner-1', ...address });
      geocodingService.geocodeAddress.mockResolvedValue({ latitude: 1, longitude: 2 });
      prisma.store.update.mockResolvedValue({ id: 'store-1' });

      await service.update('store-1', 'owner-1', UserRole.STORE_OWNER, { number: '456' });

      expect(geocodingService.geocodeAddress).toHaveBeenCalledWith({ ...address, number: '456' });
      expect(prisma.store.update).toHaveBeenCalledWith({
        where: { id: 'store-1' },
        data: expect.objectContaining({ number: '456', latitude: 1, longitude: 2 }),
      });
    });

    it('sets coordinates to null when re-geocoding fails after an address change', async () => {
      prisma.store.findUnique.mockResolvedValue({ id: 'store-1', ownerId: 'owner-1', ...address });
      geocodingService.geocodeAddress.mockResolvedValue(null);
      prisma.store.update.mockResolvedValue({ id: 'store-1' });

      await service.update('store-1', 'owner-1', UserRole.STORE_OWNER, { number: '456' });

      expect(prisma.store.update).toHaveBeenCalledWith({
        where: { id: 'store-1' },
        data: expect.objectContaining({ number: '456', latitude: null, longitude: null }),
      });
    });

    it('does not re-geocode when no address field changes', async () => {
      prisma.store.findUnique.mockResolvedValue({ id: 'store-1', ownerId: 'owner-1', ...address });
      prisma.store.update.mockResolvedValue({ id: 'store-1' });

      await service.update('store-1', 'owner-1', UserRole.STORE_OWNER, { name: 'Novo nome' });

      expect(geocodingService.geocodeAddress).not.toHaveBeenCalled();
      expect(prisma.store.update).toHaveBeenCalledWith({
        where: { id: 'store-1' },
        data: { name: 'Novo nome' },
      });
    });
  });

  describe('findAll', () => {
    const activeStore = (overrides: Record<string, unknown>) => ({
      id: 'store-1',
      status: 'ACTIVE',
      avgRating: 0,
      reviewCount: 0,
      latitude: null,
      longitude: null,
      ...overrides,
    });

    it('returns stores within the nearby radius sorted by distance', async () => {
      const near = activeStore({ id: 'near', latitude: -23.5, longitude: -46.6 });
      const far = activeStore({ id: 'far', latitude: -22.9, longitude: -43.2 });
      prisma.store.findMany.mockResolvedValue([far, near]);

      const result = await service.findAll({ lat: -23.5, lng: -46.6 });

      expect(result.map((s) => s.id)).toEqual(['near']);
      expect(result[0].distanceKm).toBeLessThan(20);
    });

    it('falls back to the closest stores when none are within the nearby radius', async () => {
      const far1 = activeStore({ id: 'far-1', latitude: -22.9, longitude: -43.2 });
      const far2 = activeStore({ id: 'far-2', latitude: 40.7, longitude: -74.0 });
      prisma.store.findMany.mockResolvedValue([far2, far1]);

      const result = await service.findAll({ lat: -23.5, lng: -46.6 });

      expect(result[0].id).toBe('far-1');
      expect(result.every((s) => (s.distanceKm as number) > 20)).toBe(true);
    });

    it('sorts by rating when sort=rating, limiting to the requested amount', async () => {
      const stores = [
        activeStore({ id: 'low', avgRating: 3, reviewCount: 10 }),
        activeStore({ id: 'high', avgRating: 4.8, reviewCount: 5 }),
        activeStore({ id: 'mid', avgRating: 4, reviewCount: 1 }),
      ];
      prisma.store.findMany.mockResolvedValue(stores);

      const result = await service.findAll({ sort: 'rating', limit: 2 });

      expect(result.map((s) => s.id)).toEqual(['high', 'mid']);
    });

    it('returns all active stores when no query params are provided', async () => {
      const stores = [activeStore({ id: 'a' }), activeStore({ id: 'b' })];
      prisma.store.findMany.mockResolvedValue(stores);

      const result = await service.findAll();

      expect(result).toEqual(stores);
      expect(prisma.store.findMany).toHaveBeenCalledWith({ where: { status: 'ACTIVE' } });
    });

  });
});
