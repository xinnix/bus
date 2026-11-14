import { Permission } from '@sanqin/shared';
import { z } from 'zod';
import { router, permissionProcedure } from '../../trpc/trpc';

const DateStrSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 YYYY-MM-DD');

function localDateStr(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * 管理端数据看板 Router（只读）。
 * 登录落地页（/dashboard）用的运营概览：今日指标 + 全局累计。
 * 「今日」按 API 服务器本地时区零点起算（生产容器 TZ=Asia/Shanghai）；
 * 班次的 serviceDate 为 YYYY-MM-DD 字符串，直接用本地日期比对。
 */
export const dashboardRouter = router({
  stats: permissionProcedure(Permission.order.read).query(async ({ ctx }) => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const now = new Date();
    const todayStr = localDateStr(now);

    const [
      totalUsers,
      todayNewUsers,
      totalOrders,
      todayOrders,
      paidToday,
      paidTotal,
      todayCheckins,
      todayTrips,
      totalLines,
    ] = await Promise.all([
      ctx.prisma.user.count(),
      ctx.prisma.user.count({ where: { createdAt: { gte: startOfToday } } }),
      ctx.prisma.order.count(),
      ctx.prisma.order.count({ where: { createdAt: { gte: startOfToday } } }),
      ctx.prisma.order.aggregate({
        _sum: { totalAmountCents: true },
        where: { payStatus: 'PAID', paidAt: { gte: startOfToday } },
      }),
      ctx.prisma.order.aggregate({
        _sum: { totalAmountCents: true },
        where: { payStatus: 'PAID' },
      }),
      ctx.prisma.checkIn.count({ where: { checkedAt: { gte: startOfToday } } }),
      ctx.prisma.trip.count({ where: { serviceDate: todayStr } }),
      ctx.prisma.line.count(),
    ]);

    return {
      today: {
        newUsers: todayNewUsers,
        orders: todayOrders,
        paidCents: paidToday._sum.totalAmountCents ?? 0,
        checkins: todayCheckins,
        trips: todayTrips,
      },
      total: {
        users: totalUsers,
        orders: totalOrders,
        paidCents: paidTotal._sum.totalAmountCents ?? 0,
        lines: totalLines,
      },
    };
  }),

  /**
   * P0.5 简单日报表：按支付完成日（paidAt 本地日期）逐日聚合
   * 订单数 / 票数 / 支付金额，按退款完成日聚合退款金额，输出净额与合计。
   * 口径：支付金额含后来发生退款的订单（钱已收）；退款金额只计 SUCCESS 且完成日在区间内。
   */
  daily: permissionProcedure(Permission.order.read)
    .input(
      z
        .object({ startDate: DateStrSchema, endDate: DateStrSchema })
        .refine((v) => v.startDate <= v.endDate, { message: '开始日期不能晚于结束日期' })
        .refine(
          (v) =>
            (new Date(`${v.endDate}T00:00:00`).getTime() -
              new Date(`${v.startDate}T00:00:00`).getTime()) /
              86400000 <=
            92,
          { message: '查询区间最长 92 天' },
        ),
    )
    .query(async ({ ctx, input }) => {
      // 区间按服务器本地时区：[startDate 00:00, endDate+1 00:00)
      const start = new Date(`${input.startDate}T00:00:00`);
      const endExclusive = new Date(`${input.endDate}T00:00:00`);
      endExclusive.setDate(endExclusive.getDate() + 1);

      const [orders, refunds] = await Promise.all([
        ctx.prisma.order.findMany({
          where: {
            paidAt: { gte: start, lt: endExclusive },
            // 实际收到钱的订单（含后续发生退款的）
            payStatus: { in: ['PAID', 'REFUNDING', 'PARTIAL_REFUND', 'REFUNDED'] },
          },
          select: { paidAt: true, ticketCount: true, totalAmountCents: true },
        }),
        ctx.prisma.refund.findMany({
          where: {
            status: 'SUCCESS',
            completedAt: { gte: start, lt: endExclusive },
          },
          select: { completedAt: true, amountCents: true, feeCents: true },
        }),
      ]);

      const byDate = new Map<
        string,
        {
          date: string;
          orderCount: number;
          ticketCount: number;
          paidCents: number;
          refundCents: number;
        }
      >();
      const rowOf = (date: string) => {
        let row = byDate.get(date);
        if (!row) {
          row = { date, orderCount: 0, ticketCount: 0, paidCents: 0, refundCents: 0 };
          byDate.set(date, row);
        }
        return row;
      };

      for (const order of orders) {
        if (!order.paidAt) continue;
        const row = rowOf(localDateStr(order.paidAt));
        row.orderCount += 1;
        row.ticketCount += order.ticketCount;
        row.paidCents += order.totalAmountCents;
      }
      for (const refund of refunds) {
        if (!refund.completedAt) continue;
        rowOf(localDateStr(refund.completedAt)).refundCents += refund.amountCents;
      }

      const rows = [...byDate.values()]
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .map((row) => ({ ...row, netCents: row.paidCents - row.refundCents }));

      const totals = rows.reduce(
        (acc, row) => ({
          orderCount: acc.orderCount + row.orderCount,
          ticketCount: acc.ticketCount + row.ticketCount,
          paidCents: acc.paidCents + row.paidCents,
          refundCents: acc.refundCents + row.refundCents,
          netCents: acc.netCents + row.netCents,
        }),
        { orderCount: 0, ticketCount: 0, paidCents: 0, refundCents: 0, netCents: 0 },
      );

      return { rows, totals, startDate: input.startDate, endDate: input.endDate };
    }),
});
