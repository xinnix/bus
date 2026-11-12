import { BusinessException } from './business.exception';

export class NotFoundBusinessException extends BusinessException {
  constructor(resource: string, id?: string, errorCode?: string) {
    super({
      message: id ? `${resource} with id "${id}" not found` : `${resource} not found`,
      errorCode: errorCode ?? `ERR_${resource.toUpperCase()}_NOT_FOUND`,
      statusCode: 404,
      details: { resource, id },
    });
  }
}
