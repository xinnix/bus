import { describe, expect, it } from 'vitest';
import { dashboardRouter } from './dashboard.router';
import { createCaller } from '../../test/prisma-mock';

const ctx = {
  _extraModels: ['order', 'line', 'trip', 'checkIn'],
  user: { permissions: ['order:read'] },
};

describe('dashboard.router（stats 聚合）', () => {
  it('汇总今日与累计指标', async () => {
    const { caller, prisma } = createCaller(dashboardRouter, ctx);
    prisma.user.count.mockResolvedValueOnce(100).mockResolvedValueOnce(3); // 总数, 今日新增
    prisma.order.count.mockResolvedValueOnce(50).mockResolvedValueOnce(2); // 总数, 今日
    prisma.order.aggregate
      .mockResolvedValueOnce({ _sum: { totalAmountCents: 12500 } }) // 今日收款
      .mockResolvedValueOnce({ _sum: { totalAmountCents: 99000 } }); // 累计收款
    prisma.checkIn.count.mockResolvedValue(7);
    prisma.trip.count.mockResolvedValue(6);
    prisma.line.count.mockResolvedValue(4);

    const stats = await caller.stats();

    expect(stats.today).toEqual({
      newUsers: 3,
      orders: 2,
      paidCents: 12500,
      checkins: 7,
      trips: 6,
    });
    expect(stats.total).toEqual({
      users: 100,
      orders: 50,
      paidCents: 99000,
      lines: 4,
    });
    // 今日订单按 createdAt >= 今日零点过滤
    expect(prisma.order.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: { createdAt: expect.anything() } }),
    );
  });

  it('收款无记录时 _sum 为 null，归零输出', async () => {
    const { caller, prisma } = createCaller(dashboardRouter, ctx);
    prisma.user.count.mockResolvedValue(0);
    prisma.order.count.mockResolvedValue(0);
    prisma.order.aggregate.mockResolvedValue({ _sum: { totalAmountCents: null } });
    prisma.checkIn.count.mockResolvedValue(0);
    prisma.trip.count.mockResolvedValue(0);
    prisma.line.count.mockResolvedValue(0);

    const stats = await caller.stats();

    expect(stats.today.paidCents).toBe(0);
    expect(stats.total.paidCents).toBe(0);
  });

  it('缺少 order:read 权限时拒绝', async () => {
    const { caller } = createCaller(dashboardRouter, {
      ...ctx,
      user: { permissions: ['changelog:read'] },
    });
    await expect(caller.stats()).rejects.toThrow();
  });
});

describe('dashboard.router（daily 日报表聚合，P0.5）', () => {
  it('按支付日聚合订单/票数/金额，按退款完成日聚合退款，输出净额与合计', async () => {
    const { caller, prisma } = createCaller(dashboardRouter, {
      ...ctx,
      _extraModels: ['order', 'line', 'trip', 'checkIn', 'refund'],
    });
    // 两天数据：11-13 两单、11-14 一单；退款一笔落在 13
    prisma.order.findMany.mockResolvedValueOnce([
      {
        paidAt: new Date(2026, 10, 13, 8, 30),
        ticketCount: 2,
        totalAmountCents: 2000,
      },
      {
        paidAt: new Date(2026, 10, 13, 19, 0),
        ticketCount: 1,
        totalAmountCents: 1000,
      },
      {
        paidAt: new Date(2026, 10, 14, 9, 0),
        ticketCount: 3,
        totalAmountCents: 3000,
      },
    ]);
    prisma.refund.findMany.mockResolvedValueOnce([
      { completedAt: new Date(2026, 10, 13, 12, 0), amountCents: 950, feeCents: 50 },
    ]);

    const report = await caller.daily({ startDate: '2026-11-13', endDate: '2026-11-14' });

    expect(report.rows).toHaveLength(2);
    expect(report.rows[0]).toEqual({
      date: '2026-11-14',
      orderCount: 1,
      ticketCount: 3,
      paidCents: 3000,
      refundCents: 0,
      netCents: 3000,
    });
    expect(report.rows[1]).toEqual({
      date: '2026-11-13',
      orderCount: 2,
      ticketCount: 3,
      paidCents: 3000,
      refundCents: 950,
      netCents: 2050,
    });
    expect(report.totals).toEqual({
      orderCount: 3,
      ticketCount: 6,
      paidCents: 6000,
      refundCents: 950,
      netCents: 5050,
    });
  });

  it('区间超过 92 天拒绝', async () => {
    const { caller } = createCaller(dashboardRouter, ctx);
    await expect(
      caller.daily({ startDate: '2026-01-01', endDate: '2026-05-01' }),
    ).rejects.toThrow();
  });
});
