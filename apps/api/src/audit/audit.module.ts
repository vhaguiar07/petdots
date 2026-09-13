import { Module } from '@nestjs/common';

import { AUDIT_TRAIL } from './audit-trail.port.js';
import { PrismaAuditTrail } from './prisma-audit-trail.js';

/**
 * A support module, like `prisma/` and `health/`: it owns a table but no
 * aggregate, so it is not under `modules/`.
 *
 * ⚠️ **No controller, and no read path at all.** Nothing in the API returns an
 * audit line: the trail exists for the platform, and the console that would
 * display it is a backlog item with no owner. Adding a route now would be
 * guessing at who may read it — which is precisely the question the console
 * has to answer first.
 */
@Module({
  providers: [{ provide: AUDIT_TRAIL, useClass: PrismaAuditTrail }],
  exports: [AUDIT_TRAIL],
})
export class AuditModule {}
