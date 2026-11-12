import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Prisma 模块 - 提供 PrismaService
 *
 * 使用 @Global() 装饰器使 PrismaService 在整个应用中可用，
 * 无需在每个功能模块中重复声明或导入。
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
