/**
 * P0 买票核销闭环集成测试（真实 PostgreSQL：sanqin_bus_test 库）。
 *
 * 覆盖验收标准：
 * - 下单（Idempotency-Key 幂等）→ 支付回调（幂等/金额校验）→ 出票 → 核销（重复核销拒绝）
 * - 并发库存：并发下单不超卖
 * - 订单超时关闭释放库存；已支付订单不关闭；关闭后回调竞态兜底
 *
 * 前置：./scripts/test-db.sh migrate（测试库已应用迁移）
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import type { PrismaClient } from '@sanqin/database';
import { OrderService } from '../../modules/order/order.service';
import { RefundService } from '../../modules/refund/refund.service';
import { PaymentService } from '../../modules/payment/services/payment.service';
import { CheckinService } from '../../modules/checkin/checkin.service';
import { createTicketToken, verifyTicketToken } from '../../modules/order/ticket-token';
import { createTestPrismaClient, destroyTestPrismaClient, resolveTestDatabaseUrl } from './setup';

let prisma: PrismaClient;
let orderService: OrderService;
let paymentService: PaymentService;
let checkinService: CheckinService;
let jwtService: JwtService;
let refundService: RefundService;
let wechatPayStub: any; // 退款网关测试桩（形状见 WechatPayService.refund/queryRefund）

let userId: string;
let checkerId: string;
const CHECKER_PASSWORD = 'checker123';

async function createFixtureTrip(
  totalSeats: number,
  departureTime: string,
  serviceDateOverride?: string,
) {
  const line = await prisma.line.create({
    data: {
      name: `测试线路-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      startCity: '西安',
      endCity: '太乙宫',
      publishStatus: 'PUBLISHED',
    },
  });
  const boarding = await prisma.station.create({
    data: { name: `上车站-${line.id}`, address: '测试地址' },
  });
  const alighting = await prisma.station.create({
    data: { name: `下车站-${line.id}`, address: '测试地址' },
  });
  await prisma.lineStation.createMany({
    data: [
      { lineId: line.id, stationId: boarding.id, type: 'BOARD', sort: 1 },
      { lineId: line.id, stationId: alighting.id, type: 'ALIGHT', sort: 1 },
    ],
  });
  // 默认明天发车：避开「发车后 30 分钟停售」规则对既有用例的影响
  const serviceDate =
    serviceDateOverride ?? new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);
  const trip = await prisma.trip.create({
    data: {
      lineId: line.id,
      serviceDate,
      departureTime,
      priceCents: 1000,
      totalSeats,
      soldSeats: 0,
      status: 'ON_SALE',
    },
  });
  return { line, boarding, alighting, trip };
}

function orderInput(tripId: string, ticketCount = 1) {
  return {
    tripId,
    contactName: '测试乘客',
    contactPhone: '13800001111',
    ticketCount,
  } as const;
}

beforeAll(async () => {
  process.env.DATABASE_URL = resolveTestDatabaseUrl();
  prisma = (await createTestPrismaClient()) as any;

  // 清空 P0 业务表（专用测试库，不影响开发库）
  await prisma.$executeRawUnsafe(
    `TRUNCATE "check_ins", "tickets", "payments", "refunds", "orders", "trips", "schedule_templates", "line_stations", "stations", "lines", "checkers", "users" CASCADE`,
  );

  const user = await prisma.user.create({
    data: {
      username: `p0it_${Date.now()}`,
      passwordHash: 'x',
    },
  });
  userId = user.id;

  const checker = await prisma.checker.create({
    data: {
      phone: '13800009999',
      passwordHash: await bcrypt.hash(CHECKER_PASSWORD, 4),
      name: '集成测试核销员',
      status: 'ACTIVE',
    },
  });
  checkerId = checker.id;

  // 退款网关用测试桩：集成测试不触达微信（单例可按用例改写行为模拟网关失败）
  wechatPayStub = {
    refund: async (params: { refundNo: string }) => `wx_refund_${params.refundNo}`,
    queryRefund: async () => ({ refundStatus: 'SUCCESS' }),
  } as any;
  refundService = new RefundService(prisma as any, wechatPayStub);
  orderService = new OrderService(prisma as any);
  const notifyStub = { notifyPaid: async () => {} } as any;
  paymentService = new PaymentService(prisma as any, notifyStub);
  jwtService = new JwtService({ secret: 'p0-it-secret' });
  checkinService = new CheckinService(prisma as any, jwtService);
});

afterAll(async () => {
  await prisma.$executeRawUnsafe(
    `TRUNCATE "check_ins", "tickets", "payments", "refunds", "orders", "trips", "schedule_templates", "line_stations", "stations", "lines", "checkers", "users" CASCADE`,
  );
  await destroyTestPrismaClient(prisma);
});

describe('P0 下单 → 支付 → 出票 → 核销 闭环', () => {
  it('下单创建订单与票并锁定库存', async () => {
    const { trip } = await createFixtureTrip(10, '08:00');
    const order = await orderService.createOrder(userId, orderInput(trip.id, 3));

    expect(order.payStatus).toBe('UNPAID');
    expect(order.orderStatus).toBe('PENDING_PAYMENT');
    expect(order.totalAmountCents).toBe(3000);
    expect(order.tickets).toHaveLength(3);
    for (const ticket of order.tickets) {
      expect(ticket.ticketNo).toBe(`${order.orderNo}-${ticket.ticketNo.split('-').pop()}`);
      expect(ticket.status).toBe('UNUSED');
      expect(ticket.checkCode).toMatch(/^\d{6}$/);
    }

    const after = await prisma.trip.findUniqueOrThrow({ where: { id: trip.id } });
    expect(after.soldSeats).toBe(3);
  });

  it('发车时间已过 30 分钟的班次停止售票', async () => {
    // 昨天发车的班次必然已过宽限期（不受测试运行时刻影响）
    const yesterday = new Date(Date.now() - 24 * 3600 * 1000).toISOString().slice(0, 10);
    const { trip } = await createFixtureTrip(10, '08:00', yesterday);
    await expect(orderService.createOrder(userId, orderInput(trip.id, 1))).rejects.toThrow(
      '停止售票',
    );
    // 未扣库存
    const untouched = await prisma.trip.findUniqueOrThrow({ where: { id: trip.id } });
    expect(untouched.soldSeats).toBe(0);
  });

  it('模拟支付成功出票可核销；重复核销返回首次核销信息', async () => {
    const { trip } = await createFixtureTrip(10, '08:10');
    const order = await orderService.createOrder(userId, orderInput(trip.id, 2));
    const tickets = order.tickets;

    const handled = await paymentService.handlePaymentSuccess({
      orderId: order.id,
      orderNo: order.orderNo,
      transactionId: `IT_TX_${order.id}`,
      amount: order.totalAmountCents,
      paidAt: new Date(),
      rawNotify: { source: 'integration-test' },
    });
    expect(handled).toMatchObject({ handled: true, idempotent: false });

    const paid = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { payment: true },
    });
    expect(paid.orderStatus).toBe('PAID');
    expect(paid.payStatus).toBe('PAID');
    expect(paid.payment?.status).toBe('PAID');
    expect(paid.payment?.rawNotify).toMatchObject({ source: 'integration-test' });

    // 回调重投幂等：同 transactionId 再处理一次直接返回
    const again = await paymentService.handlePaymentSuccess({
      orderId: order.id,
      orderNo: order.orderNo,
      transactionId: `IT_TX_${order.id}`,
      amount: order.totalAmountCents,
      paidAt: new Date(),
    });
    expect(again).toMatchObject({ handled: true, idempotent: true });

    // 核销：核销员登录 → 6 位码核销第一张
    const login = await checkinService.login('13800009999', CHECKER_PASSWORD);
    expect(login.accessToken).toBeTruthy();

    const verified = await checkinService.verify(checkerId, { code: tickets[0].checkCode });
    expect(verified.success).toBe(true);

    const record = await prisma.checkIn.findUniqueOrThrow({
      where: { ticketId: tickets[0].id },
      include: { checker: true },
    });
    expect(record.checkerId).toBe(checkerId);
    expect(record.method).toBe('MANUAL');

    // 重复核销：返回首次核销时间与操作员
    const duplicate: any = await checkinService.verify(checkerId, { code: tickets[0].checkCode });
    expect(duplicate.success).toBe(false);
    expect(duplicate.reason).toBe('ALREADY_CHECKED_IN');
    expect(duplicate.message).toContain('核销');

    // 二维码路径核销第二张
    const qrToken = createTicketToken(tickets[1].id, trip.id);
    const qrVerified = await checkinService.verify(checkerId, { qrToken });
    expect(qrVerified.success).toBe(true);

    // 全部票核销后订单进入「已完成」
    const completed = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(completed.orderStatus).toBe('COMPLETED');
  });

  it('QR token 过期后无法核销', async () => {
    const { trip } = await createFixtureTrip(10, '08:20');
    const { tickets } = await orderService.createOrder(userId, orderInput(trip.id, 1));

    const expiredToken = createTicketToken(tickets[0].id, trip.id, Date.now() - 1000);
    expect(verifyTicketToken(expiredToken)).toBeNull();
    await expect(checkinService.verify(checkerId, { qrToken: expiredToken })).rejects.toThrow(
      '二维码无效或已损坏',
    );
  });

  it('Idempotency-Key：同键返回同一订单，并发同键只创建一单', async () => {
    const { trip } = await createFixtureTrip(10, '08:30');

    const first = await orderService.createOrder(userId, orderInput(trip.id, 1), 'IT_KEY_A');
    const second = await orderService.createOrder(userId, orderInput(trip.id, 1), 'IT_KEY_A');
    expect(second.id).toBe(first.id);
    // 幂等命中与新建返回结构一致（扁平订单含 tickets）
    expect(second.tickets).toHaveLength(1);

    const [a, b] = await Promise.all([
      orderService.createOrder(userId, orderInput(trip.id, 1), 'IT_KEY_B'),
      orderService.createOrder(userId, orderInput(trip.id, 1), 'IT_KEY_B'),
    ]);
    expect(a.id).toBe(b.id);

    const keys = await prisma.order.findMany({
      where: { idempotencyKey: { in: ['IT_KEY_A', 'IT_KEY_B'] } },
    });
    expect(keys).toHaveLength(2);
  });

  it('并发下单不超卖（50 并发抢 5 座）', async () => {
    const { trip } = await createFixtureTrip(5, '08:40');

    const results = await Promise.allSettled(
      Array.from({ length: 50 }, () => orderService.createOrder(userId, orderInput(trip.id, 1))),
    );

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled).toHaveLength(5);
    expect(rejected).toHaveLength(45);

    const after = await prisma.trip.findUniqueOrThrow({ where: { id: trip.id } });
    expect(after.soldSeats).toBe(5);

    const ticketCount = await prisma.ticket.count({
      where: { orderId: { in: fulfilled.map((r: any) => r.value.id) } },
    });
    expect(ticketCount).toBe(5);
  });

  it('超时订单关闭释放库存；已支付订单不被关闭', async () => {
    const { trip: t1 } = await createFixtureTrip(5, '09:00');
    const expired = await orderService.createOrder(userId, orderInput(t1.id, 2));
    await prisma.order.update({
      where: { id: expired.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const { trip: t2 } = await createFixtureTrip(5, '09:01');
    const paidOrder = await orderService.createOrder(userId, orderInput(t2.id, 2));
    await prisma.order.update({
      where: { id: paidOrder.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await paymentService.handlePaymentSuccess({
      orderId: paidOrder.id,
      orderNo: paidOrder.orderNo,
      transactionId: `IT_TX_LATE_${paidOrder.id}`,
      amount: paidOrder.totalAmountCents,
      paidAt: new Date(),
    });

    await orderService.closeExpiredOrders();

    const closed = await prisma.order.findUniqueOrThrow({ where: { id: expired.id } });
    expect(closed.orderStatus).toBe('CLOSED');
    const closedTickets = await prisma.ticket.findMany({ where: { orderId: closed.id } });
    expect(closedTickets.every((t) => t.status === 'CANCELLED')).toBe(true);
    const t1After = await prisma.trip.findUniqueOrThrow({ where: { id: t1.id } });
    expect(t1After.soldSeats).toBe(0);

    const stillPaid = await prisma.order.findUniqueOrThrow({ where: { id: paidOrder.id } });
    expect(stillPaid.orderStatus).toBe('PAID');
    const t2After = await prisma.trip.findUniqueOrThrow({ where: { id: t2.id } });
    expect(t2After.soldSeats).toBe(2);
  });

  it('竞态兜底：订单关闭后到达的成功回调留痕且不重开订单', async () => {
    const { trip } = await createFixtureTrip(5, '09:10');
    const order = await orderService.createOrder(userId, orderInput(trip.id, 1));

    // 模拟回调到达前订单已被超时任务关闭
    await prisma.order.update({
      where: { id: order.id },
      data: { orderStatus: 'CLOSED', payStatus: 'CLOSED' },
    });
    await prisma.ticket.updateMany({
      where: { orderId: order.id },
      data: { status: 'CANCELLED' },
    });

    const handled = await paymentService.handlePaymentSuccess({
      orderId: order.id,
      orderNo: order.orderNo,
      transactionId: `IT_TX_RACE_${order.id}`,
      amount: order.totalAmountCents,
      paidAt: new Date(),
    });

    expect(handled).toMatchObject({ handled: true, orderClosed: true });
    const payment = await prisma.payment.findUniqueOrThrow({ where: { orderId: order.id } });
    expect(payment.status).toBe('PAID');
    const after = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(after.orderStatus).toBe('CLOSED');
  });

  it('金额不匹配的回调被拒绝', async () => {
    const { trip } = await createFixtureTrip(5, '09:20');
    const order = await orderService.createOrder(userId, orderInput(trip.id, 1));

    const handled = await paymentService.handlePaymentSuccess({
      orderId: order.id,
      orderNo: order.orderNo,
      transactionId: `IT_TX_BAD_${order.id}`,
      amount: order.totalAmountCents - 1,
      paidAt: new Date(),
    });
    expect(handled).toMatchObject({ handled: false, reason: 'amount_mismatch' });
  });
});

describe('核销员身份检查与绑定（手机号一致性）', () => {
  it('用户手机号与核销员一致时识别身份并回填 openid，可免密登录', async () => {
    const checker = await prisma.checker.create({
      data: {
        phone: '13900001234',
        passwordHash: await bcrypt.hash('checker123', 4),
        name: '绑定测试核销员',
        status: 'ACTIVE',
      },
    });
    const user = await prisma.user.create({
      data: {
        username: `bind_it_${Date.now()}`,
        passwordHash: 'x',
        phone: '13900001234',
        openid: `openid_bind_it_${Date.now()}`,
      },
    });

    const result = await checkinService.identity(user.id);
    expect(result.isChecker).toBe(true);
    expect(result.checker).toMatchObject({ id: checker.id, phone: '13900001234' });

    // 绑定成果：openid 回填到核销员记录 → 免密登录签发 checker JWT
    const bound = await prisma.checker.findUniqueOrThrow({ where: { id: checker.id } });
    expect(bound.openid).toBe(user.openid);
    const quick = await checkinService.openidLogin(user.id);
    expect(quick.checker).toMatchObject({ id: checker.id, name: '绑定测试核销员' });
    const payload = await jwtService.verifyAsync(quick.accessToken);
    expect(payload).toMatchObject({ sub: checker.id, type: 'checker' });

    // 重复调用幂等：openid 既往绑定直接生效
    const again = await checkinService.identity(user.id);
    expect(again.isChecker).toBe(true);
  });

  it('无手机号或核销员停用时不识别身份', async () => {
    const noPhone = await prisma.user.create({
      data: { username: `bind_it_np_${Date.now()}`, passwordHash: 'x' },
    });
    expect((await checkinService.identity(noPhone.id)).isChecker).toBe(false);

    await prisma.checker.create({
      data: {
        phone: '13900004321',
        passwordHash: await bcrypt.hash('checker123', 4),
        name: '停用核销员',
        status: 'INACTIVE',
      },
    });
    const user = await prisma.user.create({
      data: {
        username: `bind_it_ia_${Date.now()}`,
        passwordHash: 'x',
        phone: '13900004321',
        openid: `openid_ia_${Date.now()}`,
      },
    });
    expect((await checkinService.identity(user.id)).isChecker).toBe(false);
    await expect(checkinService.openidLogin(user.id)).rejects.toThrow('未绑定核销员身份');
  });
});

describe('P0.5 退票（简化版：全额退，按票/整单）', () => {
  /** 相对当前时刻 h 小时后的本地发车时刻（跨天自动落到对应日期） */
  function departureIn(hours: number) {
    const d = new Date(Date.now() + hours * 3600_000);
    const pad = (n: number) => String(n).padStart(2, '0');
    return {
      serviceDate: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      departureTime: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    };
  }

  async function payOrder(orderId: string, totalCents: number) {
    await paymentService.handlePaymentSuccess({
      orderId,
      orderNo: (await prisma.order.findUniqueOrThrow({ where: { id: orderId } })).orderNo,
      transactionId: `IT_TX_${orderId}_${Date.now()}`,
      amount: totalCents,
      paidAt: new Date(),
    });
  }

  it('停退窗口外全额退：退款成功后票 REFUNDED、库存回落、订单 REFUNDED', async () => {
    const { trip } = await createFixtureTrip(10, '10:00', departureIn(48).serviceDate);
    const order = await orderService.createOrder(userId, orderInput(trip.id, 2));
    await payOrder(order.id, order.totalAmountCents);

    const ticketIds = order.tickets.map((t) => t.id);
    const refund = await refundService.request({
      orderId: order.id,
      ticketIds,
      operatorType: 'USER',
    });
    expect(refund!.status).toBe('PROCESSING');
    expect(refund!.amountCents).toBe(order.totalAmountCents);
    expect(refund!.feeCents).toBe(0);

    // 模拟微信退款回调 SUCCESS
    await refundService.handleRefundResult({
      refundNo: refund!.refundNo,
      refundStatus: 'SUCCESS',
      gatewayRefundNo: `wx_${refund!.refundNo}`,
    });

    const after = await prisma.order.findUnique({
      where: { id: order.id },
      include: { tickets: true, refunds: true },
    });
    expect(after!.payStatus).toBe('REFUNDED');
    expect(after!.orderStatus).toBe('REFUNDED');
    expect(after!.tickets.every((t) => t.status === 'REFUNDED')).toBe(true);
    expect(after!.refunds[0].status).toBe('SUCCESS');
    expect(after!.refunds[0].gatewayRefundNo).toBe(`wx_${refund!.refundNo}`);
    const tripAfter = await prisma.trip.findUniqueOrThrow({ where: { id: trip.id } });
    expect(tripAfter.soldSeats).toBe(0); // 库存完全回落
  });

  it('多票订单可分别退：部分退款聚合为 PARTIALLY_REFUNDED', async () => {
    const { trip } = await createFixtureTrip(10, '10:00', departureIn(48).serviceDate);
    const order = await orderService.createOrder(userId, orderInput(trip.id, 2));
    await payOrder(order.id, order.totalAmountCents);

    // 只退第一张票
    const first = order.tickets[0];
    const refund = await refundService.request({
      orderId: order.id,
      ticketIds: [first.id],
      operatorType: 'USER',
    });
    expect(refund!.amountCents).toBe(first.priceCents);
    await refundService.handleRefundResult({
      refundNo: refund!.refundNo,
      refundStatus: 'SUCCESS',
    });

    const after = await prisma.order.findUnique({
      where: { id: order.id },
      include: { tickets: true },
    });
    expect(after!.payStatus).toBe('PARTIAL_REFUND');
    expect(after!.orderStatus).toBe('PARTIALLY_REFUNDED');
    const tripAfter = await prisma.trip.findUniqueOrThrow({ where: { id: trip.id } });
    expect(tripAfter.soldSeats).toBe(1); // 释放一张
  });

  it('发车前 2h 内拒绝退票；已核销车票不可退', async () => {
    const dep = departureIn(1);
    const { trip } = await createFixtureTrip(10, dep.departureTime, dep.serviceDate);
    const order = await orderService.createOrder(userId, orderInput(trip.id, 1));
    await payOrder(order.id, order.totalAmountCents);

    const ticketId = order.tickets[0].id;
    await expect(
      refundService.request({ orderId: order.id, ticketIds: [ticketId], operatorType: 'USER' }),
    ).rejects.toThrow('不可退票');

    // 已核销不可退：直接改状态模拟核销
    await prisma.ticket.update({ where: { id: ticketId }, data: { status: 'CHECKED_IN' } });
    await expect(
      refundService.request({ orderId: order.id, ticketIds: [ticketId], operatorType: 'USER' }),
    ).rejects.toThrow('不可退');
  });

  it('退款回调幂等：重复 SUCCESS 不重复释放库存', async () => {
    const { trip } = await createFixtureTrip(10, '10:00', departureIn(48).serviceDate);
    const order = await orderService.createOrder(userId, orderInput(trip.id, 1));
    await payOrder(order.id, order.totalAmountCents);

    const ticketId = order.tickets[0].id;
    const refund = await refundService.request({
      orderId: order.id,
      ticketIds: [ticketId],
      operatorType: 'USER',
    });
    await refundService.handleRefundResult({ refundNo: refund!.refundNo, refundStatus: 'SUCCESS' });
    const again = await refundService.handleRefundResult({
      refundNo: refund!.refundNo,
      refundStatus: 'SUCCESS',
    });
    expect(again.idempotent).toBe(true);

    const tripAfter = await prisma.trip.findUniqueOrThrow({ where: { id: trip.id } });
    expect(tripAfter.soldSeats).toBe(0); // 只释放一次
    const refundAfter = await prisma.refund.findUniqueOrThrow({
      where: { refundNo: refund!.refundNo },
    });
    expect(refundAfter.status).toBe('SUCCESS');
  });

  it('退款网关调用失败：退款单 FAILED、票回 UNUSED、订单回到可退', async () => {
    const { trip } = await createFixtureTrip(10, '10:00', departureIn(48).serviceDate);
    const order = await orderService.createOrder(userId, orderInput(trip.id, 1));
    await payOrder(order.id, order.totalAmountCents);

    const original = wechatPayStub.refund;
    wechatPayStub.refund = async () => {
      throw new Error('mock gateway down');
    };
    try {
      await expect(
        refundService.request({
          orderId: order.id,
          ticketIds: [order.tickets[0].id],
          operatorType: 'USER',
        }),
      ).rejects.toThrow('mock gateway down');
    } finally {
      wechatPayStub.refund = original;
    }

    const after = await prisma.order.findUnique({
      where: { id: order.id },
      include: { tickets: true, refunds: true },
    });
    expect(after!.payStatus).toBe('PAID');
    expect(after!.orderStatus).toBe('PAID');
    expect(after!.tickets[0].status).toBe('UNUSED');
    expect(after!.refunds[0].status).toBe('FAILED');
    expect(after!.refunds[0].failReason).toContain('mock gateway down');
  });

  it('超时竞态：CLOSED+PAID 自动全额退款成功后订单保持 CLOSED', async () => {
    const { trip } = await createFixtureTrip(10, '10:00', departureIn(48).serviceDate);
    const order = await orderService.createOrder(userId, orderInput(trip.id, 1));
    // 人为过期并触发超时关闭
    await prisma.order.update({
      where: { id: order.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await orderService.closeExpiredOrders();
    const closed = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(closed.orderStatus).toBe('CLOSED');

    // 迟到的支付回调（竞态）
    await payOrder(order.id, order.totalAmountCents);
    const raced = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(raced.payStatus).toBe('CLOSED'); // handlePaymentSuccess 竞态分支不改订单状态
    // 竞态下支付流水已落库（payment PAID）
    const payment = await prisma.payment.findUniqueOrThrow({ where: { orderId: order.id } });
    expect(payment.status).toBe('PAID');

    // 自动全额退款（生产由回调侧触发）
    const auto = await refundService.autoRefundClosedOrder(order.id);
    expect(auto.skipped).toBeNull();
    await refundService.handleRefundResult({
      refundNo: auto.refundNo!,
      refundStatus: 'SUCCESS',
    });

    const final = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(final.orderStatus).toBe('CLOSED'); // 保持 CLOSED
    expect(final.payStatus).toBe('REFUNDED');
    const refund = await prisma.refund.findUniqueOrThrow({ where: { refundNo: auto.refundNo! } });
    expect(refund.status).toBe('SUCCESS');
    expect(refund.amountCents).toBe(order.totalAmountCents);
    expect(refund.operatorType).toBe('SYSTEM');

    // 幂等：再次自动退款被跳过
    const twice = await refundService.autoRefundClosedOrder(order.id);
    expect(twice.skipped).toBe('refund_exists');
  });
});
