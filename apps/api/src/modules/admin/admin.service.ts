import { Injectable, NotFoundException } from '@nestjs/common';
import { CatalogProductStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';
import { QueryCatalogDto } from './dto/query-catalog.dto';
import { QueryStoresDto } from './dto/query-stores.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateStoreStatusDto } from './dto/update-store-status.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  phone: true,
  role: true,
  isActive: true,
  emailVerified: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async listStores(query: QueryStoresDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = { status: query.status };
    const [items, total] = await Promise.all([
      this.prisma.store.findMany({
        where,
        include: { owner: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.store.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async updateStoreStatus(id: string, dto: UpdateStoreStatusDto) {
    const store = await this.prisma.store.findUnique({ where: { id } });
    if (!store) throw new NotFoundException('Loja não encontrada');
    return this.prisma.store.update({ where: { id }, data: { status: dto.status } });
  }

  async listUsers(query: QueryUsersDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = { role: query.role };
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: USER_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return this.prisma.user.update({
      where: { id },
      data: { role: dto.role, isActive: dto.isActive },
      select: USER_SELECT,
    });
  }

  listAuditLogs(query: QueryAuditLogsDto) {
    return this.auditLogService.findAll(query);
  }

  async listCatalogProducts(query: QueryCatalogDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = query.status ? { status: query.status } : undefined;
    const [items, total] = await Promise.all([
      this.prisma.catalogProduct.findMany({
        where,
        include: {
          images: true,
          category: true,
          petType: true,
          brand: true,
          createdByStore: { select: { id: true, name: true } },
          _count: { select: { storeProducts: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.catalogProduct.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async updateCatalogProductStatus(id: string, status: CatalogProductStatus) {
    const product = await this.prisma.catalogProduct.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Produto não encontrado');
    return this.prisma.catalogProduct.update({ where: { id }, data: { status } });
  }
}
