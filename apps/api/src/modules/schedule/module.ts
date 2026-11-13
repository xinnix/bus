import { Module } from '@nestjs/common';
import { TripsController } from './trips.controller';

/**
 * 班次模板与班次管理模块（P0）
 * - Admin: tRPC scheduleTemplate / trip router（见 app.router.ts）
 * - 小程序: REST /trips/:id
 */
@Module({
  controllers: [TripsController],
})
export class TicketScheduleModule {}
