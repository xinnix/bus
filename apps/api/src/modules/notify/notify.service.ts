import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { getDepartureAt } from '@sanqin/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from '../../shared/settings/settings.service';
import { WechatService } from '../wechat/wechat.service';

/** thing 类字段微信限 20 字符 */
function truncate(value: string, max = 20): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

/**
 * 订阅消息通知（P0.5，best-effort）：
 * - 出票通知：支付成功后发送（模板关键词约定：thing1=线路，time2=发车时间，character_string3=订单号）
 * - 发车提醒：每 10 分钟扫描 30 分钟内发车的班次（模板关键词约定：thing1=线路，time2=发车时间，thing3=上车点）
 *
 * 总开关与模板 ID 走 SettingsService（subscribe 组）；未启用/未配置模板一律静默跳过，
 * 任何发送失败只记日志，绝不影响支付/订单主链路。
 */
@Injectable()
export class NotifyService {
  private readonly logger = new Logger(NotifyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly wechatService: WechatService,
    private readonly settingsService: SettingsService,
  ) {}

  private isSubscribable(): boolean {
    return this.settingsService.get('SUBSCRIBE_ENABLED') === 'true';
  }

  private truncateTime(serviceDate: string, departureTime: string): string {
    return `${serviceDate} ${departureTime}`;
  }

  /** 出票通知（支付成功后调用，幂等安全：重复调用只多发一条，调用方在首次成功路径触发） */
  async notifyPaid(orderId: string): Promise<void> {
    try {
      if (!this.isSubscribable()) return;
      const templateId = this.settingsService.get('SUBSCRIBE_TEMPLATE_PAID');
      if (!templateId) return;

      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: { line: { select: { name: true } }, trip: true },
      });
      if (!order?.trip) return;
      const user = await this.prisma.user.findUnique({
        where: { id: order.userId },
        select: { openid: true },
      });
      if (!user?.openid) return;

      await this.wechatService.sendSubscribeMessage({
        openid: user.openid,
        templateId,
        page: `pages/orders/detail?id=${order.id}`,
        data: {
          thing1: { value: truncate(order.line.name) },
          time2: { value: this.truncateTime(order.trip.serviceDate, order.trip.departureTime) },
          character_string3: { value: order.orderNo },
        },
      });
    } catch (error: any) {
      this.logger.warn(`出票通知发送失败（忽略） order=${orderId}: ${error?.message}`);
    }
  }

  /**
   * 发车提醒：扫描 30 分钟内发车的未通知票，按订单聚合发送（一次授权额度 = 一条消息）。
   * 用户未订阅（errcode 43101）同样标记已通知，避免每 10 分钟重扫。
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async notifyUpcomingDepartures() {
    if (!this.isSubscribable()) return;
    const templateId = this.settingsService.get('SUBSCRIBE_TEMPLATE_DEPARTURE');
    if (!templateId) return;

    const now = Date.now();
    const windowMs = 30 * 60 * 1000;

    const tickets = await this.prisma.ticket.findMany({
      where: { status: 'UNUSED', departureNotifiedAt: null },
      include: {
        order: {
          include: { trip: true, line: { select: { name: true, startCity: true } } },
        },
      },
      take: 200,
    });

    // 按订单分组并过滤发车窗口
    const groups = new Map<
      string,
      {
        ticketIds: string[];
        orderId: string;
        userId: string;
        lineName: string;
        serviceDate: string;
        departureTime: string;
        boardingStationId: string | null;
      }
    >();
    for (const ticket of tickets) {
      const { order } = ticket;
      if (!['PAID', 'REFUNDING', 'PARTIALLY_REFUNDED'].includes(order.orderStatus)) continue;
      const departure = getDepartureAt(order.trip.serviceDate, order.trip.departureTime);
      if (departure === null || departure - now <= 0 || departure - now > windowMs) continue;

      const group = groups.get(order.id) ?? {
        ticketIds: [],
        orderId: order.id,
        userId: order.userId,
        lineName: order.line.name,
        serviceDate: order.trip.serviceDate,
        departureTime: order.trip.departureTime,
        boardingStationId: order.boardingStationId,
      };
      group.ticketIds.push(ticket.id);
      groups.set(order.id, group);
    }

    for (const group of groups.values()) {
      try {
        const user = await this.prisma.user.findUnique({
          where: { id: group.userId },
          select: { openid: true },
        });
        if (!user?.openid) continue;

        const station = group.boardingStationId
          ? await this.prisma.station.findUnique({
              where: { id: group.boardingStationId },
              select: { name: true },
            })
          : null;

        const result = await this.wechatService.sendSubscribeMessage({
          openid: user.openid,
          templateId,
          page: `pages/orders/detail?id=${group.orderId}`,
          data: {
            thing1: { value: truncate(group.lineName) },
            time2: { value: this.truncateTime(group.serviceDate, group.departureTime) },
            thing3: { value: truncate(station?.name ?? '原上车站点') },
          },
        });

        // 成功 / 用户未订阅（43101）都标记已通知，防止重复扫描
        if (result.errcode === 0 || result.errcode === 43101) {
          await this.prisma.ticket.updateMany({
            where: { id: { in: group.ticketIds } },
            data: { departureNotifiedAt: new Date() },
          });
        }
      } catch (error: any) {
        this.logger.warn(`发车提醒发送失败（忽略） order=${group.orderId}: ${error?.message}`);
      }
    }
  }
}
