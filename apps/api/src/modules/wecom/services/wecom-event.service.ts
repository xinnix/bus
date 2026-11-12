import { Injectable } from '@nestjs/common';
import { BaseService } from '../../../common/base.service';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class WecomEventService extends BaseService<'wecomEvent'> {
  constructor(prisma: PrismaService) {
    super(prisma, 'wecomEvent');
  }

  async logEvent(data: {
    configId: string;
    eventType: string;
    eventKey?: string;
    fromUser?: string;
    content?: string;
    rawXml?: string;
  }) {
    return this.model.create({
      data: {
        configId: data.configId,
        eventType: data.eventType,
        eventKey: data.eventKey,
        fromUser: data.fromUser,
        content: data.content,
        rawXml: data.rawXml,
      },
    });
  }
}
