import { Module } from '@nestjs/common';
import { AuctionEngineModule } from '../auction-engine/auction-engine.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SettingsModule } from '../settings/settings.module';
import { AdminAddressesController } from './admin-addresses.controller';
import { AdminAuctionController } from './admin-auction.controller';
import { AdminLotsController } from './admin-lots.controller';
import {
  AdminDashboardController,
  AdminDealsController,
  AdminSettingsController,
  AdminStaffController,
  AdminUsersController,
} from './admin-misc.controllers';
import { MediaModule } from './media.module';
import { AutotekaImportService } from './autoteka-import.service';

@Module({
  imports: [AuctionEngineModule, AuthModule, SettingsModule, NotificationsModule, MediaModule],
  controllers: [
    AdminLotsController,
    AdminAddressesController,
    AdminAuctionController,
    AdminDealsController,
    AdminUsersController,
    AdminStaffController,
    AdminSettingsController,
    AdminDashboardController,
  ],
  providers: [AutotekaImportService],
})
export class AdminModule {}
