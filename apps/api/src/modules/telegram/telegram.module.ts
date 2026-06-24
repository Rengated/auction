import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { AUCTION_QUEUE } from '../auction-engine/auction.constants';
import { SettingsModule } from '../settings/settings.module';
import { MetricsService } from './metrics.service';
import { TelegramService } from './telegram.service';

@Global()
@Module({
  imports: [SettingsModule, BullModule.registerQueue({ name: AUCTION_QUEUE })],
  providers: [TelegramService, MetricsService],
  exports: [TelegramService],
})
export class TelegramModule {}
