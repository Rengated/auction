import { Injectable, Logger, type OnModuleInit, type OnModuleDestroy } from '@nestjs/common';
import * as tls from 'tls';
import { Agent, ProxyAgent, type Dispatcher } from 'undici';
import { SocksClient } from 'socks';
import sharp from 'sharp';
import { fmt } from '@hermes/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { MetricsService } from './metrics.service';

export type TgLotEvent = 'published' | 'opened' | 'sold' | 'finished' | 'withdrawn';

/** Информация о попытке входа персонала для Telegram-алерта. */
export interface StaffLoginInfo {
  ok: boolean;
  username: string;
  role?: string;
  ip?: string;
  userAgent?: string;
}

interface TgUpdate {
  update_id: number;
  message?: { text?: string; chat?: { id: number } };
}

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
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  /** Диспетчер прокси — собирается один раз из env (null = прямое соединение). */
  private proxyDispatcher: Dispatcher | null = null;
  private proxyResolved = false;

  // ── Состояние long-polling команд бота ──
  private polling = false;
  private pollOffset = 0;
  private pollAbort: AbortController | null = null;
  private pollTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly metrics: MetricsService,
  ) {}

  /** ID чатов админов (адресаты алертов и единственные авторизованные для команд). */
  private get adminChatIds(): string[] {
    return (process.env.TELEGRAM_ADMIN_CHAT_ID ?? '441931183')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  onModuleInit(): void {
    // В тестах и при явном выключении не поллим (один инстанс должен держать getUpdates).
    if (process.env.TELEGRAM_BOT_POLLING === '0' || process.env.NODE_ENV === 'test') return;
    this.polling = true;
    void this.pollLoop();
  }

  onModuleDestroy(): void {
    this.polling = false;
    this.pollAbort?.abort();
    if (this.pollTimer) clearTimeout(this.pollTimer);
  }

  /** Алерт о входе персонала (успех/неудача) всем админам. Fire-and-forget, не бросает. */
  async notifyStaffLogin(info: StaffLoginInfo): Promise<void> {
    try {
      const token = (await this.settings.get()).telegramBotToken.trim();
      const ids = this.adminChatIds;
      if (!token || !ids.length) return;
      const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const when = new Date().toLocaleString('ru-RU', {
        timeZone: 'Europe/Moscow',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      const lines = [
        info.ok ? '✅ <b>Вход в админку</b>' : '⛔️ <b>Неудачная попытка входа</b>',
        `Логин: <code>${esc(info.username)}</code>`,
        ...(info.ok && info.role ? [`Роль: ${esc(info.role)}`] : []),
        `IP: <code>${esc(info.ip ?? '—')}</code>`,
        `UA: ${info.userAgent ? esc(info.userAgent.slice(0, 120)) : '—'}`,
        `Время: ${when} (МСК)`,
      ];
      const text = lines.join('\n');
      for (const chatId of ids) {
        await this.api(token, 'sendMessage', {
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          link_preview_options: { is_disabled: true },
        });
      }
    } catch (e) {
      this.logger.warn(`notifyStaffLogin failed: ${(e as Error).message}`);
    }
  }

  /** Цикл long-polling: читает токен из настроек, тянет апдейты, диспетчеризует команды. */
  private async pollLoop(): Promise<void> {
    while (this.polling) {
      let token = '';
      try {
        token = (await this.settings.get()).telegramBotToken.trim();
      } catch {
        /* настройки недоступны — повторим позже */
      }
      if (!token) {
        await this.sleep(15_000);
        continue;
      }
      try {
        const updates = await this.getUpdates(token, this.pollOffset);
        for (const u of updates) {
          this.pollOffset = u.update_id + 1;
          await this.handleUpdate(token, u).catch((e) =>
            this.logger.warn(`handleUpdate failed: ${(e as Error).message}`),
          );
        }
      } catch (e) {
        if (this.polling) {
          this.logger.warn(`getUpdates failed: ${(e as Error).message}`);
          await this.sleep(5_000);
        }
      }
    }
  }

  /** Long-poll getUpdates (только message-апдейты). Прерывается на остановке/таймауте. */
  private async getUpdates(token: string, offset: number): Promise<TgUpdate[]> {
    const dispatcher = this.getDispatcher();
    this.pollAbort = new AbortController();
    // Останов сервиса или 35с без ответа (сеть) → прерываем висящий long-poll.
    const signal = AbortSignal.any([this.pollAbort.signal, AbortSignal.timeout(35_000)]);
    const url =
      `https://api.telegram.org/bot${token}/getUpdates` +
      `?timeout=30&offset=${offset}&allowed_updates=${encodeURIComponent('["message"]')}`;
    const res = await fetch(url, {
      signal,
      ...(dispatcher ? { dispatcher } : {}),
    } as RequestInit);
    if (!res.ok) throw new Error(`getUpdates → ${res.status}`);
    const data = (await res.json()) as { ok: boolean; result?: TgUpdate[] };
    return data.result ?? [];
  }

  /** Обработка одного апдейта: только от админов, команды /status и /help. */
  private async handleUpdate(token: string, u: TgUpdate): Promise<void> {
    const msg = u.message;
    if (!msg?.text || !msg.chat) return;
    const chatId = String(msg.chat.id);
    if (!this.adminChatIds.includes(chatId)) return; // чужие — молча игнорируем
    const cmd = msg.text.trim().split(/\s+/)[0].toLowerCase().replace(/@.*$/, '');
    if (cmd === '/status') {
      const text = await this.metrics.buildStatusMessage();
      await this.api(token, 'sendMessage', {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
      });
    } else if (cmd === '/start' || cmd === '/help') {
      await this.api(token, 'sendMessage', {
        chat_id: chatId,
        text: 'Команды:\n/status — статус сервера (ресурсы, инфраструктура, аукцион)',
        parse_mode: 'HTML',
      });
    }
  }

  /** setTimeout-пауза с unref, чтобы не держать event loop (важно для тестов/shutdown). */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.pollTimer = setTimeout(resolve, ms);
      this.pollTimer.unref?.();
    });
  }

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

      // Тоглы событий: пусто/нет ключа = постить (по умолчанию включено), false = пропустить.
      const toggles = (s.tgEventToggles ?? {}) as Record<string, boolean>;
      if (toggles[event] === false) return;

      const lot = await this.prisma.lot.findUnique({ where: { id: lotId }, include: { photos: true } });
      if (!lot) return;
      const { text, replyMarkup } = this.buildText(event, lot, s.telegramContact, extra);
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
          const ok = await this.sendPhotoMultipart(token, chatId, jpeg, text, replyMarkup);
          if (ok) return;
        }
      }
      await this.api(token, 'sendMessage', {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
        reply_markup: replyMarkup,
      });
    } catch (e) {
      this.logger.warn(`announceLot(${event}, ${lotId}) failed: ${(e as Error).message}`);
    }
  }

  /**
   * Пост лота: строгий деловой тон, HTML-разметка (parse_mode=HTML).
   * Характеристики — в <blockquote>, описание — в <blockquote expandable>.
   * Возвращает caption (≤1024 для фото) и inline-кнопку «Перейти к лоту».
   */
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
      description: string;
      options: unknown;
    },
    contact: string,
    extra?: { finalPrice?: number },
  ): { text: string; replyMarkup: object } {
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

    // ── Статус-надзаголовок (сдержанно, словами, без emoji-плашек) ──
    const status: Record<TgLotEvent, string> = {
      published: 'НОВЫЙ ЛОТ',
      opened: 'ИДУТ ТОРГИ',
      sold: 'ПРОДАН',
      finished: 'ТОРГИ ЗАВЕРШЕНЫ',
      withdrawn: 'СНЯТ С ТОРГОВ',
    };
    L.push(`<b>${status[event]}</b>  ·  <i>Лот #${lotNo}</i>`);
    L.push(`<b>${title}</b>`);
    L.push('');

    // ── Цена / время по событию ──
    switch (event) {
      case 'published':
        L.push(`Стартовая цена: <b>${price(Number(lot.startPrice))}</b>`);
        L.push(`Старт торгов: <b>${startsAt} (МСК)</b>`);
        break;
      case 'opened':
        L.push(`Текущая цена: <b>${price(Number(lot.currentPrice))}</b>`);
        break;
      case 'sold':
        L.push(`Цена продажи: <b>${price(extra?.finalPrice ?? Number(lot.currentPrice))}</b>`);
        break;
      case 'finished':
        L.push('Резерв не достигнут. Лот может вернуться на торги.');
        break;
      case 'withdrawn':
        L.push('Лот снят с торгов организатором.');
        break;
    }

    // ── Характеристики в цитате ──
    const spec: string[] = [
      `Пробег: ${fmt(lot.mileage)} км`,
      `Двигатель: ${esc(lot.engine)}, ${lot.power} л.с., ${esc(lot.fuel)}`,
      `Трансмиссия: ${esc(lot.transmission)}, ${esc(lot.drive)}`,
    ];
    if (lot.addressText) spec.push(`Местонахождение: ${esc(lot.addressText)}`);
    L.push('');
    L.push(`<blockquote>${spec.join('\n')}</blockquote>`);

    // ── Описание в сворачиваемой цитате (только для новых/идущих лотов) ──
    const desc = lot.description.trim();
    if (desc && (event === 'published' || event === 'opened')) {
      const clipped = desc.length > 350 ? `${desc.slice(0, 347)}…` : desc;
      L.push('');
      L.push(`<blockquote expandable>${esc(clipped)}</blockquote>`);
    }

    // ── Подвал: контакт ──
    if (contact.trim()) {
      L.push('');
      L.push(`<i>${esc(contact.trim())}</i>`);
    }

    const cta = event === 'sold' || event === 'finished' || event === 'withdrawn' ? 'Открыть карточку лота' : 'Перейти к лоту';
    const replyMarkup = { inline_keyboard: [[{ text: cta, url: lotUrl }]] };

    return { text: L.join('\n'), replyMarkup };
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
  private async sendPhotoMultipart(
    token: string,
    chatId: string,
    jpeg: Buffer,
    caption: string,
    replyMarkup?: object,
  ): Promise<boolean> {
    const dispatcher = this.getDispatcher();
    const form = new FormData();
    form.append('chat_id', chatId);
    form.append('caption', caption);
    form.append('parse_mode', 'HTML');
    if (replyMarkup) form.append('reply_markup', JSON.stringify(replyMarkup));
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
