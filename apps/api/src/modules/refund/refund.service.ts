import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { randomInt } from 'crypto';
import { Prisma } from '@sanqin/database';
import {
  computeRefundFee,
  getRefundTier,
  REFUND_FEE_RATE,
  REFUND_STOP_MINUTES,
} from '@sanqin/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { WechatPayService } from '../payment/services/wechat-pay.service';

export interface RefundOperator {
  operatorType: 'USER' | 'ADMIN' | 'SYSTEM';
  operatorId?: string | null;
}

interface RefundOrderRow {
  id: string;
  orderNo: string;
  orderStatus: string;
  payStatus: string;
  totalAmountCents: number;
  tripId: string;
  trip: { serviceDate: string; departureTime: string };
  tickets: {
    id: string;
    ticketNo: string;
    passengerName: string;
    priceCents: number;
    status: string;
    changedAt: Date | null;
  }[];
  payment: { amountCents: number; status: string } | null;
}

/**
 * 退款服务：报价 → 冻结票 → 微信退款 → 回调/对账落地。
 *
 * 状态约定（对齐主方案 §6.4）：
 * - Ticket.status：UNUSED → REFUNDING（退款中，冻结不可核销/不可再退）→ REFUNDED / 失败回 UNUSED
 * - Order.payStatus：PAID → REFUNDING → REFUNDED / PARTIAL_REFUND（金额口径）
 * - Order.orderStatus：PAID → REFUNDED / PARTIALLY_REFUNDED（票口径：有票真正退掉才算部分退款；
 *   改签差价退款不改订单业务态）；CLOSED 订单退款后保持 CLOSED
 */
@Injectable()
export class RefundService {
  private readonly logger = new Logger(RefundService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly wechatPayService: WechatPayService,
  ) {}

  private generateRefundNo(): string {
    const now = new Date();
    const ts =
      now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0');
    return `RF${ts}${String(randomInt(0, 1000000)).padStart(6, '0')}`;
  }

