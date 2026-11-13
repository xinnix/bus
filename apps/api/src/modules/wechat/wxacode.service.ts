import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import * as path from 'path';
import { WechatService } from './wechat.service';

/** 小程序码缓存条目的磁盘文件名清洗（page 路径含 / 等字符） */
function safeName(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]/g, '_');
}

/**
 * 小程序码出图服务：按 scene 生成并缓存（内存 → 磁盘 → 微信 API）。
 *
 * 电子票场景 scene = 6 位核销码（≤32 可见字符、与票一一且永久绑定），
 * 生成一次后无需再调微信接口。跳转页面与环境版本由 WXACODE_PAGE /
 * WXACODE_ENV_VERSION 配置。
 */
@Injectable()
export class WxacodeService {
  private readonly logger = new Logger(WxacodeService.name);
  /** 内存缓存：key = page_env_scene */
  private readonly memory = new Map<string, Buffer>();
  private readonly cacheDir = path.resolve(process.cwd(), '.cache', 'wxacode');
  private readonly page: string;
  /** release 时不显式传 env_version（微信默认即 release） */
  private readonly envVersion?: 'release' | 'trial' | 'develop';

  constructor(
    private readonly configService: ConfigService,
    private readonly wechatService: WechatService,
  ) {
    this.page = this.configService.get<string>('WXACODE_PAGE') || 'pages/checker/index';
    const env = this.configService.get<string>('WXACODE_ENV_VERSION');
    if (env === 'trial' || env === 'develop') this.envVersion = env;
  }

  /**
   * 取小程序码 dataURL（优先缓存）。微信 getUnlimited 实际返回 JPEG，
   * 按字节魔数嗅探 MIME，客户端 <image> 直接可用。
   * @param scene 场景值，≤32 个可见字符（电子票用 6 位核销码）
   */
  async getOrGenerateDataUrl(scene: string): Promise<string> {
    return this.toDataUrl(await this.getOrGenerate(scene));
  }

  private async getOrGenerate(scene: string): Promise<Buffer> {
    if (!/^[A-Za-z0-9]{1,32}$/.test(scene)) {
      throw new BadRequestException('小程序码 scene 不合法（限 32 位字母数字）');
    }
    const key = `${safeName(this.page)}_${this.envVersion || 'release'}_${scene}`;

    const cached = this.memory.get(key);
    if (cached) return cached;

    const file = path.join(this.cacheDir, `${key}.img`);
    try {
      const fromDisk = await fs.readFile(file);
      this.memory.set(key, fromDisk);
      return fromDisk;
    } catch {
      // 未命中磁盘缓存，走微信生成
    }

    // checkPath=false：未发布/体验版没有目标页面也允许出图（扫码打开行为由 env_version 决定）
    const buffer = await this.wechatService.generateMiniProgramCode(scene, this.page, {
      envVersion: this.envVersion,
      checkPath: false,
    });
    await fs.mkdir(this.cacheDir, { recursive: true });
    await fs.writeFile(file, buffer);
    this.memory.set(key, buffer);
    this.logger.log(
      `小程序码已生成并缓存 scene=${scene} page=${this.page} env=${this.envVersion || 'release'}`,
    );
    return buffer;
  }

  private toDataUrl(buffer: Buffer): string {
    const isPng = buffer.length > 8 && buffer[0] === 0x89 && buffer[1] === 0x50;
    const mime = isPng ? 'image/png' : 'image/jpeg';
    return `data:${mime};base64,${buffer.toString('base64')}`;
  }
}
