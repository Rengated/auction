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
import { lotToTick } from '../lots/lot.mapper';

export const AUCTION_QUEUE = 'auction';
const SWEEP_INTERVAL_MS = 30_000;

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
  }

  async scheduleClose(lotId: string, endsAt: Date): Promise<void> {
    const jobId = `close-${lotId}`;
    await this.queue.remove(jobId).catch(() => undefined);
    await this.queue.add(
      'close',
      { lotId },
      { jobId, delay: Math.max(0, endsAt.getTime() - Date.now()), removeOnComplete: true, removeOnFail: true },
    );
  }

  async cancelJobs(lotId: string): Promise<void> {
    await this.queue.remove(`open-${lotId}`).catch(() => undefined);
    await this.queue.remove(`close-${lotId}`).catch(() => undefined);
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
    const title = `${opened.make} ${opened.model}`;
    for (const f of favs) {
      await this.notifications.notify(f.userId, 'lot_starting', { lotId, lotTitle: title });
    }
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
        const created = await tx.deal.create({
          data: {
            lotId,
            winnerUserId: winningBid.userId,
            winningBidId: winningBid.id,
            amount: winningBid.amount,
            feeRate: settings.feeRate, // снимок комиссии на момент закрытия
            feeAmount: BigInt(Math.round(Number(winningBid.amount) * Number(settings.feeRate))),
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
    return updated.endsAt;
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
  }

  /** Отклонение последней ставки менеджером — откат цены к предыдущей неотклонённой. */
  async rejectLastBid(lotId: string, actorUserId: string): Promise<void> {
    const result = await this.prisma.$transaction(async (tx) => {
      const lot = await this.lockLot(tx, lotId);
      if (!lot) throw new NotFoundException();
      if (!lot.current_bid_id) {
        throw new ApiError(ERROR_CODES.NOT_FOUND, 'Нет ставок для отклонения', HttpStatus.CONFLICT);
      }
      const rejectedId = lot.current_bid_id;
      await tx.bid.update({
        where: { id: rejectedId },
        data: { rejectedAt: new Date(), rejectedBy: actorUserId },
      });
      const prev = await tx.bid.findFirst({
        where: { lotId, rejectedAt: null },
        orderBy: { amount: 'desc' },
      });
      const newPrice = prev ? prev.amount : lot.start_price;
      const updated = await tx.lot.update({
        where: { id: lotId },
        data: {
          currentBidId: prev?.id ?? null,
          currentPrice: newPrice,
          bidCount: { decrement: 1 },
          reserveMet: prev ? prev.amount >= lot.reserve_price : false,
        },
      });
      await tx.auctionEvent.create({
        data: { lotId, type: 'bid_rejected', actorUserId, payload: { bidId: rejectedId } },
      });
      return { updated, rejectedId };
    });

    const payload = { lot: lotToTick(result.updated), rejectedBidId: result.rejectedId };
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
             current_price, start_price, reserve_price, make, model
      FROM lots WHERE id = ${lotId}::uuid FOR UPDATE`;
    return rows[0] ?? null;
  }
}