  private async loadOrder(orderId: string, userId?: string | null): Promise<RefundOrderRow> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        trip: { select: { serviceDate: true, departureTime: true } },
        tickets: {
          select: {
            id: true,
            ticketNo: true,
            passengerName: true,
            priceCents: true,
            status: true,
            changedAt: true,
          },
        },
        payment: { select: { amountCents: true, status: true } },
      },
    });
    if (!order || (userId && order.userId !== userId)) throw new NotFoundException('订单不存在');
    return order as RefundOrderRow;
  }

  // ====================
  // 报价
  // ====================

  /** 退款报价：校验可退状态 + 按发车时刻计算手续费档位 */
  async quote(input: { orderId: string; ticketIds: string[]; userId?: string | null }) {
    const { order, tickets, tier, totalCents } = await this.loadQuote(input);
    const { feeCents, refundCents } = computeRefundFee(totalCents, tier);
    return {
      tier,
      ticketCount: tickets.length,
      totalCents,
      feeCents,
      refundCents,
      rule: this.describeRule(tier),
      tickets: tickets.map((t) => ({
        id: t.id,
        ticketNo: t.ticketNo,
        passengerName: t.passengerName,
        priceCents: t.priceCents,
      })),
      trip: order.trip,
    };
  }

  private describeRule(tier: 'FREE' | 'FEE' | 'BLOCKED'): string {
    if (tier === 'FREE') return '发车前 24 小时以上，免手续费';
    if (tier === 'FEE')
      return `发车前 2–24 小时，收取 ${Math.round(REFUND_FEE_RATE * 100)}% 手续费`;
    return `发车前 ${Math.round(REFUND_STOP_MINUTES / 60)} 小时内不可退票`;
  }

  private async loadQuote(input: { orderId: string; ticketIds: string[]; userId?: string | null }) {
    const order = await this.loadOrder(input.orderId, input.userId);
    if (order.orderStatus === 'CLOSED') throw new BadRequestException('订单已关闭，请联系客服处理');
    if (!['PAID', 'REFUNDING', 'PARTIALLY_REFUNDED'].includes(order.orderStatus)) {
      throw new BadRequestException('订单当前不可退款');
    }
    if (order.payment?.status !== 'PAID') throw new BadRequestException('订单未完成支付');

    const tickets = order.tickets.filter((t) => input.ticketIds.includes(t.id));
    if (tickets.length !== input.ticketIds.length)
      throw new BadRequestException('所选车票不属于该订单');
    const bad = tickets.find((t) => t.status !== 'UNUSED' || t.changedAt);
    if (bad) {
      throw new BadRequestException(
        bad.changedAt
          ? `车票 ${bad.ticketNo} 为改签票，不可退款`
          : `车票 ${bad.ticketNo} 当前不可退（已核销/退款中/已退款）`,
      );
    }

    const tier = getRefundTier(order.trip.serviceDate, order.trip.departureTime);
    if (tier === 'BLOCKED') {
      throw new BadRequestException(
        `发车前 ${Math.round(REFUND_STOP_MINUTES / 60)} 小时内不可退票，如遇特殊情况请联系客服`,
      );
    }
    const totalCents = tickets.reduce((sum, t) => sum + t.priceCents, 0);
    return { order, tickets, tier, totalCents };
  }

  // ====================
  // 按票退款（乘客自助 / 管理端按票退）
  // ====================

  /** 发起按票退款：事务冻结票 + 建退款单，事务外调微信网关 */
  async request(input: {
    orderId: string;
    ticketIds: string[];
    reason?: string;
    userId?: string | null;
    operatorId?: string | null;
    operatorType: RefundOperator['operatorType'];
  }) {
    const { order, tickets, tier, totalCents } = await this.loadQuote(input);
    const { feeCents, refundCents } = computeRefundFee(totalCents, tier);
    const refundNo = this.generateRefundNo();

    await this.prisma.$transaction(async (tx) => {
      const frozen = await tx.ticket.updateMany({
        where: { id: { in: input.ticketIds }, orderId: order.id, status: 'UNUSED' },
        data: { status: 'REFUNDING' },
      });
      if (frozen.count !== input.ticketIds.length) {
        throw new BadRequestException('车票状态已变化，请刷新后重试');
      }
      await tx.refund.create({
        data: {
          refundNo,
          orderId: order.id,
          ticketIds: input.ticketIds,
          ticketCount: tickets.length,
          amountCents: refundCents,
          feeCents,
          reason: input.reason || null,
          status: 'PROCESSING',
          operatorId: input.operatorId ?? null,
          operatorType: input.operatorType,
        },
      });
      await tx.order.updateMany({
        where: {
          id: order.id,
          payStatus: 'PAID',
          orderStatus: { in: ['PAID', 'PARTIALLY_REFUNDED'] },
        },
        data: { payStatus: 'REFUNDING', orderStatus: 'REFUNDING' },
      });
    });

    this.logger.log(
      `退款单创建: ${refundNo} order=${order.id} tickets=${tickets.length} refund=${refundCents}分 fee=${feeCents}分 tier=${tier}`,
    );
    await this.callGateway(order.orderNo, refundNo, refundCents, input.reason || '乘客申请退票');

    const created = await this.prisma.refund.findUnique({ where: { refundNo } });
    return created;
  }

  /**
   * 事务外调用微信退款网关。
   * 调用失败（网络/4xx，资金未发出）→ 退款单 FAILED + 票回 UNUSED（可重试/重退）。
   */
  private async callGateway(
    orderNo: string,
    refundNo: string,
    refundCents: number,
    reason: string,
  ) {
    const refund = await this.prisma.refund.findUnique({
      where: { refundNo },
      include: { order: { select: { totalAmountCents: true } } },
    });
    if (!refund) throw new NotFoundException('退款单不存在');

    try {
      const gatewayRefundNo = await this.wechatPayService.refund({
        orderNo,
        refundNo,
        totalAmount: refund.order.totalAmountCents / 100,
        refundAmount: refundCents / 100,
        reason,
      });
      await this.prisma.refund.update({ where: { refundNo }, data: { gatewayRefundNo } });
    } catch (error: any) {
      const message = error?.message || '退款请求失败';
      this.logger.error(`退款网关调用失败 refundNo=${refundNo}: ${message}`);
      await this.prisma.$transaction(async (tx) => {
        await tx.refund.update({
          where: { refundNo },
          data: { status: 'FAILED', failReason: message },
        });
        // 票回 UNUSED：网关失败资金未动；CLOSED 订单票为 CANCELLED 不受影响
        await tx.ticket.updateMany({
          where: { id: { in: refund.ticketIds as string[] }, status: 'REFUNDING' },
          data: { status: 'UNUSED' },
        });
        await this.rollbackOrderIfIdle(tx, refund.orderId);
      });
      throw new BadRequestException(`退款请求失败：${message}`);
    }
  }

  /** 无进行中退款单时，将 REFUNDING 中间态回滚为 PAID */
  private async rollbackOrderIfIdle(tx: Prisma.TransactionClient, orderId: string) {
    const inflight = await tx.refund.count({ where: { orderId, status: 'PROCESSING' } });
    if (inflight === 0) {
      await tx.order.updateMany({
        where: { id: orderId, payStatus: 'REFUNDING', orderStatus: 'REFUNDING' },
        data: { payStatus: 'PAID', orderStatus: 'PAID' },
      });
    }
  }

  // ====================
  // 管理端整单退款（已支付订单取消 / 关闭订单的异常处理）
  // ====================

  /**
   * 管理端整单全额退款（手续费 0）：
   * - PAID/PARTIALLY_REFUNDED 订单：退全部未核销票
   * - CLOSED 且已支付订单（超时竞态等）：全额退支付金额，票不动
   */
  async adminRefundOrder(input: { orderId: string; reason: string; operatorId: string }) {
    const order = await this.loadOrder(input.orderId);

    if (order.orderStatus === 'CLOSED') {
      if (order.payment?.status !== 'PAID')
        throw new BadRequestException('订单未完成支付，无需退款');
      const refunded = await this.sumSuccessRefunds(input.orderId);
      const amountCents = order.payment.amountCents - refunded;
      if (amountCents <= 0) throw new BadRequestException('订单退款已完成');
      return this.createAndCall({
        orderId: order.id,
        orderNo: order.orderNo,
        amountCents,
        feeCents: 0,
        ticketIds: order.tickets.map((t) => t.id),
        reason: input.reason || '客服整单退款（订单已关闭）',
        operatorId: input.operatorId,
        operatorType: 'ADMIN',
      });
    }

    if (!['PAID', 'REFUNDING', 'PARTIALLY_REFUNDED'].includes(order.orderStatus)) {
      throw new BadRequestException('订单当前不可退款');
    }
    const refundable = order.tickets.filter((t) => t.status === 'UNUSED' && !t.changedAt);
    if (refundable.length === 0) {
      throw new BadRequestException(
        order.tickets.some((t) => t.changedAt)
          ? '订单车票均为改签票（改签后不可退），如需处理请联系财务线下退款'
          : '订单没有可退的车票（已全部核销或退款）',
      );
    }

    const totalCents = refundable.reduce((sum, t) => sum + t.priceCents, 0);
    const refundNo = this.generateRefundNo();
    await this.prisma.$transaction(async (tx) => {
      const frozen = await tx.ticket.updateMany({
        where: { id: { in: refundable.map((t) => t.id) }, status: 'UNUSED' },
        data: { status: 'REFUNDING' },
      });
      if (frozen.count !== refundable.length)
        throw new BadRequestException('车票状态已变化，请刷新后重试');
      await tx.refund.create({
        data: {
          refundNo,
          orderId: order.id,
          ticketIds: refundable.map((t) => t.id),
          ticketCount: refundable.length,
          amountCents: totalCents,
          feeCents: 0,
          reason: input.reason || '客服整单退款',
          status: 'PROCESSING',
          operatorId: input.operatorId,
          operatorType: 'ADMIN',
        },
      });
      await tx.order.updateMany({
        where: {
          id: order.id,
          payStatus: 'PAID',
          orderStatus: { in: ['PAID', 'PARTIALLY_REFUNDED'] },
        },
        data: { payStatus: 'REFUNDING', orderStatus: 'REFUNDING' },
      });
    });

    this.logger.log(`管理端整单退款: ${refundNo} order=${order.id} refund=${totalCents}分`);
    await this.callGateway(order.orderNo, refundNo, totalCents, input.reason || '客服整单退款');
    return this.prisma.refund.findUnique({ where: { refundNo } });
  }

  private async sumSuccessRefunds(orderId: string): Promise<number> {
    const rows = await this.prisma.refund.findMany({
      where: { orderId, status: 'SUCCESS' },
      select: { amountCents: true },
    });
    return rows.reduce((sum, r) => sum + r.amountCents, 0);
  }

  /** 改签差价退款（OrderService 调用）：不走票校验，票状态已 CANCELLED 不受影响 */
  async refundDiff(input: {
    orderId: string;
    orderNo: string;
    amountCents: number;
    ticketIds: string[];
    reason: string;
    operatorType: RefundOperator['operatorType'];
    operatorId?: string | null;
  }) {
    if (input.amountCents <= 0) return null;
    return this.createAndCall({
      orderId: input.orderId,
      orderNo: input.orderNo,
      amountCents: input.amountCents,
      feeCents: 0,
      ticketIds: input.ticketIds,
      reason: input.reason,
      operatorId: input.operatorId ?? null,
      operatorType: input.operatorType,
    });
  }

  private async createAndCall(input: {
    orderId: string;
    orderNo: string;
    amountCents: number;
    feeCents: number;
    ticketIds: string[];
    reason: string;
    operatorId?: string | null;
    operatorType?: RefundOperator['operatorType'];
  }) {
    const refundNo = this.generateRefundNo();
    await this.prisma.refund.create({
      data: {
        refundNo,
        orderId: input.orderId,
        ticketIds: input.ticketIds,
        ticketCount: input.ticketIds.length,
        amountCents: input.amountCents,
        feeCents: input.feeCents,
        reason: input.reason,
        status: 'PROCESSING',
        operatorId: input.operatorId ?? null,
        operatorType: input.operatorType ?? 'ADMIN',
      },
    });
    await this.callGateway(input.orderNo, refundNo, input.amountCents, input.reason);
    return this.prisma.refund.findUnique({ where: { refundNo } });
  }

  // ====================
  // 结果落地（回调 + 主动查询共用）
  // ====================

  /** 退款结果处理，幂等；SUCCESS 落票/库存/订单聚合，非 SUCCESS 落 FAILED 留人工 */
  async handleRefundResult(payload: {
    refundNo: string;
    refundStatus: string;
    gatewayRefundNo?: string;
    refundedAt?: Date;
    failReason?: string;
  }) {
    const refund = await this.prisma.refund.findUnique({ where: { refundNo: payload.refundNo } });
    if (!refund) {
      this.logger.error(`退款回调找不到退款单: ${payload.refundNo}`);
      return { handled: false };
    }
    if (refund.status === 'SUCCESS') return { handled: true, idempotent: true };

    if (payload.refundStatus === 'SUCCESS') {
      let refundedTicketCount = 0;
      await this.prisma.$transaction(async (tx) => {
        const updated = await tx.refund.updateMany({
          where: { refundNo: payload.refundNo, status: { not: 'SUCCESS' } },
          data: {
            status: 'SUCCESS',
            gatewayRefundNo: payload.gatewayRefundNo ?? refund.gatewayRefundNo,
            completedAt: payload.refundedAt ?? new Date(),
            failReason: null,
          },
        });
        if (updated.count === 0) return;
        // 票 REFUNDING → REFUNDED；改签差价/关闭单退款不命中（票已 CANCELLED），count 驱动库存释放
        const tickets = await tx.ticket.updateMany({
          where: { id: { in: refund.ticketIds as string[] }, status: 'REFUNDING' },
          data: { status: 'REFUNDED' },
        });
        refundedTicketCount = tickets.count;
        if (tickets.count > 0) {
          const order = await tx.order.findUnique({
            where: { id: refund.orderId },
            select: { tripId: true },
          });
          if (order) {
            await tx.trip.updateMany({
              where: { id: order.tripId, soldSeats: { gte: tickets.count } },
              data: { soldSeats: { decrement: tickets.count } },
            });
          }
        }
      });

      await this.recomputeOrderAfterRefund(refund.orderId);
      this.logger.log(
        `退款成功 refundNo=${payload.refundNo} order=${refund.orderId} 退款票数=${refundedTicketCount}`,
      );
      return { handled: true };
    }

    // ABNORMAL / CLOSED 等异常态：票保持 REFUNDING（冻结），管理端可重试或对账
    await this.prisma.refund.updateMany({
      where: { refundNo: payload.refundNo, status: 'PROCESSING' },
      data: {
        status: 'FAILED',
        failReason: payload.failReason || `退款未成功(${payload.refundStatus})`,
      },
    });
    this.logger.warn(`退款未成功 refundNo=${payload.refundNo} status=${payload.refundStatus}`);
    return { handled: true, failed: true };
  }

  /** 退款终态后重算订单聚合状态（金额口径 payStatus + 票口径 orderStatus） */
  private async recomputeOrderAfterRefund(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        tickets: { select: { status: true } },
        refunds: { where: { status: 'SUCCESS' }, select: { amountCents: true } },
        payment: { select: { amountCents: true } },
      },
    });
    if (!order) return;

    const refundedCents = order.refunds.reduce((sum, r) => sum + r.amountCents, 0);
    const paidCents = order.payment?.amountCents ?? order.totalAmountCents;
    const fullyRefunded = refundedCents > 0 && refundedCents >= paidCents;
    const refundedTickets = order.tickets.filter((t) => t.status === 'REFUNDED').length;
    const processingExists = await this.prisma.refund.count({
      where: { orderId, status: 'PROCESSING' },
    });

    let payStatus: string;
    let orderStatus: string;
    if (processingExists > 0) {
      payStatus = 'REFUNDING';
      orderStatus = order.orderStatus === 'CLOSED' ? 'CLOSED' : 'REFUNDING';
    } else if (fullyRefunded) {
      payStatus = 'REFUNDED';
      orderStatus = order.orderStatus === 'CLOSED' ? 'CLOSED' : 'REFUNDED';
    } else if (refundedTickets > 0) {
      payStatus = 'PARTIAL_REFUND';
      orderStatus = 'PARTIALLY_REFUNDED';
    } else if (refundedCents > 0) {
      // 改签差价退款：钱部分回退但订单票完整有效
      payStatus = 'PARTIAL_REFUND';
      orderStatus = order.orderStatus === 'CLOSED' ? 'CLOSED' : 'PAID';
    } else {
      payStatus = order.orderStatus === 'CLOSED' ? 'CLOSED' : 'PAID';
      orderStatus = order.orderStatus === 'CLOSED' ? 'CLOSED' : 'PAID';
    }

    await this.prisma.order.update({ where: { id: orderId }, data: { payStatus, orderStatus } });
  }

  // ====================
  // 管理端重试 / 对账
  // ====================

  /** 管理端重试：同 refundNo 重调微信（out_refund_no 幂等，天然防重复退款） */
  async retry(refundId: string, operatorId: string) {
    const refund = await this.prisma.refund.findUnique({
      where: { id: refundId },
      include: { order: { select: { orderNo: true, totalAmountCents: true } } },
    });
    if (!refund) throw new NotFoundException('退款单不存在');
    if (refund.status === 'SUCCESS') throw new BadRequestException('退款已成功，无需重试');
    if (refund.status === 'PROCESSING')
      throw new BadRequestException('退款处理中，请先查询退款状态');

    const gatewayRefundNo = await this.wechatPayService.refund({
      orderNo: refund.order.orderNo,
      refundNo: refund.refundNo,
      totalAmount: refund.order.totalAmountCents / 100,
      refundAmount: refund.amountCents / 100,
      reason: refund.reason || '退款重试',
    });
    await this.prisma.refund.update({
      where: { id: refundId },
      data: { status: 'PROCESSING', failReason: null, gatewayRefundNo },
    });
    this.logger.log(`退款重试已提交 refundNo=${refund.refundNo} operator=${operatorId}`);
    return this.prisma.refund.findUnique({ where: { id: refundId } });
  }

  /** 管理端主动查询微信退款状态并对账落地 */
  async reconcile(refundId: string) {
    const refund = await this.prisma.refund.findUnique({
      where: { id: refundId },
      include: { order: { select: { orderNo: true } } },
    });
    if (!refund) throw new NotFoundException('退款单不存在');
    if (refund.status === 'SUCCESS') return refund;

    const result = await this.wechatPayService.queryRefund(refund.refundNo);
    await this.handleRefundResult({
      refundNo: refund.refundNo,
      refundStatus: result.refundStatus,
      gatewayRefundNo: result.refundId,
      refundedAt: result.successTime,
    });
    return this.prisma.refund.findUnique({ where: { id: refundId } });
  }

  /**
   * 超时竞态自动退款：订单已关闭但支付回调到账（P0 遗留的人工口，P0.5 自动化）。
   * 票已 CANCELLED、库存已释放，全额原路退回支付金额，成功后订单保持 CLOSED。
   */
  async autoRefundClosedOrder(orderId: string) {
    if (process.env.AUTO_REFUND_ENABLED === 'false') return { skipped: 'disabled' };
    const order = await this.loadOrder(orderId);
    if (order.orderStatus !== 'CLOSED' || order.payment?.status !== 'PAID')
      return { skipped: 'not_applicable' };

    const existing = await this.prisma.refund.findFirst({ where: { orderId } });
    if (existing) return { skipped: 'refund_exists', refundNo: existing.refundNo };

    this.logger.warn(
      `超时竞态自动退款启动: order=${orderId} amount=${order.payment.amountCents}分`,
    );
    const refund = await this.createAndCall({
      orderId: order.id,
      orderNo: order.orderNo,
      amountCents: order.payment.amountCents,
      feeCents: 0,
      ticketIds: order.tickets.map((t) => t.id),
      reason: '订单关闭后支付到账，系统自动全额退款',
      operatorId: null,
      operatorType: 'SYSTEM',
    });
    return { skipped: null, refundNo: refund?.refundNo };
  }

  /**
   * 兜底对账：每小时扫描 PROCESSING 超过 30 分钟的退款单，
   * 主动查微信侧状态落地（防回调丢失导致退款单悬空）。
   */
  @Cron(CronExpression.EVERY_HOUR)
  async reconcileStuckRefunds() {
    const stuck = await this.prisma.refund.findMany({
      where: {
        status: 'PROCESSING',
        updatedAt: { lt: new Date(Date.now() - 30 * 60 * 1000) },
      },
      select: { id: true, refundNo: true },
      take: 50,
    });
    for (const item of stuck) {
      try {
        await this.reconcile(item.id);
      } catch (error: any) {
        this.logger.warn(`兜底对账失败 refundNo=${item.refundNo}: ${error?.message}`);
      }
    }
  }

  /** 按订单查退款流水（管理端详情 Tab / 乘客端展示） */
  async listByOrder(orderId: string) {
    return this.prisma.refund.findMany({ where: { orderId }, orderBy: { createdAt: 'desc' } });
  }
}
