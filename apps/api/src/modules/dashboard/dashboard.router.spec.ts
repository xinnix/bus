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
