import { Module } from '@nestjs/common';
import { UserController } from './rest/user.controller';

@Module({
  controllers: [UserController],
  providers: [],
  exports: [],
})
export class UserModule {}
