import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  LoggerService,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import e, { Request } from 'express';
import { UserPayload } from '@fylr/types';
import { OtelLoggerService } from '../logger';
import { trace, SpanStatusCode } from '@opentelemetry/api';

interface RequestWithUser extends Request {
  user?: UserPayload;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly logger: LoggerService,
  ) {
    if (logger instanceof OtelLoggerService) {
      logger.setContext(AllExceptionsFilter.name);
    }
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<RequestWithUser>();

    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Record exception on active span for better observability
    const span = trace.getActiveSpan();
    if (span) {
      span.recordException(
        exception instanceof Error ? exception : new Error(String(exception)),
      );
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message:
          exception instanceof Error ? exception.message : String(exception),
      });
    }

    if (
      exception instanceof HttpException &&
      httpStatus === HttpStatus.UNAUTHORIZED
    ) {
      this.logger.warn(
        `[${request.method}] ${request.url} - Status: ${httpStatus} (Unauthorized)`,
      );
    } else if (
      exception instanceof HttpException &&
      httpStatus === HttpStatus.FORBIDDEN
    ) {
      this.logger.warn(
        `[${request.method}] ${request.url} - Status: ${httpStatus} (Forbidden)`,
      );
    } else {
      this.logger.error(
        `[${request.method}] ${request.url} - Status: ${httpStatus}`,
        exception instanceof Error ? exception.stack : exception,
        'ExceptionFilter',
      );
    }

    const responseBody = {
      statusCode: httpStatus,
      timestamp: new Date().toISOString(),
      path: httpAdapter.getRequestUrl(request),
      method: httpAdapter.getRequestMethod(request),
      message:
        exception instanceof HttpException
          ? exception.getResponse()
          : 'Internal server error',
    };

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }
}
