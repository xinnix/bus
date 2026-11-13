import { Permission } from '@sanqin/shared';
import { router, permissionProcedure } from '../../trpc/trpc';

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
    const pad = (n: number) => String(n).padStart(2, '0');
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

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
});
