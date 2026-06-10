import { Injectable } from '@nestjs/common';
import type { NotificationType, Prisma } from '@prisma/client';
import { WS_EVENTS, rub, type NotificationDto } from '@hermes/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { PushService, type PushPayload } from '../push/push.service';
import { SettingsService } from '../settings/settings.service';

/** type → ключ тоггла в settings.notificationToggles (отсутствие ключа = включено). */
const TOGGLE_KEY: Partial<Record<NotificationType, string>> = {
  outbid: 'outbid',
  won: 'won',
  lot_ending: 'lotEnding',
  lot_starting: 'lotStarting',
};

function pushPayload(type: NotificationType, payload: Record<string, unknown>): PushPayload | null {
  const lotTitle = String(payload.lotTitle ?? '');
  const url = payload.lotId ? `/lots/${payload.lotId}` : '/';
  switch (type) {
    case 'outbid':
      return {
        title: 'Вашу ставку перебили',
        body: `${lotTitle} · теперь ${rub(Number(payload.newAmount ?? 0))}`,
        url,
        tag: `outbid-${payload.lotId}`,
      };
    case 'won':
      return { title: 'Вы выиграли лот', body: `${lotTitle} · менеджер свяжется с вами`, url, tag: `won-${payload.lotId}` };
    case 'lot_starting':
      return { title: 'Старт торгов', body: `${lotTitle} — торги начались`, url, tag: `start-${payload.lotId}` };
    case 'lot_ending':
      return { title: 'Лот скоро закроется', body: `${lotTitle} — последние минуты торгов`, url, tag: `ending-${payload.lotId}` };
    default:
      return null;
  }
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
    private readonly push: PushService,
    private readonly settings: SettingsService,
  ) {}

  /** Создаёт нотификацию в БД, шлёт WS и Web Push (если тип включён в настройках). */
  async notify(userId: string, type: NotificationType, payload: Record<string, unknown>): Promise<void> {
    const n = await this.prisma.notification.create({
      data: { userId, type, payload: payload as Prisma.InputJsonObject },
    });
    this.realtime.toUser(userId, WS_EVENTS.NOTIFICATION, this.toDto(n));

    const toggles = (await this.settings.get()).notificationToggles as Record<string, boolean>;
    const key = TOGGLE_KEY[type];
    if (key && toggles[key] === false) return;
    const pp = pushPayload(type, payload);
    if (pp) await this.push.sendToUser(userId, pp);
  }

  async listFor(userId: string, limit = 50): Promise<NotificationDto[]> {
    const rows = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map((n) => this.toDto(n));
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  private toDto(n: {
    id: string;
    type: NotificationType;
    payload: unknown;
    readAt: Date | null;
    createdAt: Date;
  }): NotificationDto {
    return {
      id: n.id,
      type: n.type,
      payload: (n.payload as Record<string, unknown>) ?? {},
      readAt: n.readAt?.toISOString() ?? null,
      createdAt: n.createdAt.toISOString(),
    };
  }
}
