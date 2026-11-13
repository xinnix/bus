import { Module } from '@nestjs/common';
import { LineController } from './line.controller';

/**
 * 线路管理模块（P0）
 * - Admin: tRPC line router（见 app.router.ts）
 * - 小程序: REST /lines
 */
@Module({
  controllers: [LineController],
})
export class LineModule {}
