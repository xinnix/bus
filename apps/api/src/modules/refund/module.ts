import { Module } from '@nestjs/common';
import { PaymentModule } from '../payment/module';
import { RefundService } from './refund.service';

@Module({
  imports: [PaymentModule],
  providers: [RefundService],
  exports: [RefundService],
})
export class RefundModule {}
