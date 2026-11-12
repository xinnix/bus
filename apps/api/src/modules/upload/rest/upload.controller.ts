import { Controller, Post, UseInterceptors, UploadedFile, Body, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../../core/guards/jwt.guard';
import { UploadService } from '../services/upload.service';

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  /**
   * 上传头像
   */
  @Post('avatar')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(@UploadedFile() file: any, @Body('userId') userId: string) {
    const result = await this.uploadService.uploadFile(file, 'avatars');
    return {
      success: true,
      data: result,
    };
  }

  /**
   * 通用文件上传
   */
  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@UploadedFile() file: any, @Body('type') type: string = 'general') {
    const result = await this.uploadService.uploadFile(file, type);
    return {
      success: true,
      data: result,
    };
  }
}
