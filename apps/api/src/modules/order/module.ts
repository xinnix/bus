import { Module } from '@nestjs/common';
import { PaymentModule } from '../payment/module';
import { RefundModule } from '../refund/module';
import { WechatModule } from '../wechat/wechat.module';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';

@Module({
  imports: [PaymentModule, RefundModule, WechatModule],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
