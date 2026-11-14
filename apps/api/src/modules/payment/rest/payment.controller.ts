import {
  Controller,
  Get,
  Post,
  Param,
  Req,
  Res,
  Headers,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { WechatPayService } from '../services/wechat-pay.service';
import { PaymentService } from '../services/payment.service';
import { getRefundService } from '../../refund/refund.bridge';

@Controller('payments')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(
    private readonly wechatPayService: WechatPayService,
    private readonly paymentService: PaymentService,
  ) {}

  /**
   * 微信支付回调通知
   * 微信服务器在用户支付成功后主动调用此接口。
   * 无需 JWT 认证，通过签名验证确保请求来自微信。
   */
  @Post('wechat/callback')
  async wechatCallback(
    @Req() req: Request,
    @Res() res: Response,
    @Headers() headers: Record<string, string>,
  ) {
    const rawBody = (req as any).rawBody;

    if (!rawBody) {
      this.logger.error('回调缺少 rawBody');
      return res.status(500).json({ code: 'FAIL', message: '缺少请求体' });
    }

    try {
      const payment = await this.wechatPayService.handleCallback(rawBody, {
        'wechatpay-timestamp': headers['wechatpay-timestamp'],
        'wechatpay-nonce': headers['wechatpay-nonce'],
        'wechatpay-signature': headers['wechatpay-signature'],
        'wechatpay-serial': headers['wechatpay-serial'],
      });

      const handled = await this.paymentService.handlePaymentSuccess({
        orderId: payment.orderId,
        orderNo: payment.orderNo,
        transactionId: payment.transactionId,
        amount: payment.amount,
        paidAt: payment.paidAt,
        // 留存微信原始通知报文，便于对账排查
        rawNotify: JSON.parse(rawBody.toString('utf8')),
      });
      if (!handled.handled) {
        this.logger.error(`支付回调业务处理失败: ${JSON.stringify(handled)}`);
        return res.status(500).json({ code: 'FAIL', message: handled.reason || '处理失败' });
      }

      res.status(200).send();
      this.logger.log(`支付回调验签成功: ${payment.orderId} → ${payment.transactionId}`);

      // 竞态兜底：回调到达前订单已被超时任务关闭（钱已收、票已取消）→ 自动全额退款
      if (handled.orderClosed) {
        try {
          const result = await getRefundService().autoRefundClosedOrder(payment.orderId);
          this.logger.log(`竞态自动退款结果: ${JSON.stringify(result)}`);
        } catch (refundError: any) {
          this.logger.error(
            `竞态自动退款失败 order=${payment.orderId}（退款单可能已建立，可管理端重试）: ${refundError?.message}`,
          );
        }
      }
    } catch (error: any) {
      this.logger.error('支付回调处理失败', error);
      if (!res.headersSent) {
        res.status(500).json({ code: 'FAIL', message: '处理失败' });
      }
    }
  }

  /**
   * 微信退款回调通知
   */
  @Post('wechat/refund-callback')
  async refundCallback(
    @Req() req: Request,
    @Res() res: Response,
    @Headers() headers: Record<string, string>,
  ) {
    const rawBody = (req as any).rawBody;

    if (!rawBody) {
      this.logger.error('退款回调缺少 rawBody');
      return res.status(500).json({ code: 'FAIL', message: '缺少请求体' });
    }

    try {
      const refund = await this.wechatPayService.handleRefundCallback(rawBody, {
        'wechatpay-timestamp': headers['wechatpay-timestamp'],
        'wechatpay-nonce': headers['wechatpay-nonce'],
        'wechatpay-signature': headers['wechatpay-signature'],
        'wechatpay-serial': headers['wechatpay-serial'],
      });

      // 业务落地（幂等）：SUCCESS → 票 REFUNDED + 释放库存 + 订单聚合；非 SUCCESS → FAILED 留人工。
      // 处理失败返回 500 让微信重投（handleRefundResult 幂等，重投安全）。
      await getRefundService().handleRefundResult({
        refundNo: refund.refundNo,
        refundStatus: refund.refundStatus,
        gatewayRefundNo: refund.refundId,
        refundedAt: refund.refundedAt,
      });

      res.status(200).send();
      this.logger.log(
        `退款回调验签成功: ${refund.orderNo} refundNo=${refund.refundNo} status=${refund.refundStatus}`,
      );
    } catch (error: any) {
      this.logger.error('退款回调处理失败', error);
      if (!res.headersSent) {
        res.status(500).json({ code: 'FAIL', message: '处理失败' });
      }
    }
  }

  /**
   * 主动查询微信支付订单状态
   */
  @Get('status/:orderNo')
  async getStatus(@Param('orderNo') orderNo: string) {
    if (!orderNo) {
      throw new BadRequestException('订单号不能为空');
    }

    try {
      const result = await this.wechatPayService.queryOrder(orderNo);
      return { status: result.status, transactionId: result.transactionId };
    } catch (error: any) {
      this.logger.error(`查询订单状态失败: ${orderNo}`, error);
      throw new BadRequestException('查询订单状态失败');
    }
  }
}
