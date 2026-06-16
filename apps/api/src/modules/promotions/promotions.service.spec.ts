import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DiscountType, UserRole } from '@prisma/client';
import { PromotionsService } from './promotions.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('PromotionsService', () => {
  let service: PromotionsService;
  let prisma: {
    store: Record<string, jest.Mock>;
    product: Record<string, jest.Mock>;
    promotion: Record<string, jest.Mock>;
    $transaction: jest.Mock;
  };

  const store = { id: 'store-1', ownerId: 'owner-1' };
  const basePromotion = {
    storeId: 'store-1',
    name: 'Black Friday',
    discountType: DiscountType.PERCENTAGE,
    value: 10,
    startsAt: '2026-01-01T00:00:00.000Z',
    endsAt: '2026-01-31T00:00:00.000Z',
  };

  beforeEach(async () => {
    prisma = {
      store: { findUnique: jest.fn(), findUniqueOrThrow: jest.fn() },
      product: { findUnique: jest.fn() },
      promotion: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    prisma.promotion.findFirst.mockResolvedValue(null);
    prisma.$transaction.mockImplementation((cb: (tx: typeof prisma) => unknown) => cb(prisma));

    const module: TestingModule = await Test.createTestingModule({
      providers: [PromotionsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(PromotionsService);
  });

  describe('create', () => {
    it('throws NotFoundException if store does not exist', async () => {
      prisma.store.findUnique.mockResolvedValue(null);

      await expect(service.create('owner-1', UserRole.STORE_OWNER, basePromotion)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException if requester does not own the store', async () => {
      prisma.store.findUnique.mockResolvedValue(store);

      await expect(
        service.create('someone-else', UserRole.STORE_OWNER, basePromotion),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException for percentage discount above 100', async () => {
      prisma.store.findUnique.mockResolvedValue(store);

      await expect(
        service.create('owner-1', UserRole.STORE_OWNER, { ...basePromotion, value: 150 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when endsAt is before startsAt', async () => {
      prisma.store.findUnique.mockResolvedValue(store);

      await expect(
        service.create('owner-1', UserRole.STORE_OWNER, {
          ...basePromotion,
          startsAt: '2026-02-01T00:00:00.000Z',
          endsAt: '2026-01-01T00:00:00.000Z',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates the promotion when valid', async () => {
      prisma.store.findUnique.mockResolvedValue(store);
      prisma.promotion.create.mockResolvedValue({ id: 'promo-1' });

      const result = await service.create('owner-1', UserRole.STORE_OWNER, basePromotion);

      expect(result).toEqual({ id: 'promo-1' });
      expect(prisma.promotion.create).toHaveBeenCalled();
    });

    it('creates an automatic discount with code null when no code is provided', async () => {
      prisma.store.findUnique.mockResolvedValue(store);
      prisma.promotion.create.mockResolvedValue({ id: 'promo-1' });

      await service.create('owner-1', UserRole.STORE_OWNER, basePromotion);

      expect(prisma.promotion.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ code: null }),
      });
    });

    it('persists the coupon code when provided', async () => {
      prisma.store.findUnique.mockResolvedValue(store);
      prisma.promotion.create.mockResolvedValue({ id: 'promo-1' });

      await service.create('owner-1', UserRole.STORE_OWNER, { ...basePromotion, code: 'PROMO10' });

      expect(prisma.promotion.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ code: 'PROMO10' }),
      });
    });

    it('rejects a duplicate active code in the same store', async () => {
      prisma.store.findUnique.mockResolvedValue(store);
      prisma.promotion.findFirst.mockResolvedValue({ id: 'promo-existing', code: 'PROMO10' });

      await expect(
        service.create('owner-1', UserRole.STORE_OWNER, { ...basePromotion, code: 'PROMO10' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findActiveForStore', () => {
    it('only returns active promotions without a coupon code', async () => {
      prisma.promotion.findMany.mockResolvedValue([]);

      await service.findActiveForStore('store-1');

      expect(prisma.promotion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ storeId: 'store-1', code: null, isActive: true }),
        }),
      );
    });
  });

  describe('findCouponForStore', () => {
    it('returns the promotion when the code matches an active coupon within its date window', async () => {
      const coupon = { id: 'promo-1', storeId: 'store-1', code: 'PROMO10', isActive: true };
      prisma.promotion.findFirst.mockResolvedValue(coupon);

      const result = await service.findCouponForStore('store-1', 'promo10');

      expect(result).toEqual(coupon);
      expect(prisma.promotion.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ storeId: 'store-1', code: 'PROMO10', isActive: true }),
        }),
      );
    });

    it('returns null when the code does not exist or is expired', async () => {
      prisma.promotion.findFirst.mockResolvedValue(null);

      const result = await service.findCouponForStore('store-1', 'INVALID');

      expect(result).toBeNull();
    });
  });

  describe('findMine', () => {
    it('throws NotFoundException if the store does not exist', async () => {
      prisma.store.findUnique.mockResolvedValue(null);

      await expect(service.findMine('owner-1', UserRole.STORE_OWNER, 'store-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException if the requester does not own the store', async () => {
      prisma.store.findUnique.mockResolvedValue(store);

      await expect(
        service.findMine('someone-else', UserRole.STORE_OWNER, 'store-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns active and inactive promotions for the owner', async () => {
      prisma.store.findUnique.mockResolvedValue(store);
      const promotions = [
        { id: 'promo-1', isActive: true, code: null },
        { id: 'promo-2', isActive: false, code: 'PROMO10' },
      ];
      prisma.promotion.findMany.mockResolvedValue(promotions);

      const result = await service.findMine('owner-1', UserRole.STORE_OWNER, 'store-1');

      expect(result).toEqual(promotions);
      expect(prisma.promotion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { storeId: 'store-1' } }),
      );
    });
  });
});
