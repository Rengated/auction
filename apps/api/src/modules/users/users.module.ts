import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersController } from './users.controller';

@Module({
  imports: [NotificationsModule],
  controllers: [UsersController],
})
export class UsersModule {}
