import { Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { ConfigController } from './config.controller';

@Module({
  controllers: [ConfigController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
