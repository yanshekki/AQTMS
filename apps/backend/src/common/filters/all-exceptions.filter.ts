import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { BaseError } from '../errors/base.error';
import * as Sentry from '@sentry/nestjs';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<any>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorResponse: any = {
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (exception instanceof BaseError) {
      // 處理我們的自定義錯誤
      status = exception.statusCode;
      errorResponse = {
        success: false,
        message: exception.message,
        code: exception.code,
        timestamp: exception.timestamp.toISOString(),
        path: request.url,
      };
    } else if (exception instanceof HttpException) {
      // 處理 NestJS 內建的 HttpException
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      errorResponse = {
        success: false,
        message:
          typeof exceptionResponse === 'string'
            ? exceptionResponse
            : (exceptionResponse as any).message || 'Request failed',
        code: `HTTP_${status}`,
        timestamp: new Date().toISOString(),
        path: request.url,
        ...(typeof exceptionResponse === 'object' ? exceptionResponse : {}),
      };
    } else if (exception instanceof Error) {
      // 處理普通 Error
      errorResponse.message = exception.message;
      errorResponse.code = 'UNHANDLED_ERROR';
    }

    // Sentry 錯誤追蹤整合（只對嚴重錯誤上報）
    if (process.env.SENTRY_DSN) {
      if (exception instanceof Error) {
        Sentry.captureException(exception, {
          tags: {
            statusCode: status,
            path: request.url,
            method: request.method,
          },
          extra: {
            requestBody: request.body,
            query: request.query,
            user: request.user || null,
          },
        });
      }
    }

    response.status(status).json(errorResponse);
  }
}
