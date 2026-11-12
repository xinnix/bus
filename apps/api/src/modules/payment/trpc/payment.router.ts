import { z } from 'zod';
import { protectedProcedure, router } from '../../../trpc/trpc';

/**
 * Payment tRPC Router
 *
 * Admin 端使用，查询微信支付相关状态。
 * 实际支付创建和回调通过 REST API 处理（小程序使用）。
 */
export const paymentRouter = router({
  /**
   * 查询微信支付订单状态
   */
  queryPayment: protectedProcedure
    .input(z.object({ orderNo: z.string() }))
    .query(async ({ input }) => {
      // 业务方在此实现支付状态查询逻辑
      return {
        orderNo: input.orderNo,
        message: 'Payment query endpoint — implement your business logic here',
      };
    }),
});
