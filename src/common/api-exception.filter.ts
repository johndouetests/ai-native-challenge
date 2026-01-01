import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { ApiException, ErrorBody, ErrorCode } from './api.exception';

const CODE_BY_STATUS: Record<number, ErrorCode> = {
  400: 'invalid_body',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not_found',
};

/**
 * Converts every error (domain errors, framework errors, unknown routes, unexpected
 * exceptions) into `{ error: { code, message, details? } }`. Stacks never leave the process.
 */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ApiExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const reply = host.switchToHttp().getResponse<FastifyReply>();
    const { status, body } = this.toResponse(exception);
    if (status >= 500) {
      this.logger.error(exception instanceof Error ? exception : String(exception));
    }
    void reply.status(status).send(body);
  }

  private toResponse(exception: unknown): { status: number; body: ErrorBody } {
    if (exception instanceof ApiException) {
      return { status: exception.status, body: exception.toBody() };
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      if (status === 404) {
        return { status, body: { error: { code: 'not_found', message: 'Route not found' } } };
      }
      if (status < 500) {
        return {
          status,
          body: { error: { code: CODE_BY_STATUS[status] ?? 'invalid_body', message: exception.message } },
        };
      }
    }
    const frameworkStatus = this.frameworkClientErrorStatus(exception);
    if (frameworkStatus !== undefined) {
      return {
        status: frameworkStatus,
        body: {
          error: {
            code: CODE_BY_STATUS[frameworkStatus] ?? 'invalid_body',
            message: (exception as Error).message,
          },
        },
      };
    }
    return {
      status: 500,
      body: { error: { code: 'internal_error', message: 'Internal server error' } },
    };
  }

  /** Fastify reports body parser errors (invalid JSON, wrong content type) with a 4xx statusCode. */
  private frameworkClientErrorStatus(exception: unknown): number | undefined {
    if (!(exception instanceof Error)) return undefined;
    const status = (exception as Error & { statusCode?: unknown }).statusCode;
    if (typeof status === 'number' && status >= 400 && status < 500) return status;
    return undefined;
  }
}
