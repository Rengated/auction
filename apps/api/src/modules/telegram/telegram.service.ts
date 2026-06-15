import { Injectable, Logger } from '@nestjs/common';
import * as tls from 'tls';
import { Agent, ProxyAgent, type Dispatcher } from 'undici';
import { SocksClient } from 'socks';
import sharp from 'sharp';
import { fmt } from '@hermes/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';

export type TgLotEvent = 'published' | 'opened' | 'sold' | 'finished' | 'withdrawn';

/**
 * Броадкаст событий лотов в Telegram-канал через Bot API.
 * Выключен, пока в настройках пустые token/channel. Никогда не бросает —
 * вызывается fire-and-forget строго после коммита, движок не блокирует.
 *
 * Если api.telegram.org недоступен напрямую (напр. российский сервер) —
 * задайте TELEGRAM_PROXY: http(s)://host:port или socks5://host:port
 * (с логином: scheme://user:pass@host:port).
 */
@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  /** Диспетчер прокси — собирается один раз из env (null = прямое соединение). */
  private proxyDispatcher: Dispatcher | null = null;
  private proxyResolved = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  /** Ленивая инициализация прокси из TELEGRAM_PROXY по схеме URL. */
  private getDispatcher(): Dispatcher | undefined {
    if (this.proxyResolved) return this.proxyDispatcher ?? undefined;
    this.proxyResolved = true;
    const url = process.env.TELEGRAM_PROXY?.trim();
    if (!url) return undefined;
    try {
      const u = new URL(url);
      const scheme = u.protocol.replace(':', '').toLowerCase();
      if (scheme.startsWith('socks')) {
        // undici Agent с socks-туннелем в connect (SocksProxyAgent несовместим
        // с нативным fetch — у него нет dispatch()). type 5/4 по схеме.
        const socksType = scheme === 'socks4' ? 4 : 5;
        const proxy = {
          host: u.hostname,
          port: Number(u.port) || 1080,
          type: socksType as 4 | 5,
          ...(u.username ? { userId: decodeURIComponent(u.username) } : {}),
          ...(u.password ? { password: decodeURIComponent(u.password) } : {}),
        };
        this.proxyDispatcher = new Agent({
          connect: (opts, cb) => {
            SocksClient.createConnection({
              proxy,
              command: 'connect',
              destination: { host: opts.hostname, port: opts.port ? Number(opts.port) : 443 },
            })
              .then(({ socket }) => {
                socket.resume();
                if (opts.protocol === 'https:') {
                  const t = tls.connect(
                    { socket, servername: opts.hostname, ALPNProtocols: ['http/1.1'] },
                    () => cb(null, t),
                  );
                  t.on('error', (e) => cb(e, null));
                } else {
                  cb(null, socket);
                }
              })
              .catch((e) => cb(e as Error, null));
          },
        });
      } else if (scheme === 'http' || scheme === 'https') {
        this.proxyDispatcher = new ProxyAgent(url);
      } else {
        this.logger.warn(`TELEGRAM_PROXY: неподдерживаемая схема "${scheme}", игнорирую`);
        return undefined;
      }
      this.logger.log(`Telegram через прокси ${scheme}://${new URL(url).host}`);
      return this.proxyDispatcher ?? undefined;
    } catch (e) {
      this.logger.warn(`TELEGRAM_PROXY некорректен (${(e as Error).message}), прямое соединение`);
      return undefined;
    }
  }

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
      // sendPhoto файлом (multipart): качаем фото на стороне API и шлём телом запроса.
      // Так Telegram'у не нужен доступ к нашему URL, а JPEG он принимает в отличие от WebP.
      // Фото добавляем во все события (опубликован/торги идут/продан/завершены/снят).
      if (photo) {
        const jpeg = await this.fetchPhotoJpeg(photo).catch((e) => {
          this.logger.warn(`fetchPhotoJpeg(${photo.id}) failed: ${(e as Error).message}`);
          return null;
        });
        if (jpeg) {
          const ok = await this.sendPhotoMultipart(token, chatId, jpeg, text);
          if (ok) return;
        }
      }
      await this.api(token, 'sendMessage', {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
      });
    } catch (e) {
      this.logger.warn(`announceLot(${event}, ${lotId}) failed: ${(e as Error).message}`);
    }
  }

  /** Стильный продающий пост с HTML-разметкой (parse_mode=HTML). */
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
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
    const title = esc(`${lot.make} ${lot.model}, ${lot.year}`);
    const price = (n: number) => `${fmt(n)} ₽`;

    const L: string[] = [];

    // ── Заголовок-плашка по событию (продающий тон) ──
    switch (event) {
      case 'published':
        L.push(`🔥 <b>${title}</b>`);
        break;
      case 'opened':
        L.push(`🟢 <b>Торги идут — ${title}</b>`);
        break;
      case 'sold':
        L.push(`✅ <b>ПРОДАН — ${title}</b>`);
        break;
      case 'finished':
        L.push(`⚪️ <b>Торги завершены — ${title}</b>`);
        break;
      case 'withdrawn':
        L.push(`⚪️ <b>Снят с торгов — ${title}</b>`);
        break;
    }
    L.push(`<i>Лот #${lotNo}</i>`);
    L.push('');

    // ── Характеристики (всегда) ──
    L.push(`📊 ${fmt(lot.mileage)} км · ${esc(lot.engine)} · ${lot.power} л.с.`);
    L.push(`⚙️ ${esc(lot.transmission)}, ${esc(lot.drive)}, ${esc(lot.fuel)}`);
    if (lot.addressText) L.push(`📍 ${esc(lot.addressText)}`);
    L.push('');

    // ── Цена + призыв к действию по событию ──
    switch (event) {
      case 'published':
        L.push(`💰 Стартовая цена: <b>${price(Number(lot.startPrice))}</b>`);
        L.push(`🕒 Старт торгов: <b>${startsAt} МСК</b>`);
        L.push('');
        L.push('⏰ Успейте сделать ставку — лот уйдёт по лучшей цене.');
        break;
      case 'opened':
        L.push(`💰 Текущая цена: <b>${price(Number(lot.currentPrice))}</b>`);
        L.push('');
        L.push('🔨 Торги в самом разгаре — сделайте ставку, пока лот доступен!');
        break;
      case 'sold':
        L.push(`💰 Цена продажи: <b>${price(extra?.finalPrice ?? Number(lot.currentPrice))}</b>`);
        L.push('');
        L.push('🎉 Поздравляем победителя! Следующие лоты — в нашем канале.');
        break;
      case 'finished':
        L.push('Резерв не достигнут — лот может вернуться на торги. Следите за каналом.');
        break;
      case 'withdrawn':
        L.push('Лот снят с торгов организатором.');
        break;
    }
    L.push('');

    // ── Кликабельная ссылка-CTA ──
    const cta =
      event === 'sold' || event === 'finished' || event === 'withdrawn'
        ? 'Смотреть карточку лота'
        : 'Смотреть лот и сделать ставку';
    L.push(`🔗 <a href="${lotUrl}">${cta} →</a>`);

    // ── Подвал: контакт + подпись ──
    const foot: string[] = [];
    if (contact.trim()) foot.push(`💬 ${esc(contact.trim())}`);
    if (footer.trim()) foot.push(esc(footer.trim()));
    if (foot.length) {
      L.push('');
      L.push('➖➖➖➖➖');
      L.push(foot.join('\n'));
    }

    return L.join('\n');
  }

  /** true — доставлено; false/throw — нет (логируется выше). */
  private async api(token: string, method: 'sendMessage' | 'sendPhoto', body: object): Promise<boolean> {
    const dispatcher = this.getDispatcher();
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
      // undici fetch принимает dispatcher в опциях (не в типах DOM-fetch)
      ...(dispatcher ? { dispatcher } : {}),
    } as RequestInit);
    if (!res.ok) {
      this.logger.warn(`${method} → ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return false;
    }
    return true;
  }

  /**
   * Качает фото (из MinIO по внутреннему адресу или из externalUrl) и конвертит в JPEG.
   * Внутренний адрес не зависит от внешней доступности сервера для Telegram.
   */
  private async fetchPhotoJpeg(photo: { objectKey: string; externalUrl: string | null }): Promise<Buffer> {
    let src: string;
    if (photo.externalUrl) {
      src = photo.externalUrl;
    } else {
      const endpoint = (process.env.S3_ENDPOINT ?? 'http://localhost:9000').replace(/\/$/, '');
      const bucket = process.env.S3_BUCKET ?? 'lots';
      src = `${endpoint}/${bucket}/${photo.objectKey}_lg.webp`;
    }
    const res = await fetch(src, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`fetch ${res.status}`);
    const input = Buffer.from(await res.arrayBuffer());
    return sharp(input).rotate().jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  }

  /** Отправка фото файлом (multipart). true — доставлено. */
  private async sendPhotoMultipart(token: string, chatId: string, jpeg: Buffer, caption: string): Promise<boolean> {
    const dispatcher = this.getDispatcher();
    const form = new FormData();
    form.append('chat_id', chatId);
    form.append('caption', caption);
    form.append('parse_mode', 'HTML');
    form.append('photo', new Blob([jpeg], { type: 'image/jpeg' }), 'photo.jpg');
    const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: 'POST',
      body: form, // content-type/boundary выставит fetch сам
      signal: AbortSignal.timeout(20_000),
      ...(dispatcher ? { dispatcher } : {}),
    } as RequestInit);
    if (!res.ok) {
      this.logger.warn(`sendPhoto(multipart) → ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return false;
    }
    return true;
  }
}
