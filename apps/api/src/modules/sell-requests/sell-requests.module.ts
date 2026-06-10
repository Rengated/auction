import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SellRequestsController } from './sell-requests.controller';

@Module({
  imports: [AuthModule],
  controllers: [SellRequestsController],
})
export class SellRequestsModule {}
