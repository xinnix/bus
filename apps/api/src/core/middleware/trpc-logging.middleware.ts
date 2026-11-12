import { BusinessException } from '../exceptions';

/**
 * Create a tRPC logging middleware that logs each procedure call.
 */
export const createTrpcLoggingMiddleware = (logger: any) => {
  return async ({ ctx, next, path, type }: any) => {
    const start = Date.now();
    const requestId = ctx.requestId;

    logger.info({
      msg: 'tRPC request started',
      requestId,
      path,
      type,
    });

    try {
      const result = await next();
      const duration = Date.now() - start;

      logger.info({
        msg: 'tRPC request completed',
        requestId,
        path,
        type,
        duration,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - start;
      const errorCode = error instanceof BusinessException ? error.errorCode : null;

      logger.error({
        msg: 'tRPC request failed',
        requestId,
        path,
        type,
        duration,
        errorCode,
        err: error,
      });

      throw error;
    }
  };
};
