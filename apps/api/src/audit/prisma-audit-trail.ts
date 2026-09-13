import { Injectable } from '@nestjs/common';

import { asPrismaTransaction, type PersistenceContext } from '../prisma/persistence-context.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuditEntry, IAuditTrail } from './audit-trail.port.js';

@Injectable()
export class PrismaAuditTrail implements IAuditTrail {
  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry, context?: PersistenceContext): Promise<void> {
    // The only place the opaque context is opened. With one, the row joins the
    // caller's transaction and rolls back with it; without one, it is written
    // on its own.
    const client = context ? asPrismaTransaction(context) : this.prisma;

    await client.auditLog.create({
      data: {
        actorKind: entry.actorKind,
        actorUserId: entry.actorUserId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        storeId: entry.storeId,
        payload: entry.payload,
        requestId: entry.requestId,
      },
    });
  }
}
