import { Body, Controller, Delete, Post } from '@nestjs/common';
import { IsNotEmpty, IsObject, IsString } from 'class-validator';
import { CurrentUser, type AuthUser } from '../../common/decorators';
import { PushService } from './push.service';

class SubscribeDto {
  @IsString()
  @IsNotEmpty()
  endpoint!: string;

  @IsObject()
  keys!: { p256dh: string; auth: string };
}

class UnsubscribeDto {
  @IsString()
  @IsNotEmpty()
  endpoint!: string;
}

@Controller('push')
export class PushController {
  constructor(private readonly push: PushService) {}

  @Post('subscribe')
  async subscribe(@CurrentUser() user: AuthUser, @Body() dto: SubscribeDto) {
    await this.push.subscribe(user!.id, dto);
    return { ok: true };
  }

  @Delete('subscribe')
  async unsubscribe(@Body() dto: UnsubscribeDto) {
    await this.push.unsubscribe(dto.endpoint);
    return { ok: true };
  }
}
