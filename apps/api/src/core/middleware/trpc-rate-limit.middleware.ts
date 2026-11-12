import { TRPCError } from '@trpc/server';

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function createRateLimiter(options: { limit: number; ttlMs: number }) {
  return async ({ ctx, next }: any) => {
    const ip = ctx.req?.headers?.['x-forwarded-for'] || ctx.req?.socket?.remoteAddress || 'unknown';
    const key = `${ip}:${options.limit}:${options.ttlMs}`;
    const now = Date.now();

    let entry = rateLimitStore.get(key);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + options.ttlMs };
    }

    entry.count++;
    rateLimitStore.set(key, entry);

    if (entry.count > options.limit) {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests, please try again later',
      });
    }

    return next();
  };
}

export const authRateLimit = createRateLimiter({
  limit: Number(process.env.RATE_LIMIT_AUTH) || 5,
  ttlMs: Number(process.env.RATE_LIMIT_TTL_MS) || 60000,
});
