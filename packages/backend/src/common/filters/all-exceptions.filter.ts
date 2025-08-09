import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Request } from 'express';
import { UserPayload } from '@fylr/types';

interface RequestWithUser extends Request {
  user?: UserPayload;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<RequestWithUser>();

    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    this.logger.error(
      `[${request.method}] ${request.url} - Status: ${httpStatus}`,
      exception instanceof Error ? exception.stack : exception,
      'ExceptionFilter',
    );

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
