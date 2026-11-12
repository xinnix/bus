import { Injectable } from '@nestjs/common';
import { BaseService } from '../../../common/base.service';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class WecomMessageService extends BaseService<'wecomMessage'> {
  constructor(prisma: PrismaService) {
    super(prisma, 'wecomMessage');
  }

  async logReceived(data: {
    configId: string;
    msgType: string;
    fromUser?: string;
    toUser?: string;
    content?: string;
    rawXml?: string;
  }) {
    return this.model.create({
      data: {
        configId: data.configId,
        direction: 'received',
        msgType: data.msgType,
        fromUser: data.fromUser,
        toUser: data.toUser,
        content: data.content,
        rawXml: data.rawXml,
      },
    });
  }

  async logSent(data: {
    configId: string;
    msgType: string;
    fromUser?: string;
    toUser?: string;
    content?: string;
  }) {
    return this.model.create({
      data: {
        configId: data.configId,
        direction: 'sent',
        msgType: data.msgType,
        fromUser: data.fromUser,
        toUser: data.toUser,
        content: data.content,
      },
    });
  }
}
