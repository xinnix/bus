import { Module } from '@nestjs/common';
import { NotifyModule } from '../notify/module';
import { WechatPayService } from './services/wechat-pay.service';
import { PaymentService } from './services/payment.service';
import { PaymentController } from './rest/payment.controller';
import { RedisService } from '../../shared/services/redis.service';

@Module({
  imports: [NotifyModule],
  controllers: [PaymentController],
  providers: [WechatPayService, PaymentService, RedisService],
  exports: [WechatPayService, PaymentService],
})
export class PaymentModule {}
