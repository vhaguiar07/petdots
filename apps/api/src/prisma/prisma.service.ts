import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import type { Env } from '../config/env.schema.js';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  /**
   * Prisma 7 takes the connection through a driver adapter instead of the `url`
   * that used to live in `schema.prisma` (ADR-0007). The URL comes from the
   * validated environment rather than `process.env` directly, so a missing or
   * malformed value fails in `validateEnv` — one place, before anything boots.
   */
  constructor(config: ConfigService<Env, true>) {
    super({
      adapter: new PrismaPg({
        connectionString: config.get('DATABASE_URL', { infer: true }),
      }),
    });
  }

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
