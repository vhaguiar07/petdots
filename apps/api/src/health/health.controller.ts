import { Controller, Get, HttpStatus, Logger, Res } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import type { HealthResponse } from '@petdots/contracts';
import type { Response } from 'express';
import { ZodResponse } from 'nestjs-zod';

import { PrismaService } from '../prisma/prisma.service';
import { HealthResponseDto } from './health.dto';

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Liveness plus the one dependency the API cannot work without
   * (OBSERVABILITY). A failing database answers 503 with the same body shape,
   * so a caller parses both outcomes with a single schema.
   */
  @Get()
  @ZodResponse({ status: HttpStatus.OK, type: HealthResponseDto })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'A API está de pé, mas o banco não responde.',
    type: HealthResponseDto,
  })
  async check(@Res({ passthrough: true }) response: Response): Promise<HealthResponse> {
    const database = await this.probeDatabase();

    response.status(database === 'up' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);

    return {
      status: database === 'up' ? 'ok' : 'degraded',
      database,
      timestamp: new Date().toISOString(),
    };
  }

  private async probeDatabase(): Promise<HealthResponse['database']> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'up';
    } catch (error) {
      this.logger.warn(
        'Database health probe failed',
        error instanceof Error ? error.stack : undefined,
      );
      return 'down';
    }
  }
}
