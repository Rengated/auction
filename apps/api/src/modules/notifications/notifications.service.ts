import { Injectable, Logger } from '@nestjs/common';
import type { NotificationType, Prisma } from '@prisma/client';
import { WS_EVENTS, mergeNotificationPrefs, rub, type NotificationDto, type NotificationEvent } from '@hermes/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { PushService, type PushPayload } from '../push/push.service';
import { SettingsService } from '../settings/settings.service';

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
      return payload.phase === 'soon'
        ? { title: 'Скоро старт торгов', body: `${lotTitle} — начало через 15 минут`, url, tag: `start-${payload.lotId}` }
        : { title: 'Старт торгов', body: `${lotTitle} — торги начались`, url, tag: `start-${payload.lotId}` };
    case 'lot_ending':
      return { title: 'Лот скоро закроется', body: `${lotTitle} — последние минуты торгов`, url, tag: `ending-${payload.lotId}` };
    case 'lot_extended':
      return { title: 'Торги продлены', body: `${lotTitle} — финал отодвинут`, url, tag: `ext-${payload.lotId}` };
    case 'lot_withdrawn':
      return { title: 'Лот снят с торгов', body: lotTitle, url, tag: `wd-${payload.lotId}` };
    case 'deal_update': {
      const map: Record<string, { title: string; body: string }> = {
        won: { title: 'Лот выигран', body: `${lotTitle} — менеджер свяжется с вами` },
        contacted: { title: 'Менеджер связался с вами', body: `${lotTitle} — согласуйте встречу в салоне` },
        signed: { title: 'Документы подписаны', body: `${lotTitle} — осталась выдача автомобиля` },
        delivered: { title: 'Автомобиль выдан', body: `${lotTitle} — поздравляем с покупкой!` },
        cancelled: { title: 'Сделка отменена', body: lotTitle },
      };
      const m = map[String(payload.status)] ?? { title: 'Статус сделки обновлён', body: lotTitle };
      return { ...m, url: '/profile/won', tag: `deal-${payload.dealId}` };
    }
    default:
      return null;
  }
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
    private readonly push: PushService,
    private readonly settings: SettingsService,
  ) {}

  /**
   * Единая точка доставки: глобальный тоггл типа (мастер-выключатель админа)
   * → персональные настройки пользователя → каналы (лента в приложении / web push).
   */
  async notify(userId: string, type: NotificationType, payload: Record<string, unknown>): Promise<void> {
    await this.notifyMany([userId], type, payload);
  }

  /** Фан-аут одним чтением настроек/получателей. */
  async notifyMany(userIds: string[], type: NotificationType, payload: Record<string, unknown>): Promise<void> {
    const ids = [...new Set(userIds)];
    if (ids.length === 0) return;
    if (!(await this.globallyEnabled(type))) return;

    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, notificationPrefs: true },
    });
    for (const u of users) {
      const prefs = mergeNotificationPrefs(u.notificationPrefs);
      const p =
        type === 'system'
          ? { inApp: true, push: false }
          : prefs[type as NotificationEvent] ?? { inApp: true, push: false };

      if (p.inApp) {
        const n = await this.prisma.notification.create({
          data: { userId: u.id, type, payload: payload as Prisma.InputJsonObject },
        });
        this.realtime.toUser(u.id, WS_EVENTS.NOTIFICATION, this.toDto(n));
      }
      if (p.push) {
        const pp = pushPayload(type, payload);
        if (pp) {
          void this.push
            .sendToUser(u.id, pp)
            .catch((e) => this.logger.warn(`push to ${u.id} failed: ${(e as Error).message}`));
        }
      }
    }
  }

  /** Выключенный администратором тип не доставляется никому и никуда. */
  private async globallyEnabled(type: NotificationType): Promise<boolean> {
    if (type === 'system') return true;
    const toggles = (await this.settings.get()).notificationToggles as Record<string, boolean>;
    return toggles[type] !== false;
  }

  async listFor(userId: string, limit = 50): Promise<NotificationDto[]> {
    const rows = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map((n) => this.toDto(n));
  }

  async unreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, readAt: null } });
  }

  async markRead(userId: string, notificationId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, userId, readAt: null },
      data: { readAt: new Date() },
    });
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
