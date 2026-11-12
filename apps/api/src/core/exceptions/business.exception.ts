import { HttpException, HttpStatus } from '@nestjs/common';

export interface BusinessExceptionOptions {
  message: string;
  errorCode: string;
  statusCode?: number;
  details?: Record<string, any>;
}

export class BusinessException extends HttpException {
  public readonly errorCode: string;
  public readonly details: Record<string, any>;

  constructor(opts: BusinessExceptionOptions) {
    super(
      { message: opts.message, errorCode: opts.errorCode, details: opts.details },
      opts.statusCode ?? HttpStatus.BAD_REQUEST,
    );
    this.errorCode = opts.errorCode;
    this.details = opts.details ?? {};
  }
}
