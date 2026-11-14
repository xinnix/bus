import { Module } from '@nestjs/common';
import { CheckerTripService } from './checker-trip.service';
import { CheckinController } from './checkin.controller';
import { CheckinService } from './checkin.service';

@Module({
  controllers: [CheckinController],
  providers: [CheckinService, CheckerTripService],
  exports: [CheckinService],
})
export class CheckinModule {}
