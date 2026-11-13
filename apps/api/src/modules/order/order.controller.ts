import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  NotFoundException,
  Param,
  Post,
  Query,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { CreateOrderSchema } from '@sanqin/shared';
import { CurrentUser } from '../auth/decorators/decorators';
import { JwtAuthGuard } from '../../core/guards/jwt.guard';
import { OrderService } from './order.service';
import { PaymentService } from '../payment/services/payment.service';
import { WechatPayService } from '../payment/services/wechat-pay.service';
import { WxacodeService } from '../wechat/wxacode.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createTicketToken } from './ticket-token';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly prisma: PrismaService,
    private readonly wechatPayService: WechatPayService,
    private readonly paymentService: PaymentService,
    private readonly wxacodeService: WxacodeService,
  ) {}

  @Post()
  async create(
    @CurrentUser() user: any,
    @Body() body: unknown,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    const input = CreateOrderSchema.parse(body);
    return this.orderService.createOrder(user.id, input, idempotencyKey);
  }

  @Get()
  async list(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const result = await this.orderService.listUserOrders(
      user.id,
      Number(page) || 1,
      Number(pageSize) || 20,
    );
    return { success: true, data: result.items, meta: result };
  }

  @Get(':id')
  async detail(@CurrentUser() user: any, @Param('id') id: string) {
    const order = await this.orderService.getUserOrder(user.id, id);
    return {
      success: true,
      data: {
        ...order,
        tickets: order.tickets.map((ticket) => ({
          ...ticket,
          // 二维码有效期覆盖到发车时刻 + 默认 TTL，避免发车前被提前扫失效
          qrToken: createTicketToken(ticket.id, order.tripId, ticketTokenExpireAt(order.trip)),
        })),
      },
    };
  }

  /**
   * 车票微信小程序码（scene=核销码，核票员微信扫一扫直达核验页）。
   * 按 ticket 永久缓存于 WxacodeService；微信侧配置缺失/接口失败时返回 503，
   * 小程序端回退本地 HMAC 二维码矩阵。
   */
  @Get(':id/tickets/:ticketId/wxacode')
  async ticketWxacode(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Param('ticketId') ticketId: string,
  ) {
    const order = await this.orderService.getUserOrder(user.id, id);
    const ticket = order.tickets.find((item) => item.id === ticketId);
    if (!ticket) throw new NotFoundException('车票不存在');
    try {
      const image = await this.wxacodeService.getOrGenerateDataUrl(ticket.checkCode);
      return { success: true, data: { image } };
    } catch (error: any) {
      throw new ServiceUnavailableException(`小程序码生成失败: ${error?.message || '未知错误'}`);
    }
  }

  @Post(':id/mock-pay')
  async mockPay(@CurrentUser() user: any, @Param('id') id: string) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('生产环境不允许模拟支付');
    }
    const order = await this.orderService.getPayableOrder(user.id, id);
    return { success: true, data: await this.paymentService.mockPaymentSuccess(order.id) };
  }

  @Post(':id/prepay')
  async prepay(@CurrentUser() user: any, @Param('id') id: string) {
    const order = await this.orderService.getPayableOrder(user.id, id);
    const dbUser = await this.prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser?.openid) throw new Error('当前微信用户缺少 openid，无法发起支付');

    const payment = await this.paymentService.getOrCreatePendingPayment(order);
    const prepayId = await this.wechatPayService.createOrder({
      orderId: order.id,
      orderNo: payment.outTradeNo,
      amount: order.totalAmountCents / 100,
      description: `桥水出行 ${order.orderNo}`,
      openid: dbUser.openid,
    });
    const payParams = this.wechatPayService.getPayParams(prepayId);
    return { success: true, data: { paymentNo: payment.paymentNo, ...payParams } };
  }
}

/**
 * 电子票二维码过期时刻 = 发车时间 + 默认 TTL（发车后一段时间内仍可补检）。
 */
function ticketTokenExpireAt(trip: { serviceDate: string; departureTime: string } | null): number {
  const fallback = Date.now() + 7 * 24 * 60 * 60 * 1000;
  if (!trip?.serviceDate || !trip?.departureTime) return fallback;
  const departure = new Date(`${trip.serviceDate}T${trip.departureTime}:00`).getTime();
  if (Number.isNaN(departure)) return fallback;
  return departure + 12 * 60 * 60 * 1000;
}
