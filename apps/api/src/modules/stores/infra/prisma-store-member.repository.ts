import { Injectable } from '@nestjs/common';
import type { Store as PrismaStore, StoreMember as PrismaStoreMember } from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service.js';
import type { IStoreMemberRepository } from '../domain/istore-member.repository.js';
import type { StoreMembership, StoreMembershipOfUser } from '../domain/store-member.js';

@Injectable()
export class PrismaStoreMemberRepository implements IStoreMemberRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMembership(storeId: string, userId: string): Promise<StoreMembership | null> {
    // 🔴 The unique pair is the query. Dropping either id here is what the red
    // proof of the scope test mutates: without `userId` the guard would let any
    // member of any store through.
    const row = await this.prisma.storeMember.findUnique({
      where: { storeId_userId: { storeId, userId } },
      select: { storeId: true, role: true },
    });

    return row ? { storeId: row.storeId, role: row.role } : null;
  }

  async listByUser(userId: string): Promise<StoreMembershipOfUser[]> {
    const rows = await this.prisma.storeMember.findMany({
      where: { userId },
      include: { store: true },
      // Deterministic order, so two identical requests answer identically.
      orderBy: { store: { name: 'asc' } },
    });

    // No `status` filter: a paused store still belongs to its owner, and the
    // panel is where they go to un-pause it (ADR-0018, A8).
    return rows.map(toMembershipOfUser);
  }
}

function toMembershipOfUser(
  row: PrismaStoreMember & { store: PrismaStore },
): StoreMembershipOfUser {
  return {
    storeId: row.storeId,
    role: row.role,
    store: {
      id: row.store.id,
      slug: row.store.slug,
      name: row.store.name,
      neighborhood: row.store.neighborhood,
    },
  };
}
