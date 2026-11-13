import { Module } from '@nestjs/common';
import { WechatService } from './wechat.service';
import { WxacodeService } from './wxacode.service';

@Module({
  providers: [WechatService, WxacodeService],
  exports: [WechatService, WxacodeService],
})
export class WechatModule {}
