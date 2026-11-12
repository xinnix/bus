import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileStorageService } from '../../../shared/services/file-storage.service';

@Injectable()
export class UploadService {
  constructor(
    private configService: ConfigService,
    private fileStorage: FileStorageService,
  ) {}

  /**
   * 获取上传凭证（用于客户端直传）
   */
  async getUploadCredentials(type: string) {
    const dirPath = `images/${type}`;
    const credentials = await this.fileStorage.getUploadCredentials(dirPath);
    return credentials;
  }

  /**
   * 服务端上传文件（备用方案）
   */
  async uploadFile(file: any, type: string) {
    // 验证文件类型
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new Error('仅支持 JPG、PNG、GIF、WEBP 格式的图片');
    }

    // 验证文件大小（5MB）
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error('图片大小不能超过 5MB');
    }

    const dirPath = `images/${type}`;
    const result = await this.fileStorage.upload(file, dirPath);

    return {
      url: result.url,
      fileName: result.fileName,
      fileSize: result.fileSize,
    };
  }
}
