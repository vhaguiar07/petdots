import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ZodValidationException } from 'nestjs-zod';
import { z } from 'zod';

interface ErrorDetail {
  field: string;
  message: string;
}

interface ErrorBody {
  error: {
    code: string;
    message: string;
    details: ErrorDetail[];
    requestId: string;
  };
}

/**
 * Fallback codes, by status, for failures with nothing more specific to say
 * (ERROR_MODEL). A handler that knows the exact condition passes its own `code`
 * in the exception body — see `resolveCode`.
 */
const STATUS_CODES: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHENTICATED',
  // Neutral on purpose: the specific code for store scope is
  // `STORE_SCOPE_DENIED` (ERROR_MODEL v1.1), and the generic one should not
  // name a rule. `OWNERSHIP_DENIED` was a leftover from the v1.0 product.
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'VALIDATION_FAILED',
  [HttpStatus.SERVICE_UNAVAILABLE]: 'SERVICE_UNAVAILABLE',
};

/**
 * Turns every exception into the single error envelope of ERROR_MODEL.
 *
 * Catching everything is deliberate: a client that can parse one failure can
 * parse all of them. Unexpected errors are logged in full and answered with a
 * generic 500 — stack traces never reach the response body (SECURITY).
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const requestId = resolveRequestId(request);

    if (exception instanceof ZodValidationException) {
      response.status(HttpStatus.UNPROCESSABLE_ENTITY).json(
        buildBody({
          code: 'VALIDATION_FAILED',
          message: 'Falha de validação.',
          details: toDetails(exception.getZodError()),
          requestId,
        }),
      );
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();

      response.status(status).json(
        buildBody({
          code: resolveCode(exception, status),
          message: extractMessage(exception),
          details: [],
          requestId,
        }),
      );
      return;
    }

    this.logger.error(
      `Unhandled exception on ${request.method} ${request.url} (requestId=${requestId})`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
      buildBody({
        code: 'INTERNAL_ERROR',
        message: 'Erro interno.',
        details: [],
        requestId,
      }),
    );
  }
}

function buildBody(error: ErrorBody['error']): ErrorBody {
  return { error };
}

/**
 * A handler that knows exactly which rule failed says so by throwing with a
 * `code` in the body — `WAITLIST_ENTRY_ALREADY_EXISTS` rather than the generic
 * `CONFLICT`. Without this the status would be the only thing a client could
 * program against, and one status serves many conditions (ERROR_MODEL).
 */
function resolveCode(exception: HttpException, status: number): string {
  const response: unknown = exception.getResponse();

  if (typeof response === 'object' && response !== null && 'code' in response) {
    const { code } = response;

    if (typeof code === 'string' && code) {
      return code;
    }
  }

  return STATUS_CODES[status] ?? 'HTTP_ERROR';
}

/**
 * `getZodError()` is typed as `unknown` because nestjs-zod supports both Zod 3
 * and Zod 4; narrowing against our own Zod keeps the mapping honest instead of
 * casting blindly.
 */
function toDetails(error: unknown): ErrorDetail[] {
  if (!(error instanceof z.ZodError)) {
    return [];
  }

  return error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));
}

function resolveRequestId(request: Request): string {
  const id: unknown = (request as { id?: unknown }).id;
  return typeof id === 'string' || typeof id === 'number' ? String(id) : '';
}

function extractMessage(exception: HttpException): string {
  const response: unknown = exception.getResponse();

  if (typeof response === 'string') {
    return response;
  }

  if (typeof response === 'object' && response !== null && 'message' in response) {
    const { message } = response;

    if (typeof message === 'string') {
      return message;
    }

    if (Array.isArray(message)) {
      return message.map(String).join('; ');
    }
  }

  return exception.message;
}
