import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { StoreStatus, UserRole } from '@prisma/client';
import { AdminService } from './admin.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AdminService', () => {
  let service: AdminService;
  let prisma: { store: Record<string, jest.Mock>; user: Record<string, jest.Mock> };
  let auditLogService: { findAll: jest.Mock };

  beforeEach(async () => {
    prisma = {
      store: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    auditLogService = { findAll: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogService, useValue: auditLogService },
      ],
    }).compile();

    service = module.get(AdminService);
  });

  describe('listStores', () => {
    it('lists stores filtered by status', async () => {
      prisma.store.findMany.mockResolvedValue([{ id: 'store-1', status: StoreStatus.PENDING_APPROVAL }]);

      const result = await service.listStores({ status: StoreStatus.PENDING_APPROVAL });

      expect(result).toEqual([{ id: 'store-1', status: StoreStatus.PENDING_APPROVAL }]);
      expect(prisma.store.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: StoreStatus.PENDING_APPROVAL } }),
      );
    });
  });

  describe('updateStoreStatus', () => {
    it('throws NotFoundException if store does not exist', async () => {
      prisma.store.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStoreStatus('store-1', { status: StoreStatus.ACTIVE }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.store.update).not.toHaveBeenCalled();
    });

    it('updates the store status', async () => {
      prisma.store.findUnique.mockResolvedValue({ id: 'store-1', status: StoreStatus.PENDING_APPROVAL });
      prisma.store.update.mockResolvedValue({ id: 'store-1', status: StoreStatus.ACTIVE });

      const result = await service.updateStoreStatus('store-1', { status: StoreStatus.ACTIVE });

      expect(result).toEqual({ id: 'store-1', status: StoreStatus.ACTIVE });
      expect(prisma.store.update).toHaveBeenCalledWith({
        where: { id: 'store-1' },
        data: { status: StoreStatus.ACTIVE },
      });
    });
  });

  describe('updateUser', () => {
    it('throws NotFoundException if user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.updateUser('user-1', { isActive: false })).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('updates role and active status', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      prisma.user.update.mockResolvedValue({ id: 'user-1', role: UserRole.ADMIN, isActive: false });

      const result = await service.updateUser('user-1', {
        role: UserRole.ADMIN,
        isActive: false,
      });

      expect(result).toEqual({ id: 'user-1', role: UserRole.ADMIN, isActive: false });
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: { role: UserRole.ADMIN, isActive: false },
        }),
      );
    });
  });

  describe('listAuditLogs', () => {
    it('delegates to AuditLogService.findAll', async () => {
      auditLogService.findAll.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });

      const result = await service.listAuditLogs({ entity: 'Store' });

      expect(result).toEqual({ items: [], total: 0, page: 1, pageSize: 20 });
      expect(auditLogService.findAll).toHaveBeenCalledWith({ entity: 'Store' });
    });
  });
});
