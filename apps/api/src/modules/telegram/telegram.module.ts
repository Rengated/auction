import { Global, Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { TelegramService } from './telegram.service';

@Global()
@Module({
  imports: [SettingsModule],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
