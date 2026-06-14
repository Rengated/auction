import { Module } from '@nestjs/common';
import { AuctionEngineModule } from '../auction-engine/auction-engine.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SettingsModule } from '../settings/settings.module';
import { AdminAddressesController } from './admin-addresses.controller';
import { AdminAuctionController } from './admin-auction.controller';
import { AdminLotsController } from './admin-lots.controller';
import {
  AdminDashboardController,
  AdminDealsController,
  AdminSettingsController,
  AdminUsersController,
} from './admin-misc.controllers';
import { MediaService } from './media.service';

@Module({
  imports: [AuctionEngineModule, SettingsModule, NotificationsModule],
  controllers: [
    AdminLotsController,
    AdminAddressesController,
    AdminAuctionController,
    AdminDealsController,
    AdminUsersController,
    AdminSettingsController,
    AdminDashboardController,
  ],
  providers: [MediaService],
})
export class AdminModule {}
