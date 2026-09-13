import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../../../config/env.schema.js';
import { ExpireOverdueOrdersUseCase } from '../application/expire-overdue-orders.use-case.js';

/**
 * The runner behind the auto-rejection: a `setInterval`, and nothing else.
 *
 * 🔴 **`@nestjs/schedule` is deliberately not used** (ADR-0017). The repository
 * already runs one package outside its peer range (`nestjs-zod` against Nest
 * 12, ADR-0007), and a second one — for a timer the platform ships — is risk
 * without gain. When the **second** job exists (the daily reconciliation of
 * pd-17) there will be a real question about scheduling, and a library can be
 * chosen against two real cases instead of one imagined.
 *
 * Three details that are not incidental:
 *
 * - `.unref()`, so the timer never keeps the process alive. Without it a test
 *   run and `contract:write` would both hang at the end;
 * - **off when `NODE_ENV=test`**, so a suite's clock is its own. The use case
 *   is called directly by the e2e, which is the part worth testing anyway;
 * - an error inside a sweep is **logged and swallowed here**. This is the one
 *   place a `catch` is right: an exception escaping the callback of a timer
 *   kills the timer, and one bad row would silently end auto-rejection for the
 *   life of the process.
 *
 * ⚠️ The runner itself has no test — only the use case it calls. Declared as a
 * gap rather than papered over.
 */
@Injectable()
export class OrderExpirySweeper implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrderExpirySweeper.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly expireOverdueOrders: ExpireOverdueOrdersUseCase,
  ) {}

  onModuleInit(): void {
    const intervalMs = this.config.get('ORDER_EXPIRY_SWEEP_INTERVAL_MS', { infer: true });
    const isTest = this.config.get('NODE_ENV', { infer: true }) === 'test';

    if (intervalMs === 0 || isTest) {
      this.logger.log('order expiry sweeper disabled');
      return;
    }

    this.timer = setInterval(() => {
      void this.sweep();
    }, intervalMs);

    this.timer.unref();

    this.logger.log(`order expiry sweeper enabled, every ${String(intervalMs)} ms`);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async sweep(): Promise<void> {
    try {
      await this.expireOverdueOrders.execute(new Date());
    } catch (error) {
      this.logger.error(
        'order expiry sweep failed',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
