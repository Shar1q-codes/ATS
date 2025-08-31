import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    path: string;
    requestId?: string;
  };
  retryable: boolean;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string;
    let code: string;
    let details: any;
    let retryable = false;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        code = this.getErrorCodeFromStatus(status);
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || exception.message;
        code =
          responseObj.error ||
          responseObj.code ||
          this.getErrorCodeFromStatus(status);
        details = responseObj.details;
      } else {
        message = exception.message;
        code = this.getErrorCodeFromStatus(status);
      }
    } else if (exception instanceof QueryFailedError) {
      status = HttpStatus.BAD_REQUEST;
      code = 'DATABASE_ERROR';
      message = this.getDatabaseErrorMessage(exception);
      details =
        process.env.NODE_ENV === 'development'
          ? {
              query: exception.query,
              parameters: exception.parameters,
            }
          : undefined;
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      code = 'INTERNAL_SERVER_ERROR';
      details =
        process.env.NODE_ENV === 'development'
          ? {
              originalMessage: exception.message,
              stack: exception.stack,
            }
          : undefined;
      retryable = true;
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Unknown error occurred';
      code = 'UNKNOWN_ERROR';
      retryable = true;
    }

    // Determine if error is retryable
    if (!retryable) {
      retryable = this.isRetryableError(status, code);
    }

    const errorResponse: ApiErrorResponse = {
      success: false,
      error: {
        code,
        message,
        details,
        timestamp: new Date().toISOString(),
        path: request.url,
        requestId: request.headers['x-request-id'] as string,
      },
      retryable,
    };

    // Log the error with appropriate level
    this.logError(exception, request, status, code);

    response.status(status).json(errorResponse);
  }

  private getErrorCodeFromStatus(status: number): string {
    const statusCodes: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      413: 'PAYLOAD_TOO_LARGE',
      415: 'UNSUPPORTED_MEDIA_TYPE',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
      504: 'GATEWAY_TIMEOUT',
    };
    return statusCodes[status] || 'UNKNOWN_ERROR';
  }

  private getDatabaseErrorMessage(error: QueryFailedError): string {
    const message = error.message.toLowerCase();

    if (message.includes('duplicate') || message.includes('unique')) {
      if (message.includes('email')) {
        return 'An account with this email already exists';
      }
      return 'This record already exists';
    }

    if (message.includes('foreign key') || message.includes('constraint')) {
      return 'Invalid reference to related data';
    }

    if (message.includes('not null')) {
      return 'Required field is missing';
    }

    return 'Database operation failed';
  }

  private isRetryableError(status: number, code: string): boolean {
    // Server errors are generally retryable
    if (status >= 500) return true;

    // Specific client errors that are retryable
    const retryableClientErrors = [408, 429]; // Timeout, Rate limit
    if (retryableClientErrors.includes(status)) return true;

    // Specific error codes that are retryable
    const retryableCodes = ['TIMEOUT_ERROR', 'RATE_LIMIT_EXCEEDED'];
    if (retryableCodes.includes(code)) return true;

    return false;
  }

  private logError(
    exception: unknown,
    request: Request,
    status: number,
    code: string,
  ): void {
    const logContext = {
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
      requestId: request.headers['x-request-id'],
      userId: (request as any).user?.id,
      organizationId: (request as any).user?.organizationId,
    };

    const errorMessage = `${request.method} ${request.url} - ${status} - ${code}`;

    if (status >= 500) {
      this.logger.error(
        errorMessage,
        exception instanceof Error ? exception.stack : exception,
        JSON.stringify(logContext),
      );
    } else if (status >= 400) {
      this.logger.warn(errorMessage, JSON.stringify(logContext));
    } else {
      this.logger.log(errorMessage, JSON.stringify(logContext));
    }
  }
}
