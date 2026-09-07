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

/** Stable codes for the statuses the platform returns (ERROR_MODEL). */
const STATUS_CODES: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHENTICATED',
  [HttpStatus.FORBIDDEN]: 'OWNERSHIP_DENIED',
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
          code: STATUS_CODES[status] ?? 'HTTP_ERROR',
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
