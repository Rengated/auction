import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators';
import { SettingsService } from './settings.service';

@Controller('config')
export class ConfigController {
  constructor(private readonly settings: SettingsService) {}

  /** Публичный срез настроек: шаг и комиссия для расчёта «итого» на клиенте. */
  @Public()
  @Get()
  config() {
    return this.settings.publicConfig();
  }
}
