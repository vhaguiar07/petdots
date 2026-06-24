import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { ProductsService } from './products.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: any;

  const store = { id: 'store-1', ownerId: 'owner-1' };

  beforeEach(async () => {
    prisma = {
      store: { findUnique: jest.fn() },
      catalogProduct: { create: jest.fn(), update: jest.fn() },
      storeProduct: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      $transaction: jest.fn((fn: (tx: any) => Promise<any>) => fn(prisma)),
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
      prisma.catalogProduct.create.mockResolvedValue({ id: 'cat-1' });
      prisma.storeProduct.create.mockResolvedValue({ id: 'sp-1' });

      await service.create('admin-1', UserRole.ADMIN, {
        storeId: 'store-1',
        name: 'Ração',
        price: 10,
        stock: 5,
      });

      expect(prisma.catalogProduct.create).toHaveBeenCalled();
      expect(prisma.storeProduct.create).toHaveBeenCalled();
    });

    it('creates catalog product with nested images when provided', async () => {
      prisma.store.findUnique.mockResolvedValue(store);
      prisma.catalogProduct.create.mockResolvedValue({ id: 'cat-1' });
      prisma.storeProduct.create.mockResolvedValue({ id: 'sp-1' });

      await service.create('owner-1', UserRole.STORE_OWNER, {
        storeId: 'store-1',
        name: 'Ração',
        price: 10,
        stock: 5,
        images: ['https://example.com/a.jpg', 'https://example.com/b.jpg'],
      });

      const createArgs = prisma.catalogProduct.create.mock.calls[0][0];
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

    it('returns all store products (active and inactive)', async () => {
      prisma.store.findUnique.mockResolvedValue(store);
      prisma.storeProduct.findMany.mockResolvedValue([{ id: 'sp-1' }]);

      const result = await service.findMine('owner-1', UserRole.STORE_OWNER, 'store-1');

      expect(prisma.storeProduct.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { storeId: 'store-1' } }),
      );
      expect(result).toEqual([{ id: 'sp-1' }]);
    });
  });

  describe('findAll', () => {
    it('filters by search using case-insensitive contains on catalog name or description', async () => {
      prisma.storeProduct.findMany.mockResolvedValue([]);

      await service.findAll({ search: 'Ração' });

      const where = prisma.storeProduct.findMany.mock.calls[0][0].where;
      expect(where.OR).toEqual(
        expect.arrayContaining([
          { catalogProduct: { name: { contains: 'Ração', mode: 'insensitive' } } },
          { catalogProduct: { description: { contains: 'Ração', mode: 'insensitive' } } },
        ]),
      );
    });

    it('does not add an OR filter when search is not provided', async () => {
      prisma.storeProduct.findMany.mockResolvedValue([]);

      await service.findAll({});

      const where = prisma.storeProduct.findMany.mock.calls[0][0].where;
      expect(where.OR).toBeUndefined();
    });

    it('adds an OR clause requiring an active promotion when onSale is true', async () => {
      prisma.storeProduct.findMany.mockResolvedValue([]);

      await service.findAll({ onSale: true });

      const where = prisma.storeProduct.findMany.mock.calls[0][0].where;
      expect(where.OR).toHaveLength(2);
      expect(where.OR[0].promotions.some).toMatchObject({ isActive: true, code: null });
      expect(where.OR[1].store.promotions.some).toMatchObject({
        isActive: true,
        code: null,
        storeProductId: null,
      });
    });

    it('does not add an OR clause when onSale is not set', async () => {
      prisma.storeProduct.findMany.mockResolvedValue([]);

      await service.findAll({});

      const where = prisma.storeProduct.findMany.mock.calls[0][0].where;
      expect(where.OR).toBeUndefined();
    });
  });

  describe('update', () => {
    it('throws ForbiddenException if requester does not own the product store', async () => {
      prisma.storeProduct.findUnique.mockResolvedValue({ id: 'sp-1', store, catalogProduct: {} });

      await expect(
        service.update('sp-1', 'someone-else', UserRole.STORE_OWNER, { name: 'Novo nome' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
