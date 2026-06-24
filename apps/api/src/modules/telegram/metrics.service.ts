import { Injectable, Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import * as os from 'os';
import { PrismaService } from '../../common/prisma/prisma.service';
import { REDIS } from '../../common/redis/redis.module';
import { AUCTION_QUEUE } from '../auction-engine/auction.constants';
import { RealtimeService } from '../realtime/realtime.service';

/**
 * Сбор серверной/инфраструктурной/аукционной статистики для команды /status в боте.
 * Метрики онлайна и ресурсов считаются на этом инстансе API.
 */
@Injectable()
export class MetricsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS) private readonly redis: Redis,
    @InjectQueue(AUCTION_QUEUE) private readonly queue: Queue,
    private readonly realtime: RealtimeService,
  ) {}

  /** Готовый HTML-текст для Telegram (parse_mode=HTML). */
  async buildStatusMessage(): Promise<string> {
    const [infra, auction] = await Promise.all([this.infra(), this.auction()]);
    const L: string[] = [];

    L.push('<b>📊 Статус сервера</b>');
    L.push('');

    // ── Ресурсы ──
    const load = os.loadavg();
    const cpus = os.cpus().length;
    const memUsed = os.totalmem() - os.freemem();
    L.push('<b>Ресурсы</b>');
    L.push(`Load avg: ${load.map((n) => n.toFixed(2)).join(' / ')} (CPU: ${cpus})`);
    L.push(`Память: ${fmtBytes(memUsed)} / ${fmtBytes(os.totalmem())}`);
    L.push(`RSS процесса: ${fmtBytes(process.memoryUsage().rss)}`);
    L.push(`Uptime: процесс ${fmtDuration(process.uptime())}, хост ${fmtDuration(os.uptime())}`);
    L.push('');

    // ── Инфраструктура ──
    L.push('<b>Инфраструктура</b>');
    L.push(`PostgreSQL: ${infra.db}`);
    L.push(`Redis: ${infra.redis}`);
    L.push(`Очередь торгов: ${infra.queue}`);
    L.push('');

    // ── Аукцион ──
    L.push('<b>Аукцион</b>');
    L.push(`Идут торги (live): <b>${auction.live}</b>`);
    L.push(`Предстоящие: <b>${auction.upcoming}</b>`);
    L.push(`Сделки за 24ч: <b>${auction.deals24h}</b>`);
    L.push(`Онлайн (этот инстанс): <b>${auction.online}</b>`);

    return L.join('\n');
  }

  private async infra(): Promise<{ db: string; redis: string; queue: string }> {
    const db = await this.ping(() => this.prisma.$queryRaw`SELECT 1`);
    const redis = await this.ping(() => this.redis.ping());
    let queue: string;
    try {
      const c = await this.queue.getJobCounts('waiting', 'active', 'delayed', 'failed');
      queue = `ожид. ${c.waiting ?? 0}, активн. ${c.active ?? 0}, отлож. ${c.delayed ?? 0}, ошибок ${c.failed ?? 0}`;
    } catch (e) {
      queue = `⛔️ ошибка (${(e as Error).message})`;
    }
    return { db, redis, queue };
  }

  private async auction(): Promise<{ live: number; upcoming: number; deals24h: number; online: number }> {
    const dayAgo = new Date(Date.now() - 24 * 3600_000);
    const [live, upcoming, deals24h] = await Promise.all([
      this.prisma.lot.count({ where: { status: 'live' } }),
      this.prisma.lot.count({ where: { status: 'upcoming' } }),
      this.prisma.deal.count({ where: { createdAt: { gt: dayAgo } } }),
    ]);
    return { live, upcoming, deals24h, online: this.realtime.connectedCount() };
  }

  /** Запускает проверку, замеряет задержку; «✅ Nмс» или «⛔️ ошибка». */
  private async ping(fn: () => Promise<unknown>): Promise<string> {
    const t = Date.now();
    try {
      await fn();
      return `✅ ${Date.now() - t}мс`;
    } catch (e) {
      return `⛔️ ошибка (${(e as Error).message})`;
    }
  }
}

function fmtBytes(bytes: number): string {
  const gb = bytes / 1024 ** 3;
  if (gb >= 1) return `${gb.toFixed(2)} ГБ`;
  return `${(bytes / 1024 ** 2).toFixed(0)} МБ`;
}

function fmtDuration(sec: number): string {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}д ${h}ч`;
  if (h > 0) return `${h}ч ${m}м`;
  return `${m}м`;
}
