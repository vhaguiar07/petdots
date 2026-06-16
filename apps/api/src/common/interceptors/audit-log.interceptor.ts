import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { AUDIT_LOG_KEY, AuditLogMetadata } from '../decorators/audit-log.decorator';
import { AuditLogService } from '../../modules/audit-log/audit-log.service';
import { AuthenticatedUser } from '../../modules/auth/types/authenticated-user';

/**
 * Records who/when/what for routes annotated with @AuditLog(). The entity id is
 * read from the response body's `id` field, falling back to the `:id` route param
 * (covers DELETE, where the response usually has no body).
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditLogService: AuditLogService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const metadata = this.reflector.getAllAndOverride<AuditLogMetadata | undefined>(
      AUDIT_LOG_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!metadata) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = request.user;

    return next.handle().pipe(
      tap((response) => {
        const entityId = response?.id ?? request.params?.id ?? null;
        void this.auditLogService.record({
          userId: user?.id,
          action: metadata.action,
          entity: metadata.entity,
          entityId,
          newValue: response ?? request.body,
          ip: request.ip,
          userAgent: request.headers?.['user-agent'],
        });
      }),
    );
  }
}
