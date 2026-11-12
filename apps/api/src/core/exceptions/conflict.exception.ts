import { BusinessException } from './business.exception';

export class ConflictException extends BusinessException {
  constructor(message: string, errorCode?: string, details?: Record<string, any>) {
    super({
      message,
      errorCode: errorCode ?? 'ERR_CONFLICT',
      statusCode: 409,
      details,
    });
  }
}
