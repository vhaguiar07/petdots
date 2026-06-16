import { SetMetadata } from '@nestjs/common';

export const AUDIT_LOG_KEY = 'auditLog';

export interface AuditLogMetadata {
  /** Entity name as stored in the audit_logs table, e.g. "Product". */
  entity: string;
  /** Action label, e.g. "CREATE", "UPDATE", "DELETE". */
  action: string;
}

/** Marks a route handler so AuditLogInterceptor records who/when/what changed. */
export const AuditLog = (metadata: AuditLogMetadata) => SetMetadata(AUDIT_LOG_KEY, metadata);
