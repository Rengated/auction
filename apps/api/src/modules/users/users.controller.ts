import { BadRequestException, Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { NOTIFICATION_EVENTS, type NotificationPrefs } from '@hermes/shared';
import { Prisma } from '@prisma/client';
import { CurrentUser, type AuthUser } from '../../common/decorators';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

class ContactsDto {
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  // Почта обязательна для допуска к торгам
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}

@Controller('me')
export class UsersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @Patch('contacts')
  async updateContacts(@CurrentUser() user: AuthUser, @Body() dto: ContactsDto) {
    await this.prisma.user.update({
      where: { id: user!.id },
      data: {
        fullName: dto.fullName,
        phone: dto.phone,
        email: dto.email,
        contactsFilledAt: new Date(),
      },
    });
    return { ok: true };
  }

  @Get('notifications')
  list(@CurrentUser() user: AuthUser) {
    return this.notifications.listFor(user!.id);
  }

  @Get('notifications/unread-count')
  async unreadCount(@CurrentUser() user: AuthUser) {
    return { count: await this.notifications.unreadCount(user!.id) };
  }

  @Post('notifications/read')
  async readAll(@CurrentUser() user: AuthUser) {
    await this.notifications.markAllRead(user!.id);
    return { ok: true };
  }

  @Post('notifications/:id/read')
  async readOne(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    await this.notifications.markRead(user!.id, id);
    return { ok: true };
  }

  /** Разреженный патч персональных настроек уведомлений: { event: { inApp?, push? } }. */
  @Patch('notification-prefs')
  async patchPrefs(@CurrentUser() user: AuthUser, @Body() body: Partial<NotificationPrefs>) {
    const patch: Record<string, { inApp?: boolean; push?: boolean }> = {};
    for (const [event, channels] of Object.entries(body ?? {})) {
      if (!(NOTIFICATION_EVENTS as readonly string[]).includes(event) || typeof channels !== 'object' || !channels) {
        throw new BadRequestException(`Неизвестное событие: ${event}`);
      }
      patch[event] = {};
      for (const ch of ['inApp', 'push'] as const) {
        const v = (channels as Record<string, unknown>)[ch];
        if (v !== undefined) {
          if (typeof v !== 'boolean') throw new BadRequestException('Значения каналов — булевы');
          patch[event][ch] = v;
        }
      }
    }
    const u = await this.prisma.user.findUniqueOrThrow({
      where: { id: user!.id },
      select: { notificationPrefs: true },
    });
    const stored = (u.notificationPrefs ?? {}) as Record<string, { inApp?: boolean; push?: boolean }>;
    for (const [event, channels] of Object.entries(patch)) {
      stored[event] = { ...stored[event], ...channels };
    }
    await this.prisma.user.update({
      where: { id: user!.id },
      data: { notificationPrefs: stored as Prisma.InputJsonObject },
    });
    return { ok: true };
  }
}
