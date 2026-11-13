import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建或复用待支付记录。
   */
  async getOrCreatePendingPayment(order: {
    id: string;
    orderNo: string;
    totalAmountCents: number;
    payStatus: string;
  }) {
    const existing = await this.prisma.payment.findUnique({ where: { orderId: order.id } });
    if (existing && existing.status === 'PENDING') return existing;
    if (existing && existing.status === 'PAID') return existing;

    const paymentNo = `PAY${Date.now()}${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0')}`;

    return this.prisma.payment.upsert({
      where: { orderId: order.id },
      create: {
        paymentNo,
        orderId: order.id,
        outTradeNo: order.orderNo,
        amountCents: order.totalAmountCents,
        status: 'PENDING',
      },
      update: {
        paymentNo,
        outTradeNo: order.orderNo,
        amountCents: order.totalAmountCents,
        status: 'PENDING',
      },
    });
  }

  /**
   * 开发环境模拟支付成功（仅 NODE_ENV !== production 可用）。
   */
  async mockPaymentSuccess(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error('订单不存在');
    return this.handlePaymentSuccess({
      orderId,
      orderNo: order.orderNo,
      transactionId: `MOCK_${Date.now()}_${orderId.slice(-6)}`,
      amount: order.totalAmountCents,
      paidAt: new Date(),
    });
  }

  /**
   * 支付成功回调的业务处理：幂等更新 payment + order。
   * 注意：回调只携带 attach=orderId 与微信 transactionId，金额由调用方校验。
   */
  async handlePaymentSuccess(payload: {
    orderId: string;
    orderNo: string;
    transactionId: string;
    amount: number;
    paidAt: Date;
    rawNotify?: unknown;
  }) {
    const order = await this.prisma.order.findUnique({ where: { id: payload.orderId } });
    if (!order) {
      this.logger.error(`支付回调订单不存在: ${payload.orderId}`);
      return { handled: false, reason: 'order_not_found' };
    }

    // 幂等：同一 transactionId 已处理直接返回
    const existingByTx = await this.prisma.payment.findUnique({
      where: { transactionId: payload.transactionId },
    });
    if (existingByTx && existingByTx.status === 'PAID') {
      return { handled: true, idempotent: true };
    }

    if (order.totalAmountCents !== payload.amount) {
      this.logger.error(
        `支付金额不匹配 order=${order.id} expected=${order.totalAmountCents} actual=${payload.amount}`,
      );
      return { handled: false, reason: 'amount_mismatch' };
    }

    let orderUpdated = 0;
    await this.prisma.$transaction(async (tx) => {
      const paymentNo = `PAY${Date.now()}${Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, '0')}`;
      await tx.payment.upsert({
        where: { orderId: order.id },
        create: {
          paymentNo,
          orderId: order.id,
          outTradeNo: order.orderNo,
          transactionId: payload.transactionId,
          status: 'PAID',
          paidAt: payload.paidAt,
          amountCents: payload.amount,
          rawNotify: payload.rawNotify === undefined ? undefined : (payload.rawNotify as any),
        },
        update: {
          status: 'PAID',
          transactionId: payload.transactionId,
          paidAt: payload.paidAt,
          amountCents: payload.amount,
          rawNotify: payload.rawNotify === undefined ? undefined : (payload.rawNotify as any),
        },
      });
      const updated = await tx.order.updateMany({
        where: { id: order.id, orderStatus: 'PENDING_PAYMENT' },
        data: {
          payStatus: 'PAID',
          orderStatus: 'PAID',
          paidAt: payload.paidAt,
        },
      });
      orderUpdated = updated.count;
    });

    // 竞态兜底：回调到达前订单刚被超时任务关闭。钱已收、票已取消，
    // 记录支付流水留痕（不重开订单），交由人工/退款流程（P0.5）处理。
    if (orderUpdated === 0 && order.orderStatus === 'CLOSED') {
      this.logger.error(
        `支付成功但订单已关闭（超时竞态） order=${order.id} tx=${payload.transactionId} amount=${payload.amount}，需退款处理`,
      );
      return { handled: true, orderClosed: true };
    }

    return { handled: true, idempotent: false };
  }
}
