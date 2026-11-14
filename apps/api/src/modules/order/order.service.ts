import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { randomInt } from 'crypto';
import { Prisma } from '@sanqin/database';
import { isTripPurchasable } from '@sanqin/shared';
import { BaseService } from '../../common/base.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateOrderInput } from '@sanqin/shared';

@Injectable()
export class OrderService extends BaseService<'order'> {
  private readonly logger = new Logger(OrderService.name);

  constructor(prisma: PrismaService) {
    super(prisma, 'order');
  }

  private generateOrderNo(): string {
    const now = new Date();
    const ts =
      now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0');
    return `SQ${ts}${String(randomInt(0, 10000)).padStart(4, '0')}`;
  }

  private async uniqueCheckCode(tx: Prisma.TransactionClient): Promise<string> {
    for (let i = 0; i < 10; i++) {
      const code = String(randomInt(100000, 1000000));
      const exists = await tx.ticket.findUnique({ where: { checkCode: code } });
      if (!exists) return code;
    }
    throw new BadRequestException('生成检票码失败，请重试');
  }

  /**
   * 按 Idempotency-Key 查找既有订单（仅限同一用户），命中则直接返回。
   * 返回扁平订单结构（含 tickets），与新建路径一致。
   */
  private async findByIdempotencyKey(userId: string, key: string) {
    const order = await this.prisma.order.findUnique({
      where: { idempotencyKey: key },
      include: { tickets: true, line: true, trip: true },
    });
    // 键冲突校验：不同用户复用同一键视为无效，不当作幂等命中
    if (order && order.userId === userId) return order;
    return null;
  }

  /**
   * 创建订单：Idempotency-Key 幂等 + 库存原子扣减 + 订单/票在同一事务内创建。
   */
  async createOrder(userId: string, input: CreateOrderInput, idempotencyKey?: string) {
    if (idempotencyKey) {
      const existing = await this.findByIdempotencyKey(userId, idempotencyKey);
      if (existing) return existing;
    }

    const trip = await this.prisma.trip.findUnique({
      where: { id: input.tripId },
      include: { line: true },
    });

    if (!trip) throw new NotFoundException('班次不存在');
    if (trip.status !== 'ON_SALE') throw new BadRequestException('该班次当前不可售');
    // 停售规则：发车时间已过 30 分钟不能再购买（宽限期内可买，见 shared.isTripPurchasable）
    if (!isTripPurchasable(trip.serviceDate, trip.departureTime)) {
      throw new BadRequestException('该班次已停止售票（发车后 30 分钟为购票截止）');
    }
    if (input.ticketCount < 1 || input.ticketCount > 4) {
      throw new BadRequestException('每单最多购买 4 张票');
    }

    const amountCents = trip.priceCents * input.ticketCount;
    const orderNo = this.generateOrderNo();
    const passengerNames =
      input.passengerNames && input.passengerNames.length === input.ticketCount
        ? input.passengerNames
        : Array.from({ length: input.ticketCount }, () => input.contactName);

    try {
      return await this.prisma.$transaction(async (tx) => {
        // 原子库存扣减：条件更新避免并发超卖
        const updated = await tx.trip.updateMany({
          where: {
            id: trip.id,
            status: 'ON_SALE',
            soldSeats: { lte: trip.totalSeats - input.ticketCount },
          },
          data: { soldSeats: { increment: input.ticketCount } },
        });

        if (updated.count === 0) {
          throw new BadRequestException('余票不足，请选择其他班次');
        }

        const order = await tx.order.create({
          data: {
            orderNo,
            idempotencyKey: idempotencyKey || null,
            userId,
            lineId: trip.lineId,
            tripId: trip.id,
            boardingStationId: input.boardingStationId || null,
            alightingStationId: input.alightingStationId || null,
            contactName: input.contactName,
            contactPhone: input.contactPhone,
            ticketCount: input.ticketCount,
            totalAmountCents: amountCents,
            payStatus: 'UNPAID',
            orderStatus: 'PENDING_PAYMENT',
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          },
        });

        const tickets = [];
        for (let i = 0; i < input.ticketCount; i++) {
          const checkCode = await this.uniqueCheckCode(tx);
          tickets.push(
            await tx.ticket.create({
              data: {
                ticketNo: `${orderNo}-${i + 1}`,
                orderId: order.id,
                passengerName: passengerNames[i],
                phone: input.contactPhone,
                priceCents: trip.priceCents,
                status: 'UNUSED',
                checkCode,
              },
            }),
          );
        }

        // 返回扁平订单（含 tickets），与幂等命中路径返回结构一致，
        // 保证小程序端 created.data.id 可直接取到订单号
        return { ...order, tickets };
      });
    } catch (error) {
      // 并发携带同一 Idempotency-Key：唯一约束兜底，返回先创建的订单
      if (
        idempotencyKey &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existing = await this.findByIdempotencyKey(userId, idempotencyKey);
        if (existing) return existing;
      }
      throw error;
    }
  }
  async listUserOrders(userId: string, page = 1, pageSize = 20) {
    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { userId },
        include: { tickets: true, line: true, trip: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.order.count({ where: { userId } }),
    ]);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getUserOrder(userId: string, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, userId },
      include: { tickets: true, line: true, trip: true, payment: true },
    });
    if (!order) throw new NotFoundException('订单不存在');
    return order;
  }

  async getPayableOrder(userId: string, id: string) {
    const order = await this.getUserOrder(userId, id);
    if (order.payStatus === 'PAID') throw new BadRequestException('订单已支付');
    if (order.orderStatus !== 'PENDING_PAYMENT') throw new BadRequestException('订单当前不可支付');
    if (order.expiresAt && order.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('订单已超时，请重新下单');
    }
    return order;
  }

  /**
   * 每分钟关闭超时未支付订单并释放库存。
   * 已有支付成功的订单跳过，防止「回调已扣款、订单却被关闭」的资金悬空。
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async closeExpiredOrders() {
    const expired = await this.prisma.order.findMany({
      where: {
        orderStatus: 'PENDING_PAYMENT',
        expiresAt: { lt: new Date() },
      },
      select: { id: true, tripId: true, ticketCount: true, payment: { select: { status: true } } },
      take: 100,
    });

    for (const order of expired) {
      if (order.payment?.status === 'PAID') {
        this.logger.warn(`订单 ${order.id} 已超时但支付已完成，跳过关闭，等待人工/退款处理`);
        continue;
      }
      await this.prisma.$transaction(async (tx) => {
        const closed = await tx.order.updateMany({
          where: { id: order.id, orderStatus: 'PENDING_PAYMENT' },
          data: { orderStatus: 'CLOSED', payStatus: 'CLOSED' },
        });
        if (closed.count === 0) return;
        await tx.trip.update({
          where: { id: order.tripId },
          data: { soldSeats: { decrement: order.ticketCount } },
        });
        await tx.ticket.updateMany({
          where: { orderId: order.id },
          data: { status: 'CANCELLED' },
        });
      });
    }
  }
}
