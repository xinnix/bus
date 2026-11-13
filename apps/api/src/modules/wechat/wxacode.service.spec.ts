import { BadRequestException } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WxacodeService } from './wxacode.service';

describe('wxacode.service', () => {
  const config = {
    get: vi.fn((key: string) => (key === 'WXACODE_PAGE' ? 'pages/checker/index' : undefined)),
  };
  const generate = vi.fn(async () => Buffer.from('png-bytes'));
  let cacheDir: string;

  const createService = () => {
    const service = new WxacodeService(config as any, { generateMiniProgramCode: generate } as any);
    // 测试隔离：缓存目录指向临时目录
    (service as any).cacheDir = cacheDir;
    return service;
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    cacheDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wxacode-test-'));
  });

  it('scene 超长或含非法字符时拒绝', async () => {
    const service = createService();
    await expect(service.getOrGenerateDataUrl('a'.repeat(33))).rejects.toThrow(BadRequestException);
    await expect(service.getOrGenerateDataUrl('has space')).rejects.toThrow(BadRequestException);
  });

  it('首次生成调用微信，随后命中内存缓存不再调用', async () => {
    const service = createService();
    const first = await service.getOrGenerateDataUrl('123456');
    expect(generate).toHaveBeenCalledTimes(1);
    const second = await service.getOrGenerateDataUrl('123456');
    expect(second).toBe(first);
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('新实例命中磁盘缓存，不再调用微信；dataURL 按 JPEG 魔数嗅探', async () => {
    const first = createService();
    await first.getOrGenerateDataUrl('654321');
    generate.mockClear();

    const second = createService();
    const dataUrl = await second.getOrGenerateDataUrl('654321');
    expect(dataUrl).toMatch(/^data:image\/jpeg;base64,/);
    expect(generate).not.toHaveBeenCalled();
  });
});
