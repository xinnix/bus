import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../core/guards/jwt.guard';
import { SettingsService } from '../../shared/settings/settings.service';

/**
 * 订阅消息模板下发：小程序据此调用 uni.requestSubscribeMessage 申请订阅授权。
 * 未启用或未配置模板时返回 null，小程序端静默跳过授权弹窗。
 */
@Controller('subscribe')
@UseGuards(JwtAuthGuard)
export class SubscribeController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('templates')
  async templates() {
    const enabled = this.settingsService.get('SUBSCRIBE_ENABLED') === 'true';
    return {
      success: true,
      data: {
        enabled,
        paidTemplateId: enabled
          ? this.settingsService.get('SUBSCRIBE_TEMPLATE_PAID') || null
          : null,
        departureTemplateId: enabled
          ? this.settingsService.get('SUBSCRIBE_TEMPLATE_DEPARTURE') || null
          : null,
      },
    };
  }
}
