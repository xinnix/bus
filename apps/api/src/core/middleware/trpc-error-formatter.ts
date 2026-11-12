import { TRPCError } from '@trpc/server';
import { BusinessException } from '../exceptions/business.exception';

const HTTP_TO_TRPC: Record<number, TRPCError['code']> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE_CONTENT',
  429: 'TOO_MANY_REQUESTS',
  500: 'INTERNAL_SERVER_ERROR',
};

export function businessExceptionToTRPCError(error: unknown): TRPCError | null {
  if (error instanceof BusinessException) {
    return new TRPCError({
      code: HTTP_TO_TRPC[error.getStatus()] ?? 'BAD_REQUEST',
      message: error.message,
      cause: error,
    });
  }
  return null;
}
