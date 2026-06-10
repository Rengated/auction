import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SettingsModule } from '../settings/settings.module';
import { AUCTION_QUEUE, LifecycleService } from './lifecycle.service';
import { AuctionProcessor } from './auction.processor';
import { BidService } from './bid.service';
import { BidsController } from './bids.controller';
import { MyBidsService } from './my-bids.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: AUCTION_QUEUE }),
    AuthModule,
    SettingsModule,
    NotificationsModule,
  ],
  controllers: [BidsController],
  providers: [BidService, LifecycleService, AuctionProcessor, MyBidsService],
  exports: [BidService, LifecycleService],
})
export class AuctionEngineModule {}
