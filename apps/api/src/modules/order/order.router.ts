import { z } from 'zod';
import { Permission } from '@sanqin/shared';
import { permissionProcedure } from '../../trpc/trpc';
import { createCrudRouterWithCustom } from '../../trpc/trpc.helper';
import { getRefundService } from '../refund/refund.bridge';
import { OrderService } from './order.service';

/**
 * 管理端订单 Router
 * 资源名：order
 * P0.5 新增：整单退款 / 改签 / 退款重试与对账 / 退款与改签流水查询。
 */
export const orderRouter = createCrudRouterWithCustom(
  'order',
  {},
  () => ({
    // 整单退款（已支付订单取消）：未核销票全额退（手续费 0）；CLOSED+已支付订单全额退支付金额
    refund: permissionProcedure(Permission.order.refund)
      .input(
        z.object({
          orderId: z.string().min(1),
          reason: z.string().max(200).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        return getRefundService().adminRefundOrder({
          orderId: input.orderId,
          reason: input.reason || '客服整单退款',
          operatorId: ctx.user.id,
        });
      }),

    // 整单改签：全部未使用票改到同线路新班次（仅一次，差价自动原路退回）
    change: permissionProcedure(Permission.order.change)
      .input(
        z.object({
          orderId: z.string().min(1),
          newTripId: z.string().min(1),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        if (!ctx.app) throw new Error('Nest 应用实例尚未注入');
        const orderService = ctx.app.get(OrderService);
        return orderService.changeTrip(
          { orderId: input.orderId, newTripId: input.newTripId },
          { operatorType: 'ADMIN', operatorId: ctx.user.id },
        );
      }),

    // 退款重试（FAILED 单同 refundNo 重调微信，out_refund_no 幂等）
    retryRefund: permissionProcedure(Permission.order.refund)
      .input(z.object({ refundId: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        return getRefundService().retry(input.refundId, ctx.user.id);
      }),

    // 退款对账：主动查微信侧退款状态并落地
    reconcileRefund: permissionProcedure(Permission.order.refund)
      .input(z.object({ refundId: z.string().min(1) }))
      .mutation(async ({ input }) => {
        return getRefundService().reconcile(input.refundId);
      }),

    // 订单退款流水
    refunds: permissionProcedure(Permission.order.read)
      .input(z.object({ orderId: z.string().min(1) }))
      .query(async ({ input }) => {
        return getRefundService().listByOrder(input.orderId);
      }),

    // 订单改签记录
    changes: permissionProcedure(Permission.order.read)
      .input(z.object({ orderId: z.string().min(1) }))
      .query(async ({ ctx, input }) => {
        return ctx.prisma.orderChange.findMany({
          where: { orderId: input.orderId },
          orderBy: { createdAt: 'desc' },
          include: {
            oldTrip: { select: { serviceDate: true, departureTime: true, priceCents: true } },
            newTrip: { select: { serviceDate: true, departureTime: true, priceCents: true } },
          },
        });
      }),
  }),
  {
    includeCreate: false,
    includeUpdate: false,
    includeDelete: false,
    includeDeleteMany: false,
    searchFields: ['orderNo', 'contactPhone', 'contactName'],
    filterableFields: ['orderStatus', 'payStatus', 'tripId', 'lineId'],
    permissionRead: Permission.order.read,
  },
);
