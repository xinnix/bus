import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { BusinessException } from '../exceptions';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const isProduction = process.env.NODE_ENV === 'production';

    const requestId = (request.headers['x-request-id'] as string) || randomUUID();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException ? exception.getResponse() : 'Internal server error';

    // Extract errorCode from BusinessException
    const errorCode = exception instanceof BusinessException ? exception.errorCode : null;

    // Always log full error with requestId for debugging
    this.logger.error(
      `[${requestId}] ${request.method} ${request.url} ${status}${errorCode ? ` (${errorCode})` : ''}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    if (isProduction) {
      // Production: sanitize response, no internal details
      const safeMessage =
        status === 500
          ? 'Internal server error'
          : typeof message === 'string'
            ? message
            : (message as any).message || 'Error';

      response.status(status).json({
        statusCode: status,
        requestId,
        errorCode,
        timestamp: new Date().toISOString(),
        path: request.url,
        message: safeMessage,
      });
    } else {
      // Development: full details for debugging
      response.status(status).json({
        statusCode: status,
        requestId,
        errorCode,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        message:
          typeof message === 'string'
            ? message
            : (message as any).message || 'Internal server error',
        ...(exception instanceof Error && { stack: exception.stack }),
      });
    }
  }
}
