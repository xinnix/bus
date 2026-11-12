import { Injectable } from '@nestjs/common';
import { BaseService } from '../../../common/base.service';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class WecomConfigService extends BaseService<'wecomConfig'> {
  constructor(prisma: PrismaService) {
    super(prisma, 'wecomConfig');
  }

  async findByCorpIdAndAgentId(corpId: string, agentId: number) {
    return this.model.findFirst({
      where: { corpId, agentId, isActive: true },
    });
  }

  maskSecret(config: any): any {
    if (!config) return config;
    return {
      ...config,
      secret: this.maskValue(config.secret),
      encodingAESKey: this.maskValue(config.encodingAESKey),
    };
  }

  maskSecrets(configs: any[]): any[] {
    return configs.map((c) => this.maskSecret(c));
  }

  private maskValue(value: string): string {
    if (!value || value.length <= 4) return '****';
    return `${value.slice(0, 4)}****`;
  }
}
