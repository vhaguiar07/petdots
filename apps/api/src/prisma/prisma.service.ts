import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  /**
   * Connects eagerly so a misconfigured database surfaces at boot, but never
   * aborts it: the process staying up with a failing dependency is what makes
   * the health endpoint meaningful (OBSERVABILITY — health is process +
   * database connection, reported separately). Prisma reconnects on the next
   * query on its own.
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
    } catch (error) {
      this.logger.error(
        'Database connection failed at startup; health will report it as down',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
