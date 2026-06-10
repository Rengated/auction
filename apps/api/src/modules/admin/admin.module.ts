import { Module } from '@nestjs/common';
import { AuctionEngineModule } from '../auction-engine/auction-engine.module';
import { SettingsModule } from '../settings/settings.module';
import { AdminAuctionController } from './admin-auction.controller';
import { AdminLotsController } from './admin-lots.controller';
import {
  AdminDashboardController,
  AdminDealsController,
  AdminSellRequestsController,
  AdminSettingsController,
  AdminUsersController,
} from './admin-misc.controllers';
import { MediaService } from './media.service';

@Module({
  imports: [AuctionEngineModule, SettingsModule],
  controllers: [
    AdminLotsController,
    AdminAuctionController,
    AdminDealsController,
    AdminUsersController,
    AdminSettingsController,
    AdminDashboardController,
    AdminSellRequestsController,
  ],
  providers: [MediaService],
})
export class AdminModule {}
