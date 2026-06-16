import { InjectQueue } from '@nestjs/bullmq';
import { HttpStatus, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Queue } from 'bullmq';
import { ERROR_CODES, WS_EVENTS, type LotStatusEvent } from '@hermes/shared';
import { ApiError } from '../../common/api-error';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeService } from '../realtime/realtime.service';
import { SettingsService } from '../settings/settings.service';
import { TelegramService } from '../telegram/telegram.service';
import { MediaService } from '../admin/media.service';
import { lotToTick } from '../lots/lot.mapper';

export const AUCTION_QUEUE = 'auction';
const SWEEP_INTERVAL_MS = 30_000;
const ENDING_SOON_MS = 5 * 60_000;
const START_SOON_MS = 15 * 60_000;
/** Через сколько после выдачи (delivered) очищать медиа лота. */
const MEDIA_PURGE_MS = 7 * 24 * 60 * 60_000;

interface LockedRow {
  id: string;
  status: string;
  starts_at: Date;
  ends_at: Date;
  bid_count: number;
  reserve_met: boolean;
  current_bid_id: string | null;
  current_price: bigint;
  start_price: bigint;
  reserve_price: bigint;
  /** numeric из pg приходит строкой; NULL → глобальная комиссия */
  fee_rate: string | null;
  make: string;
  model: string;
}

@Injectable()
export class LifecycleService implements OnModuleInit {
  private readonly logger = new Logger(LifecycleService.name);

  constructor(
    @InjectQueue(AUCTION_QUEUE) private readonly queue: Queue,
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly realtime: RealtimeService,
    private readonly notifications: NotificationsService,
    private readonly telegram: TelegramService,
    private readonly media: MediaService,
  ) {}

  async onModuleInit(): Promise<void> {
    // Страховочный поллер: система самовосстанавливается после рестартов/потерянных джоб
    await this.queue.upsertJobScheduler('sweep-scheduler', { every: SWEEP_INTERVAL_MS }, { name: 'sweep' });
    await this.reconcile();
  }

  /** Переустановка джоб по фактическому состоянию БД (вызывается на старте). */
  async reconcile(): Promise<void> {
    const lots = await this.prisma.lot.findMany({
      where: { status: { in: ['upcoming', 'live'] }, published: true },
      select: { id: true, status: true, startsAt: true, endsAt: true },
    });
    for (const lot of lots) {
      if (lot.status === 'upcoming') await this.scheduleOpen(lot.id, lot.startsAt);
      await this.scheduleClose(lot.id, lot.endsAt);
    }
    this.logger.log(`Reconciled jobs for ${lots.length} active lots`);
  }

  async scheduleOpen(lotId: string, startsAt: Date): Promise<void> {
    const jobId = `open-${lotId}`;
    await this.queue.remove(jobId).catch(() => undefined);
    await this.queue.add(
      'open',
      { lotId },
      { jobId, delay: Math.max(0, startsAt.getTime() - Date.now()), removeOnComplete: true, removeOnFail: true },
    );
    // «Скоро старт по избранному» — за 15 минут (только если старт ещё дальше)
    const soonDelay = startsAt.getTime() - START_SOON_MS - Date.now();
    await this.queue.remove(`start-soon-${lotId}`).catch(() => undefined);
    if (soonDelay > 0) {
      await this.queue.add(
        'start-soon',
        { lotId },
        { jobId: `start-soon-${lotId}`, delay: soonDelay, removeOnComplete: true, removeOnFail: true },
      );
    }
  }

  async scheduleClose(lotId: string, endsAt: Date): Promise<void> {
    const jobId = `close-${lotId}`;
    await this.queue.remove(jobId).catch(() => undefined);
    await this.queue.add(
      'close',
      { lotId },
      { jobId, delay: Math.max(0, endsAt.getTime() - Date.now()), removeOnComplete: true, removeOnFail: true },
    );
    // «Лот скоро закроется» — за 5 минут до конца (переустанавливается при продлении)
    const endingDelay = endsAt.getTime() - ENDING_SOON_MS - Date.now();
    await this.queue.remove(`ending-${lotId}`).catch(() => undefined);
    if (endingDelay > 0) {
      await this.queue.add(
        'ending-soon',
        { lotId },
        { jobId: `ending-${lotId}`, delay: endingDelay, removeOnComplete: true, removeOnFail: true },
      );
    }
  }

