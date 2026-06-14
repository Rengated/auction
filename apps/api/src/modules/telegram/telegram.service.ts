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
      const text = this.buildText(event, lot, s.telegramContact, s.telegramFooter, extra);
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
    lot: {
      id: string;
      make: string;
      model: string;
      year: number;
      mileage: number;
      engine: string;
      power: number;
      fuel: string;
      transmission: string;
      drive: string;
      startPrice: bigint;
      currentPrice: bigint;
      startsAt: Date;
      addressText: string | null;
    },
    contact: string,
    footer: string,
    extra?: { finalPrice?: number },
  ): string {
    const webOrigin = (process.env.WEB_ORIGIN ?? 'http://localhost:5173').replace(/\/$/, '');
    const lotNo = lot.id.slice(0, 6).toUpperCase();
    const lotUrl = `${webOrigin}/lots/${lot.id}`;
    const startsAt = lot.startsAt.toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Moscow',
    });

    // Заголовок-плашка по событию
    const head: Record<TgLotEvent, string> = {
      published: `🟢 Новый лот · старт ${startsAt} МСК`,
      opened: `🔴 Торги идут · текущая ${fmt(Number(lot.currentPrice))} ₽`,
      sold: `✅ Продан за ${fmt(extra?.finalPrice ?? Number(lot.currentPrice))} ₽`,
      finished: `⚪️ Торги завершены · резерв не достигнут`,
      withdrawn: `⚪️ Лот снят с торгов`,
    };

    const lines = [
      `Лот ${lotNo} 🚘 ${lot.make} ${lot.model}, ${lot.year}`,
      `✅ Пробег: ${fmt(lot.mileage)} км`,
      `✅ ${lot.transmission}, ${lot.drive}`,
      `${lot.fuel}, ${lot.engine}, ${lot.power} л.с.`,
    ];
    if (lot.addressText) lines.push(`📍 Авто находится: ${lot.addressText}`);
    lines.push(`🔗 Фото, отчёт и подробности: ${lotUrl}`);
    lines.push('');
    lines.push(head[event]);
    if (event === 'published') lines.push(`Стартовая цена: ${fmt(Number(lot.startPrice))} ₽`);
    if (contact.trim()) {
      lines.push('');
      lines.push(`Остались вопросы? ${contact.trim()}`);
    }
    if (footer.trim()) lines.push(footer.trim());
    return lines.join('\n');
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
