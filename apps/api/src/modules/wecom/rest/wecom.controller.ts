import { Controller, Get, Post, Param, Query, Req, Res, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { Public } from '../../auth/decorators/decorators';
import { WecomCryptoService } from '../services/wecom-crypto.service';
import { WecomConfigService } from '../services/wecom-config.service';
import { WecomMessageService } from '../services/wecom-message.service';
import { WecomEventService } from '../services/wecom-event.service';

@Controller('wecom')
export class WecomController {
  private readonly logger = new Logger(WecomController.name);

  constructor(
    private readonly wecomCryptoService: WecomCryptoService,
    private readonly wecomConfigService: WecomConfigService,
    private readonly wecomMessageService: WecomMessageService,
    private readonly wecomEventService: WecomEventService,
  ) {}

  /**
   * 回调 URL 验证（GET）
   * 企业微信配置回调 URL 时发送 GET 请求验证
   * 1. 验证签名: SHA1(sort([token, timestamp, nonce])) == msg_signature
   * 2. 解密 echostr: AES-256-CBC
   * 3. 返回解密后的明文 echostr
   */
  @Public()
  @Get('callback/:configId')
  async verifyCallback(
    @Param('configId') configId: string,
    @Query('msg_signature') msgSignature: string,
    @Query('timestamp') timestamp: string,
    @Query('nonce') nonce: string,
    @Query('echostr') echostr: string,
    @Res() res: Response,
  ) {
    try {
      const config = await this.wecomConfigService.getOneOrThrow(configId);

      const valid = this.wecomCryptoService.verifySignature(
        config.token,
        timestamp,
        nonce,
        msgSignature,
      );
      if (!valid) {
        this.logger.warn(`回调验证签名失败: configId=${configId}`);
        return res.status(403).send('signature verification failed');
      }

      const decrypted = this.wecomCryptoService.decryptMessage(
        config.encodingAESKey,
        config.corpId,
        echostr,
      );

      this.logger.log(`回调验证成功: configId=${configId}`);
      res.set('Content-Type', 'text/plain');
      res.send(decrypted);
    } catch (error: any) {
      this.logger.error(`回调验证异常: configId=${configId}`, error);
      if (!res.headersSent) {
        res.status(500).send('verification failed');
      }
    }
  }

  /**
   * 接收消息/事件回调（POST）
   * 企业微信推送消息或事件时发送 POST 请求
   * 1. 验证签名（含加密内容）
   * 2. 解密消息内容
   * 3. 解析 XML，区分消息和事件
   * 4. 写入数据库日志
   * 5. 返回 "success"
   */
  @Public()
  @Post('callback/:configId')
  async receiveCallback(
    @Param('configId') configId: string,
    @Query('msg_signature') msgSignature: string,
    @Query('timestamp') timestamp: string,
    @Query('nonce') nonce: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const rawBody = (req as any).rawBody;
    if (!rawBody) {
      this.logger.error('回调缺少 rawBody');
      return res.status(400).send('missing rawBody');
    }

    try {
      const config = await this.wecomConfigService.getOneOrThrow(configId);

      const encrypt = this.wecomCryptoService.extractEncryptFromXml(rawBody);

      const valid = this.wecomCryptoService.verifySignatureWithEncrypt(
        config.token,
        timestamp,
        nonce,
        encrypt,
        msgSignature,
      );
      if (!valid) {
        this.logger.warn(`消息回调签名验证失败: configId=${configId}`);
        return res.status(403).send('signature verification failed');
      }

      const plainXml = this.wecomCryptoService.decryptMessage(
        config.encodingAESKey,
        config.corpId,
        encrypt,
      );

      const parsed = this.wecomCryptoService.parseXml(plainXml);

      if (parsed.MsgType === 'event') {
        await this.wecomEventService.logEvent({
          configId,
          eventType: parsed.Event || 'unknown',
          eventKey: parsed.EventKey,
          fromUser: parsed.FromUserName,
          content: JSON.stringify(parsed),
          rawXml: plainXml,
        });
        this.logger.log(
          `收到事件: configId=${configId}, event=${parsed.Event}, from=${parsed.FromUserName}`,
        );
      } else {
        await this.wecomMessageService.logReceived({
          configId,
          msgType: parsed.MsgType || 'unknown',
          fromUser: parsed.FromUserName,
          toUser: parsed.ToUserName,
          content: parsed.Content || JSON.stringify(parsed),
          rawXml: plainXml,
        });
        this.logger.log(
          `收到消息: configId=${configId}, type=${parsed.MsgType}, from=${parsed.FromUserName}`,
        );
      }

      res.set('Content-Type', 'text/plain');
      res.send('success');
    } catch (error: any) {
      this.logger.error(`消息回调处理异常: configId=${configId}`, error);
      if (!res.headersSent) {
        res.status(500).send('processing failed');
      }
    }
  }
}