  /** Уведомление «лот скоро закроется» участникам и подписавшимся (избранное). */
  async notifyEndingSoon(lotId: string): Promise<void> {
    const lot = await this.prisma.lot.findUnique({ where: { id: lotId } });
    if (!lot || lot.status !== 'live') return;
    if (lot.endsAt.getTime() - Date.now() > ENDING_SOON_MS + 60_000) return; // продлено — джоба устарела
    const userIds = await this.audienceOf(lotId);
    await this.notifications.notifyMany(userIds, 'lot_ending', {
      lotId,
      lotTitle: `${lot.make} ${lot.model}`,
      endsAt: lot.endsAt.toISOString(),
    });
  }

  /** «Скоро старт» — только подписавшимся на лот (избранное). */
  async notifyStartingSoon(lotId: string): Promise<void> {
    const lot = await this.prisma.lot.findUnique({ where: { id: lotId } });
    if (!lot || lot.status !== 'upcoming' || !lot.published) return;
    const favs = await this.prisma.favorite.findMany({ where: { lotId }, select: { userId: true } });
    await this.notifications.notifyMany(
      favs.map((f) => f.userId),
      'lot_starting',
      { lotId, lotTitle: `${lot.make} ${lot.model}`, startsAt: lot.startsAt.toISOString(), phase: 'soon' },
    );
  }

  async cancelJobs(lotId: string): Promise<void> {
    await this.queue.remove(`open-${lotId}`).catch(() => undefined);
    await this.queue.remove(`close-${lotId}`).catch(() => undefined);
    await this.queue.remove(`ending-${lotId}`).catch(() => undefined);
    await this.queue.remove(`start-soon-${lotId}`).catch(() => undefined);
  }

