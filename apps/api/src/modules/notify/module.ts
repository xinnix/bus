import { Module } from '@nestjs/common';
import { WechatModule } from '../wechat/wechat.module';
import { NotifyService } from './notify.service';
import { SubscribeController } from './subscribe.controller';

@Module({
  imports: [WechatModule],
  controllers: [SubscribeController],
  providers: [NotifyService],
  exports: [NotifyService],
})
export class NotifyModule {}
