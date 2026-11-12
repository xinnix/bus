import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface WechatSessionResponse {
  openid: string;
  session_key: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

@Injectable()
export class WechatService {
  private readonly logger = new Logger(WechatService.name);
  private readonly appId: string;
  private readonly appSecret: string;

  // access_token 内存缓存
  private accessTokenCache?: string;
  private accessTokenExpiresAt?: number;

  constructor(private configService: ConfigService) {
    this.appId = this.configService.get<string>('WX_APP_ID')!;
    this.appSecret = this.configService.get<string>('WX_APP_SECRET')!;
  }

  /**
   * 通过 code 换取 openid 和 session_key
   * 文档: https://developers.weixin.qq.com/miniprogram/dev/api-backend/open-api/login/auth.code2Session.html
   */
  async code2Session(code: string): Promise<{
    openid: string;
    sessionKey: string;
    unionid?: string;
  }> {
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${this.appId}&secret=${this.appSecret}&js_code=${code}&grant_type=authorization_code`;

    try {
      const response = await fetch(url);
      const data: WechatSessionResponse = await response.json();

      if (data.errcode) {
        throw new Error(`微信登录失败: ${data.errmsg}`);
      }

      return {
        openid: data.openid,
        sessionKey: data.session_key,
        unionid: data.unionid,
      };
    } catch (error) {
      this.logger.error('微信 code2Session 失败', error);
      throw error;
    }
  }

  /**
   * 解密微信手机号数据（旧版，已废弃）
   * 文档: https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/signature.html#%E5%8A%A0%E5%AF%86%E6%95%B0%E6%8D%AE%E8%A7%A3%E5%AF%86%E7%AE%97%E6%B3%95
   */
  async decryptPhoneNumber(
    encryptedData: string,
    iv: string,
    sessionKey: string,
  ): Promise<{ phoneNumber: string; watermark: any }> {
    const crypto = require('crypto');

    try {
      const decipher = crypto.createDecipheriv(
        'aes-128-cbc',
        Buffer.from(sessionKey, 'base64'),
        Buffer.from(iv, 'base64'),
      );

      let decoded = decipher.update(Buffer.from(encryptedData, 'base64'));
      decoded = Buffer.concat([decoded, decipher.final()]);

      const data = JSON.parse(decoded.toString());

      // 验证 watermark
      if (data.watermark.appid !== this.appId) {
        throw new Error('水印验证失败：appid 不匹配');
      }

      return {
        phoneNumber: data.phoneNumber,
        watermark: data.watermark,
      };
    } catch (error) {
      this.logger.error('手机号解密失败', error);
      throw new Error('手机号解密失败');
    }
  }

  /**
   * 获取用户手机号（新版 API，2023年后推荐）
   * 文档: https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/user-info/phone-number/getPhoneNumber.html
   */
  async getPhoneNumber(code: string): Promise<{
    phoneNumber: string;
    purePhoneNumber: string;
    countryCode: string;
    watermark: any;
  }> {
    const accessToken = await this.getAccessToken();
    const url = `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${accessToken}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (data.errcode !== 0) {
        throw new Error(`获取手机号失败: ${data.errmsg} (errcode: ${data.errcode})`);
      }

      return {
        phoneNumber: data.phone_info.phoneNumber,
        purePhoneNumber: data.phone_info.purePhoneNumber,
        countryCode: data.phone_info.countryCode,
        watermark: data.phone_info.watermark,
      };
    } catch (error) {
      this.logger.error('获取手机号失败', error);
      throw error;
    }
  }

  /**
   * 获取微信 access_token（带内存缓存）
   * 文档: https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/mp-access-token/getAccessToken.html
   */
  async getAccessToken(): Promise<string> {
    // 1. 检查内存缓存
    if (
      this.accessTokenCache &&
      this.accessTokenExpiresAt &&
      this.accessTokenExpiresAt > Date.now()
    ) {
      this.logger.debug('使用缓存的 access_token');
      return this.accessTokenCache;
    }

    // 2. 调用微信 API 获取新 token
    const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${this.appId}&secret=${this.appSecret}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.errcode) {
        throw new Error(`获取 access_token 失败: ${data.errmsg} (errcode: ${data.errcode})`);
      }

      // 3. 缓存到内存（提前 10% 过期，留安全余量）
      const expiresIn = data.expires_in; // 通常 7200 秒
      const cacheExpiresIn = Math.floor(expiresIn * 0.9);
      this.accessTokenCache = data.access_token;
      this.accessTokenExpiresAt = Date.now() + cacheExpiresIn * 1000;

      this.logger.log(`获取新的 access_token 并缓存，有效期 ${cacheExpiresIn} 秒`);
      return data.access_token;
    } catch (error) {
      this.logger.error('获取 access_token 失败', error);
      throw error;
    }
  }

  /**
   * 生成小程序码（无数量限制版本）
   * 文档: https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/qrcode-link/qr-code/getUnlimitedQRCode.html
   *
   * @param sceneId 场景值 ID（最多 32 个可见字符）
   * @param page 扫码后跳转的页面路径（必须与 app.json 中的路径一致，不带 / 前缀）
   * @returns 小程序码图片 Buffer
   */
  async generateMiniProgramCode(
    sceneId: string,
    page: string = 'pages/coupon/detail',
  ): Promise<Buffer> {
    const accessToken = await this.getAccessToken();

    // 构建请求参数
    const requestBody = {
      scene: sceneId, // 场景值 ID（最多 32 个可见字符）
      page, // 扫码后跳转的页面（必须与 app.json 中的路径一致）
      width: 430, // 小程序码宽度
      auto_color: false,
      line_color: { r: 0, g: 0, b: 0 },
      is_hyaline: false, // 不透明背景
    };

    const url = `https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${accessToken}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      // 检查是否返回错误（微信会在 body 中返回 JSON 错误信息）
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        throw new Error(`生成小程序码失败: ${errorData.errmsg} (errcode: ${errorData.errcode})`);
      }

      // 返回二进制图片数据
      const arrayBuffer = await response.arrayBuffer();
      this.logger.log(`成功生成小程序码，大小: ${arrayBuffer.byteLength} bytes`);
      return Buffer.from(arrayBuffer);
    } catch (error) {
      this.logger.error('生成小程序码失败', error);
      throw error;
    }
  }
}