  /** Планирует очистку медиа лота через неделю после выдачи (от deliveredAt). */
  async scheduleMediaPurge(lotId: string, deliveredAt: Date): Promise<void> {
    const jobId = `purge-media-${lotId}`;
    await this.queue.remove(jobId).catch(() => undefined);
    await this.queue.add(
      'purge-media',
      { lotId },
      {
        jobId,
        delay: Math.max(0, deliveredAt.getTime() + MEDIA_PURGE_MS - Date.now()),
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
  }

  /** Отменяет запланированную очистку медиа (например при откате статуса сделки). */
  async cancelMediaPurge(lotId: string): Promise<void> {
    await this.queue.remove(`purge-media-${lotId}`).catch(() => undefined);
  }

  /**
   * Очистка медиа лота: удаляет файлы из S3 (фото/видео/PDF), записи в БД оставляет
   * и помечает лот mediaPurgedAt. Идемпотентна (повторный вызов ничего не ломает).
   */
  async purgeLotMedia(lotId: string): Promise<void> {
    const lot = await this.prisma.lot.findUnique({
      where: { id: lotId },
      select: {
        mediaPurgedAt: true,
        autotekaPdfKey: true,
        deal: { select: { status: true } },
        photos: { select: { kind: true, objectKey: true, externalUrl: true } },
      },
    });
    if (!lot) return;
    if (lot.mediaPurgedAt) return; // уже очищено
    // Страховка: чистим только реально выданные лоты
    if (lot.deal?.status !== 'delivered') return;

    await this.media.purgeLotMedia({ photos: lot.photos, autotekaPdfKey: lot.autotekaPdfKey });
    await this.prisma.lot.update({ where: { id: lotId }, data: { mediaPurgedAt: new Date() } });
    this.logger.log(`Lot ${lotId} media purged`);
  }

  /** Аудитория лота: участники торгов + добавившие в избранное. */
  private async audienceOf(lotId: string, excludeUserId?: string): Promise<string[]> {
    const [bidders, favs] = await Promise.all([
      this.prisma.bid.groupBy({ by: ['userId'], where: { lotId, rejectedAt: null } }),
      this.prisma.favorite.findMany({ where: { lotId }, select: { userId: true } }),
    ]);
    const ids = new Set<string>([...bidders.map((b) => b.userId), ...favs.map((f) => f.userId)]);
    if (excludeUserId) ids.delete(excludeUserId);
    return [...ids];
  }

  /** Поллер: дооткрывает/дозакрывает пропущенное. */
  async sweep(): Promise<void> {
    const now = new Date();
    const toOpen = await this.prisma.lot.findMany({
      where: { status: 'upcoming', published: true, startsAt: { lte: now } },
      select: { id: true },
    });
    for (const l of toOpen) await this.openLot(l.id);

    const toClose = await this.prisma.lot.findMany({
      where: { status: 'live', endsAt: { lte: new Date(now.getTime() - 2000) } },
      select: { id: true },
    });
    for (const l of toClose) await this.closeLot(l.id);

    // Страховка: медиа выданных >7д назад лотов, не очищенные джобой (рестарт и т.п.)
    const toPurge = await this.prisma.lot.findMany({
      where: {
        mediaPurgedAt: null,
        deal: { status: 'delivered', closedAt: { lte: new Date(now.getTime() - MEDIA_PURGE_MS) } },
      },
      select: { id: true },
    });
    for (const l of toPurge) await this.purgeLotMedia(l.id);
  }

  /** upcoming → live. */
  async openLot(lotId: string): Promise<void> {
    const opened = await this.prisma.$transaction(async (tx) => {
      const lot = await this.lockLot(tx, lotId);
      if (!lot || lot.status !== 'upcoming') return null;
      if (lot.starts_at > new Date()) return null;
      const updated = await tx.lot.update({ where: { id: lotId }, data: { status: 'live' } });
      await tx.auctionEvent.create({ data: { lotId, type: 'opened', payload: {} } });
      return updated;
    });
    if (!opened) return;

    await this.scheduleClose(lotId, opened.endsAt);
    const event: LotStatusEvent = { lot: lotToTick(opened) };
    this.broadcastStatus(lotId, event);

    // «Старт торгов по избранному»
    const favs = await this.prisma.favorite.findMany({ where: { lotId }, select: { userId: true } });
    await this.notifications.notifyMany(
      favs.map((f) => f.userId),
      'lot_starting',
      { lotId, lotTitle: `${opened.make} ${opened.model}`, startsAt: opened.startsAt.toISOString(), phase: 'live' },
    );
    void this.telegram.announceLot('opened', lotId);
    this.logger.log(`Lot ${lotId} opened`);
  }

  /**
   * live → sold/finished. Перепроверяет ends_at под локом:
   * если ставка продлила торги после постановки джобы — выходит без действий.
   */
  async closeLot(lotId: string, opts: { force?: boolean; actorUserId?: string } = {}): Promise<void> {
    const settings = await this.settings.get();
    const result = await this.prisma.$transaction(async (tx) => {
      const lot = await this.lockLot(tx, lotId);
      if (!lot || lot.status !== 'live') return null;
      if (!opts.force && lot.ends_at.getTime() > Date.now() + 500) return null; // продлено — джоба устарела

      const hasWinner = lot.bid_count > 0 && lot.reserve_met && lot.current_bid_id;
      const status = hasWinner ? ('sold' as const) : ('finished' as const);
      const updated = await tx.lot.update({
        where: { id: lotId },
        data: { status, ...(opts.force ? { endsAt: new Date() } : {}) },
      });

      let deal: { id: string; winnerUserId: string } | null = null;
      if (hasWinner) {
        const winningBid = await tx.bid.findUniqueOrThrow({ where: { id: lot.current_bid_id! } });
        // Снимок комиссии на момент закрытия: своя у лота либо глобальная
        const effFeeRate = lot.fee_rate != null ? Number(lot.fee_rate) : Number(settings.feeRate);
        const created = await tx.deal.create({
          data: {
            lotId,
            winnerUserId: winningBid.userId,
            winningBidId: winningBid.id,
            amount: winningBid.amount,
            feeRate: effFeeRate,
            feeAmount: BigInt(Math.round(Number(winningBid.amount) * effFeeRate)),
          },
        });
        deal = { id: created.id, winnerUserId: created.winnerUserId };
      }

      await tx.auctionEvent.create({
        data: {
          lotId,
          type: 'closed',
          actorUserId: opts.actorUserId ?? null,
          payload: { status, manual: Boolean(opts.force), finalPrice: Number(lot.current_price) },
        },
      });
      return { updated, deal, finalPrice: Number(lot.current_price), title: `${lot.make} ${lot.model}` };
    });
    if (!result) return;

    await this.queue.remove(`close-${lotId}`).catch(() => undefined);
    const event: LotStatusEvent = { lot: lotToTick(result.updated), finalPrice: result.finalPrice };
    this.broadcastStatus(lotId, event);

    if (result.deal) {
      const won = {
        lotId,
        lotTitle: result.title,
        amount: result.finalPrice,
        dealId: result.deal.id,
      };
      this.realtime.toUser(result.deal.winnerUserId, WS_EVENTS.LOT_WON, won);
      await this.notifications.notify(result.deal.winnerUserId, 'won', won);
    }
    void this.telegram.announceLot(result.deal ? 'sold' : 'finished', lotId, { finalPrice: result.finalPrice });
    this.logger.log(`Lot ${lotId} closed → ${result.updated.status}`);
  }

  /** Ручное продление торгов менеджером (+30/+60 сек из AuctionControl). */
  async extend(lotId: string, seconds: number, actorUserId: string): Promise<Date> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const lot = await this.lockLot(tx, lotId);
      if (!lot) throw new NotFoundException();
      if (lot.status !== 'live') {
        throw new ApiError(ERROR_CODES.LOT_NOT_LIVE, 'Лот не в эфире', HttpStatus.CONFLICT);
      }
      const endsAt = new Date(Math.max(lot.ends_at.getTime(), Date.now()) + seconds * 1000);
      const u = await tx.lot.update({ where: { id: lotId }, data: { endsAt } });
      await tx.auctionEvent.create({
        data: { lotId, type: 'extended', actorUserId, payload: { reason: 'manual', seconds, endsAt: endsAt.toISOString() } },
      });
      return u;
    });

