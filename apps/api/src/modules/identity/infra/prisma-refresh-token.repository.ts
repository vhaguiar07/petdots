import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service.js';
import type {
  IRefreshTokenRepository,
  StoredRefreshToken,
} from '../domain/irefresh-token.repository.js';

@Injectable()
export class PrismaRefreshTokenRepository implements IRefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async issue(input: { userId: string; tokenHash: string; expiresAt: Date }): Promise<void> {
    await this.prisma.refreshToken.create({ data: input });
  }

  async findByHash(tokenHash: string): Promise<StoredRefreshToken | null> {
    const row = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    return row
      ? { id: row.id, userId: row.userId, expiresAt: row.expiresAt, revokedAt: row.revokedAt }
      : null;
  }

  /**
   * One conditional `UPDATE`, and the row count is the answer.
   *
   * `updateMany` rather than `update` on purpose: it filters on `revoked_at IS
   * NULL` in the same statement that writes, so two requests replaying the same
   * refresh token cannot both win. Reading the row first and then revoking it
   * would leave exactly that gap, and a rotation that can be replayed is a
   * rotation in name only (ADR-0011, A7 / C4).
   */
  async revoke(tokenHash: string): Promise<boolean> {
    const { count } = await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return count > 0;
  }
}
