import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { ProductsService } from './products.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: {
    store: Record<string, jest.Mock>;
    product: Record<string, jest.Mock>;
  };

  const store = { id: 'store-1', ownerId: 'owner-1' };

  beforeEach(async () => {
    prisma = {
      store: { findUnique: jest.fn() },
      product: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(ProductsService);
  });

  describe('create', () => {
    it('throws NotFoundException if store does not exist', async () => {
      prisma.store.findUnique.mockResolvedValue(null);

      await expect(
        service.create('owner-1', UserRole.STORE_OWNER, {
          storeId: 'store-1',
          name: 'Ração',
          price: 10,
          stock: 5,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if requester does not own the store', async () => {
      prisma.store.findUnique.mockResolvedValue(store);

      await expect(
        service.create('someone-else', UserRole.STORE_OWNER, {
          storeId: 'store-1',
          name: 'Ração',
          price: 10,
          stock: 5,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows ADMIN to create products for any store', async () => {
      prisma.store.findUnique.mockResolvedValue(store);
      prisma.product.create.mockResolvedValue({ id: 'product-1' });

      await service.create('admin-1', UserRole.ADMIN, {
        storeId: 'store-1',
        name: 'Ração',
        price: 10,
        stock: 5,
      });

      expect(prisma.product.create).toHaveBeenCalled();
    });

    it('creates nested images when provided', async () => {
      prisma.store.findUnique.mockResolvedValue(store);
      prisma.product.create.mockResolvedValue({ id: 'product-1' });

      await service.create('owner-1', UserRole.STORE_OWNER, {
        storeId: 'store-1',
        name: 'Ração',
        price: 10,
        stock: 5,
        images: ['https://example.com/a.jpg', 'https://example.com/b.jpg'],
      });

      const createArgs = prisma.product.create.mock.calls[0][0];
      expect(createArgs.data.images.create).toEqual([
        { url: 'https://example.com/a.jpg', position: 0 },
        { url: 'https://example.com/b.jpg', position: 1 },
      ]);
    });
  });

  describe('findMine', () => {
    it('throws NotFoundException if storeId is empty', async () => {
      await expect(service.findMine('owner-1', UserRole.STORE_OWNER, '')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException if store does not exist', async () => {
      prisma.store.findUnique.mockResolvedValue(null);

      await expect(service.findMine('owner-1', UserRole.STORE_OWNER, 'store-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException if requester does not own the store', async () => {
      prisma.store.findUnique.mockResolvedValue(store);

      await expect(
        service.findMine('someone-else', UserRole.STORE_OWNER, 'store-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns all products (active and inactive) of the store', async () => {
      prisma.store.findUnique.mockResolvedValue(store);
      prisma.product.findMany.mockResolvedValue([{ id: 'product-1' }]);

      const result = await service.findMine('owner-1', UserRole.STORE_OWNER, 'store-1');

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { storeId: 'store-1' } }),
      );
      expect(result).toEqual([{ id: 'product-1' }]);
    });
  });

  describe('findAll', () => {
    it('filters by search using case-insensitive contains on name or description', async () => {
      prisma.product.findMany.mockResolvedValue([]);

      await service.findAll({ search: 'Ração' });

      const where = prisma.product.findMany.mock.calls[0][0].where;
      expect(where.OR).toEqual([
        { name: { contains: 'Ração', mode: 'insensitive' } },
        { description: { contains: 'Ração', mode: 'insensitive' } },
      ]);
    });

    it('does not add an OR filter when search is not provided', async () => {
      prisma.product.findMany.mockResolvedValue([]);

      await service.findAll({});

      const where = prisma.product.findMany.mock.calls[0][0].where;
      expect(where.OR).toBeUndefined();
    });

    it('adds an OR clause requiring an active promotion when onSale is true', async () => {
      prisma.product.findMany.mockResolvedValue([]);

      await service.findAll({ onSale: true });

      const where = prisma.product.findMany.mock.calls[0][0].where;
      expect(where.OR).toHaveLength(2);
      expect(where.OR[0].promotions.some).toMatchObject({ isActive: true, code: null });
      expect(where.OR[1].store.promotions.some).toMatchObject({
        isActive: true,
        code: null,
        productId: null,
      });
    });

    it('does not add an OR clause when onSale is not set', async () => {
      prisma.product.findMany.mockResolvedValue([]);

      await service.findAll({});

      const where = prisma.product.findMany.mock.calls[0][0].where;
      expect(where.OR).toBeUndefined();
    });
  });

  describe('update', () => {
    it('throws ForbiddenException if requester does not own the product store', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'product-1', store });

      await expect(
        service.update('product-1', 'someone-else', UserRole.STORE_OWNER, { name: 'Novo nome' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
