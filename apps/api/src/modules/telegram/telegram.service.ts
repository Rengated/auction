import { Injectable, Logger } from '@nestjs/common';
import { fmt } from '@hermes/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { photoUrl } from '../lots/lot.mapper';

export type TgLotEvent = 'published' | 'opened' | 'sold' | 'finished' | 'withdrawn';

/**
 * Броадкаст событий лотов в Telegram-канал через Bot API.
 * Выключен, пока в настройках пустые token/channel. Никогда не бросает —
 * вызывается fire-and-forget строго после коммита, движок не блокирует.
 */
@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  async announceLot(event: TgLotEvent, lotId: string, extra?: { finalPrice?: number }): Promise<void> {
    try {
      const s = await this.settings.get();
      const token = s.telegramBotToken.trim();
      const chatId = s.telegramChannelId.trim();
      if (!token || !chatId) return;

      const lot = await this.prisma.lot.findUnique({ where: { id: lotId }, include: { photos: true } });
      if (!lot) return;
      const title = `${lot.make} ${lot.model} ${lot.year}`;
      const text = this.buildText(event, lot, title, extra);
      if (!text) return;

      const photo = [...lot.photos].sort((a, b) => a.sort - b.sort).find((p) => p.kind === 'photo');
      const photoSrc = photo ? photoUrl(photo, 'lg') : '';
      // sendPhoto по URL первого фото; если Telegram не дотянулся (localhost-dev) — текстом
      if (event === 'published' && photoSrc.startsWith('http')) {
        const ok = await this.api(token, 'sendPhoto', { chat_id: chatId, photo: photoSrc, caption: text });
        if (ok) return;
      }
      await this.api(token, 'sendMessage', { chat_id: chatId, text });
    } catch (e) {
      this.logger.warn(`announceLot(${event}, ${lotId}) failed: ${(e as Error).message}`);
    }
  }

  private buildText(
    event: TgLotEvent,
    lot: { startPrice: bigint; currentPrice: bigint; startsAt: Date },
    title: string,
    extra?: { finalPrice?: number },
  ): string {
    const startsAt = lot.startsAt.toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' });
    switch (event) {
      case 'published':
        return `🚗 ${title} — скоро на торгах\nСтарт: ${startsAt} МСК · от ${fmt(Number(lot.startPrice))} ₽`;
      case 'opened':
        return `🔴 Торги начались — ${title}\nТекущая цена: ${fmt(Number(lot.currentPrice))} ₽`;
      case 'sold':
        return `✅ Продан — ${title} за ${fmt(extra?.finalPrice ?? Number(lot.currentPrice))} ₽`;
      case 'finished':
        return `Торги завершены — ${title}. Резерв не достигнут.`;
      case 'withdrawn':
        return `Лот снят с торгов — ${title}`;
    }
  }

  /** true — доставлено; false/throw — нет (логируется выше). */
  private async api(token: string, method: 'sendMessage' | 'sendPhoto', body: object): Promise<boolean> {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      this.logger.warn(`${method} → ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return false;
    }
    return true;
  }
}
