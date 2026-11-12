import { Module } from '@nestjs/common';
import { WechatPayService } from './services/wechat-pay.service';
import { PaymentController } from './rest/payment.controller';
import { RedisService } from '../../shared/services/redis.service';

@Module({
  imports: [],
  controllers: [PaymentController],
  providers: [WechatPayService, RedisService],
  exports: [WechatPayService],
})
export class PaymentModule {}
