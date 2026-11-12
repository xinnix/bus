import { BusinessException } from './business.exception';

export class ForbiddenBusinessException extends BusinessException {
  constructor(message: string, errorCode?: string, details?: Record<string, any>) {
    super({
      message,
      errorCode: errorCode ?? 'ERR_FORBIDDEN',
      statusCode: 403,
      details,
    });
  }
}
