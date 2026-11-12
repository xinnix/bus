import { BusinessException } from './business.exception';

export class ValidationException extends BusinessException {
  constructor(message: string, details?: Record<string, any>) {
    super({
      message,
      errorCode: 'ERR_VALIDATION',
      statusCode: 422,
      details,
    });
  }
}
