import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { LotsController } from './lots.controller';
import { LotsService } from './lots.service';
import { OgController } from './og.controller';

@Module({
  imports: [SettingsModule],
  controllers: [LotsController, OgController],
  providers: [LotsService],
  exports: [LotsService],
})
export class LotsModule {}
