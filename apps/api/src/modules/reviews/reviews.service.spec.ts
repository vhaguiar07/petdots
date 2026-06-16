import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatus, UserRole } from '@prisma/client';
import { ReviewsService } from './reviews.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let prisma: {
    product: Record<string, jest.Mock>;
    store: Record<string, jest.Mock>;
    order: Record<string, jest.Mock>;
    productReview: Record<string, jest.Mock>;
    storeReview: Record<string, jest.Mock>;
    $transaction: jest.Mock;
  };

  const product = { id: 'product-1', storeId: 'store-1' };
  const store = { id: 'store-1', ownerId: 'owner-1' };
  const eligibleOrder = { id: 'order-1' };
  const dto = { rating: 5, comment: 'Excelente!' };

  const mockTransaction = (tx: Record<string, unknown>) => {
    prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback(tx),
    );
  };

  beforeEach(async () => {
    prisma = {
      product: { findUnique: jest.fn() },
      store: { findUnique: jest.fn() },
      order: { findFirst: jest.fn() },
      productReview: { findUnique: jest.fn() },
      storeReview: { findUnique: jest.fn() },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ReviewsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(ReviewsService);
  });

  describe('upsertProductReview', () => {
    it('throws NotFoundException if product does not exist', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(service.upsertProductReview('product-1', 'customer-1', dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException if customer has no delivered order with this product', async () => {
      prisma.product.findUnique.mockResolvedValue(product);
      prisma.order.findFirst.mockResolvedValue(null);

      await expect(service.upsertProductReview('product-1', 'customer-1', dto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('upserts the review and recomputes the product rating', async () => {
      prisma.product.findUnique.mockResolvedValue(product);
      prisma.order.findFirst.mockResolvedValue(eligibleOrder);

      const tx = {
        productReview: {
          upsert: jest.fn().mockResolvedValue({ id: 'review-1', rating: 5 }),
          aggregate: jest.fn().mockResolvedValue({ _avg: { rating: 5 }, _count: 1 }),
        },
        product: { update: jest.fn() },
      };
      mockTransaction(tx);

      const result = await service.upsertProductReview('product-1', 'customer-1', dto);

      expect(result).toEqual({ id: 'review-1', rating: 5 });
      expect(tx.productReview.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { productId_customerId: { productId: 'product-1', customerId: 'customer-1' } },
        }),
      );
      expect(tx.product.update).toHaveBeenCalledWith({
        where: { id: 'product-1' },
        data: { avgRating: 5, reviewCount: 1 },
      });
    });
  });

  describe('deleteProductReview', () => {
    it('throws NotFoundException if review does not exist', async () => {
      prisma.productReview.findUnique.mockResolvedValue(null);

      await expect(service.deleteProductReview('product-1', 'customer-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deletes the review and recomputes the product rating', async () => {
      prisma.productReview.findUnique.mockResolvedValue({ id: 'review-1' });

      const tx = {
        productReview: {
          delete: jest.fn(),
          aggregate: jest.fn().mockResolvedValue({ _avg: { rating: null }, _count: 0 }),
        },
        product: { update: jest.fn() },
      };
      mockTransaction(tx);

      await service.deleteProductReview('product-1', 'customer-1');

      expect(tx.productReview.delete).toHaveBeenCalledWith({ where: { id: 'review-1' } });
      expect(tx.product.update).toHaveBeenCalledWith({
        where: { id: 'product-1' },
        data: { avgRating: 0, reviewCount: 0 },
      });
    });
  });

  describe('replyToProductReview', () => {
    const review = {
      id: 'review-1',
      productId: 'product-1',
      product: { store: { ownerId: 'owner-1' } },
    };

    it('throws NotFoundException if review does not exist', async () => {
      prisma.productReview = { ...prisma.productReview, findUnique: jest.fn().mockResolvedValue(null), update: jest.fn() };

      await expect(
        service.replyToProductReview('product-1', 'review-1', 'owner-1', UserRole.STORE_OWNER, {
          reply: 'Obrigado!',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if requester is not the store owner or admin', async () => {
      prisma.productReview.findUnique = jest.fn().mockResolvedValue(review);

      await expect(
        service.replyToProductReview('product-1', 'review-1', 'someone-else', UserRole.STORE_OWNER, {
          reply: 'Obrigado!',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows the store owner to reply', async () => {
      prisma.productReview.findUnique = jest.fn().mockResolvedValue(review);
      prisma.productReview.update = jest.fn().mockResolvedValue({ id: 'review-1', ownerReply: 'Obrigado!' });

      const result = await service.replyToProductReview(
        'product-1',
        'review-1',
        'owner-1',
        UserRole.STORE_OWNER,
        { reply: 'Obrigado!' },
      );

      expect(result).toEqual({ id: 'review-1', ownerReply: 'Obrigado!' });
      expect(prisma.productReview.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'review-1' },
          data: expect.objectContaining({ ownerReply: 'Obrigado!' }),
        }),
      );
    });

    it('allows an admin to reply even if not the store owner', async () => {
      prisma.productReview.findUnique = jest.fn().mockResolvedValue(review);
      prisma.productReview.update = jest.fn().mockResolvedValue({ id: 'review-1', ownerReply: 'Obrigado!' });

      await expect(
        service.replyToProductReview('product-1', 'review-1', 'admin-1', UserRole.ADMIN, {
          reply: 'Obrigado!',
        }),
      ).resolves.toEqual({ id: 'review-1', ownerReply: 'Obrigado!' });
    });
  });

  describe('upsertStoreReview', () => {
    it('throws NotFoundException if store does not exist', async () => {
      prisma.store.findUnique.mockResolvedValue(null);

      await expect(service.upsertStoreReview('store-1', 'customer-1', dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException if customer has no delivered order from this store', async () => {
      prisma.store.findUnique.mockResolvedValue(store);
      prisma.order.findFirst.mockResolvedValue(null);

      await expect(service.upsertStoreReview('store-1', 'customer-1', dto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('upserts the review and recomputes the store rating', async () => {
      prisma.store.findUnique.mockResolvedValue(store);
      prisma.order.findFirst.mockResolvedValue(eligibleOrder);

      const tx = {
        storeReview: {
          upsert: jest.fn().mockResolvedValue({ id: 'review-1', rating: 5 }),
          aggregate: jest.fn().mockResolvedValue({ _avg: { rating: 5 }, _count: 1 }),
        },
        store: { update: jest.fn() },
      };
      mockTransaction(tx);

      const result = await service.upsertStoreReview('store-1', 'customer-1', dto);

      expect(result).toEqual({ id: 'review-1', rating: 5 });
      expect(prisma.order.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { customerId: 'customer-1', storeId: 'store-1', status: OrderStatus.DELIVERED },
        }),
      );
      expect(tx.store.update).toHaveBeenCalledWith({
        where: { id: 'store-1' },
        data: { avgRating: 5, reviewCount: 1 },
      });
    });
  });

  describe('replyToStoreReview', () => {
    const review = {
      id: 'review-1',
      storeId: 'store-1',
      store: { ownerId: 'owner-1' },
    };

    it('throws NotFoundException if review belongs to a different store', async () => {
      prisma.storeReview.findUnique = jest.fn().mockResolvedValue({ ...review, storeId: 'other-store' });

      await expect(
        service.replyToStoreReview('store-1', 'review-1', 'owner-1', UserRole.STORE_OWNER, {
          reply: 'Obrigado!',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if requester is not the store owner or admin', async () => {
      prisma.storeReview.findUnique = jest.fn().mockResolvedValue(review);

      await expect(
        service.replyToStoreReview('store-1', 'review-1', 'someone-else', UserRole.STORE_OWNER, {
          reply: 'Obrigado!',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows the store owner to reply', async () => {
      prisma.storeReview.findUnique = jest.fn().mockResolvedValue(review);
      prisma.storeReview.update = jest.fn().mockResolvedValue({ id: 'review-1', ownerReply: 'Obrigado!' });

      const result = await service.replyToStoreReview(
        'store-1',
        'review-1',
        'owner-1',
        UserRole.STORE_OWNER,
        { reply: 'Obrigado!' },
      );

      expect(result).toEqual({ id: 'review-1', ownerReply: 'Obrigado!' });
    });
  });
});
