import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';
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

  listStores(query: QueryStoresDto) {
    return this.prisma.store.findMany({
      where: { status: query.status },
      include: { owner: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStoreStatus(id: string, dto: UpdateStoreStatusDto) {
    const store = await this.prisma.store.findUnique({ where: { id } });
    if (!store) {
      throw new NotFoundException('Loja não encontrada');
    }

    return this.prisma.store.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  listUsers(query: QueryUsersDto) {
    return this.prisma.user.findMany({
      where: { role: query.role },
      select: USER_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return this.prisma.user.update({
      where: { id },
      data: { role: dto.role, isActive: dto.isActive },
      select: USER_SELECT,
    });
  }

  listAuditLogs(query: QueryAuditLogsDto) {
    return this.auditLogService.findAll(query);
  }
}