    await this.scheduleClose(lotId, updated.endsAt);
    const ext = { lotId, endsAt: updated.endsAt.toISOString(), serverNow: new Date().toISOString() };
    this.realtime.toLot(lotId, WS_EVENTS.LOT_EXTENDED, ext);
    this.realtime.toCatalog(WS_EVENTS.LOT_EXTENDED, ext);
    this.realtime.toAdmin(WS_EVENTS.LOT_EXTENDED, ext);

    if (await this.shouldNotifyExtend(lotId)) {
      const bidders = await this.prisma.bid.groupBy({ by: ['userId'], where: { lotId, rejectedAt: null } });
      await this.notifications.notifyMany(
        bidders.map((b) => b.userId),
        'lot_extended',
        { lotId, lotTitle: `${updated.make} ${updated.model}`, endsAt: updated.endsAt.toISOString(), reason: 'manual' },
      );
    }
    return updated.endsAt;
  }

  /**
   * Троттлинг уведомлений «торги продлены»: возвращает true, если по этому лоту
   * можно слать push (прошло ≥ extendThrottleSec с прошлого), и атомарно отмечает
   * время. При частых анти-снайп продлениях пользователь не получает спам —
   * сам таймер (WS LOT_EXTENDED) при этом обновляется всегда.
   */
  async shouldNotifyExtend(lotId: string): Promise<boolean> {
    const settings = await this.settings.get();
    const throttleSec = settings.extendThrottleSec ?? 0;
    if (throttleSec <= 0) {
      await this.prisma.lot.update({ where: { id: lotId }, data: { lastExtendNotifiedAt: new Date() } });
      return true;
    }
    const cutoff = new Date(Date.now() - throttleSec * 1000);
    // Условный апдейт: проставит время и «выиграет» только если прошлый push был давно
    // (или его не было). count=1 → нам можно слать; count=0 → недавно уже слали.
    const res = await this.prisma.lot.updateMany({
      where: { id: lotId, OR: [{ lastExtendNotifiedAt: null }, { lastExtendNotifiedAt: { lte: cutoff } }] },
      data: { lastExtendNotifiedAt: new Date() },
    });
    return res.count > 0;
  }

  /** Снятие лота с торгов. */
  async withdraw(lotId: string, actorUserId: string): Promise<void> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const lot = await this.lockLot(tx, lotId);
      if (!lot) throw new NotFoundException();
      if (!['upcoming', 'live'].includes(lot.status)) {
        throw new ApiError(ERROR_CODES.LOT_NOT_LIVE, 'Лот уже завершён', HttpStatus.CONFLICT);
      }
      const u = await tx.lot.update({ where: { id: lotId }, data: { status: 'withdrawn' } });
      await tx.auctionEvent.create({ data: { lotId, type: 'withdrawn', actorUserId, payload: {} } });
      return u;
    });
    await this.cancelJobs(lotId);
    this.broadcastStatus(lotId, { lot: lotToTick(updated) });
    const audience = await this.audienceOf(lotId);
    await this.notifications.notifyMany(audience, 'lot_withdrawn', {
      lotId,
      lotTitle: `${updated.make} ${updated.model}`,
    });
    void this.telegram.announceLot('withdrawn', lotId);
  }

  /** Отклонение последней (лидирующей) ставки — обёртка над rejectBid. */
  async rejectLastBid(lotId: string, actorUserId: string): Promise<void> {
    const lot = await this.prisma.lot.findUnique({ where: { id: lotId }, select: { currentBidId: true } });
    if (!lot) throw new NotFoundException();
    if (!lot.currentBidId) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 'Нет ставок для отклонения', HttpStatus.CONFLICT);
    }
    await this.rejectBid(lotId, lot.currentBidId, actorUserId);
  }

  /**
   * Отклонение произвольной ставки менеджером. Под локом лота: ставка помечается
   * отклонённой, лидер/цена/резерв/счётчик пересчитываются из оставшихся ставок —
   * отклонение из середины ленты цену не меняет, отклонение лидера откатывает её.
   */
  async rejectBid(lotId: string, bidId: string, actorUserId: string): Promise<void> {
    const result = await this.prisma.$transaction(async (tx) => {
      const lot = await this.lockLot(tx, lotId);
      if (!lot) throw new NotFoundException();
      const bid = await tx.bid.findFirst({ where: { id: bidId, lotId } });
      if (!bid) throw new NotFoundException('Ставка не найдена');
      if (bid.rejectedAt) {
        throw new ApiError(ERROR_CODES.NOT_FOUND, 'Ставка уже отклонена', HttpStatus.CONFLICT);
      }
      const wasLeader = lot.current_bid_id === bidId;
      await tx.bid.update({
        where: { id: bidId },
        data: { rejectedAt: new Date(), rejectedBy: actorUserId },
      });
      const leader = await tx.bid.findFirst({
        where: { lotId, rejectedAt: null },
        orderBy: { amount: 'desc' },
      });
      const count = await tx.bid.count({ where: { lotId, rejectedAt: null } });
      const updated = await tx.lot.update({
        where: { id: lotId },
        data: {
          currentBidId: leader?.id ?? null,
          currentPrice: leader ? leader.amount : lot.start_price,
          bidCount: count,
          reserveMet: leader ? leader.amount >= lot.reserve_price : false,
        },
      });
      await tx.auctionEvent.create({
        data: {
          lotId,
          type: 'bid_rejected',
          actorUserId,
          payload: { bidId, wasLeader, amount: Number(bid.amount) },
        },
      });
      return { updated, rejectedId: bidId, rejectedBidderId: bid.userId, newLeaderId: leader?.userId ?? null };
    });

    const payload = {
      lot: lotToTick(result.updated),
      rejectedBidId: result.rejectedId,
      rejectedBidderId: result.rejectedBidderId,
      newLeaderId: result.newLeaderId,
    };
    this.realtime.toLot(lotId, WS_EVENTS.BID_REJECTED, payload);
    this.realtime.toCatalog(WS_EVENTS.BID_REJECTED, payload);
    this.realtime.toAdmin(WS_EVENTS.BID_REJECTED, payload);
  }

  private broadcastStatus(lotId: string, event: LotStatusEvent): void {
    this.realtime.toLot(lotId, WS_EVENTS.LOT_STATUS, event);
    this.realtime.toCatalog(WS_EVENTS.LOT_STATUS, event);
    this.realtime.toAdmin(WS_EVENTS.LOT_STATUS, event);
  }

  private async lockLot(tx: Prisma.TransactionClient, lotId: string): Promise<LockedRow | null> {
    const rows = await tx.$queryRaw<LockedRow[]>`
      SELECT id, status, starts_at, ends_at, bid_count, reserve_met, current_bid_id,
             current_price, start_price, reserve_price, fee_rate, make, model
      FROM lots WHERE id = ${lotId}::uuid FOR UPDATE`;
    return rows[0] ?? null;
  }
}
