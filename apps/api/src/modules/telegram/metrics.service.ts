import { Injectable, Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import * as os from 'os';
import { statfs } from 'node:fs/promises';
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
    const [infra, auction, disk] = await Promise.all([this.infra(), this.auction(), this.disk()]);
    const L: string[] = [];

    L.push('<b>📊 Статус сервера</b>');
    L.push('');

    // ── Ресурсы ──
    const load = os.loadavg();
    const cpus = os.cpus().length;
    // Загрузка CPU ≈ load average за 1 мин, делённый на число ядер: 100% = все ядра заняты.
    const cpuPct = Math.round((load[0] / cpus) * 100);
    const totalMem = os.totalmem();
    const memUsed = totalMem - os.freemem();
    const memPct = Math.round((memUsed / totalMem) * 100);
    L.push('<b>Ресурсы</b>');
    L.push(`CPU: ${cpus} ${plural(cpus, 'ядро', 'ядра', 'ядер')}, загрузка ≈ <b>${cpuPct}%</b>`);
    L.push(`  ↳ load avg 1/5/15 мин: ${load.map((n) => n.toFixed(2)).join(' / ')}`);
    L.push(`Память: ${fmtBytes(memUsed)} / ${fmtBytes(totalMem)} (<b>${memPct}%</b>)`);
    L.push(`Диск: ${disk}`);
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

  /** Свободное место на диске (по корню ФС — для контейнера это его диск). */
  private async disk(path = process.env.DISK_PATH ?? '/'): Promise<string> {
    try {
      const s = await statfs(path);
      const total = s.bsize * s.blocks;
      const free = s.bsize * s.bavail; // доступно непривилегированному пользователю
      const used = total - free;
      const usedPct = total > 0 ? Math.round((used / total) * 100) : 0;
      return `${fmtBytes(used)} / ${fmtBytes(total)} (свободно <b>${fmtBytes(free)}</b>, занято ${usedPct}%)`;
    } catch (e) {
      return `⛔️ недоступно (${(e as Error).message})`;
    }
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

/** Русское склонение по числу: plural(2,'ядро','ядра','ядер') → 'ядра'. */
function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}

function fmtDuration(sec: number): string {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}д ${h}ч`;
  if (h > 0) return `${h}ч ${m}м`;
  return `${m}м`;
}
