import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  ERROR_CODES,
  WS_EVENTS,
  minNextBid,
  maskBidder,
  type BidPlacedEvent,
  type PlaceBidResponse,
} from '@hermes/shared';
import { ApiError } from '../../common/api-error';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeService } from '../realtime/realtime.service';
import { SettingsService } from '../settings/settings.service';
import { LifecycleService } from './lifecycle.service';

/** Строка lots из SELECT ... FOR UPDATE (snake_case, как в БД). */
interface LockedLotRow {
  id: string;
  status: string;
  start_price: bigint;
  reserve_price: bigint;
  bid_step: bigint | null;
  current_price: bigint;
  current_bid_id: string | null;
  reserve_met: boolean;
  starts_at: Date;
  ends_at: Date;
  bid_count: number;
  make: string;
  model: string;
}

interface PlacedBid {
  bidId: string;
  amount: number;
  createdAt: Date;
  lotAfter: { endsAt: Date; bidCount: number; participantsCount: number; reserveMet: boolean; currentPrice: number; status: string };
  extended: boolean;
  prevLeader: { userId: string; amount: number } | null;
  lotTitle: string;
  duplicate: boolean;
}

@Injectable()
export class BidService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly realtime: RealtimeService,
    private readonly notifications: NotificationsService,
    private readonly lifecycle: LifecycleService,
  ) {}

  async placeBid(lotId: string, userId: string, amount: number, clientBidId: string): Promise<PlaceBidResponse> {
    const settings = await this.settings.get();

    const placed = await this.prisma.$transaction(
      async (tx) => this.placeBidTx(tx, lotId, userId, amount, clientBidId, settings),
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );

    // Побочные эффекты строго после коммита
    if (!placed.duplicate) {
      const tick = {
        id: lotId,
        status: placed.lotAfter.status as never,
        currentPrice: placed.lotAfter.currentPrice,
        bidCount: placed.lotAfter.bidCount,
        participantsCount: placed.lotAfter.participantsCount,
        reserveMet: placed.lotAfter.reserveMet,
        endsAt: placed.lotAfter.endsAt.toISOString(),
        serverNow: new Date().toISOString(),
      };
      const event: BidPlacedEvent = {
        lot: tick,
        bid: {
          id: placed.bidId,
          amount: placed.amount,
          createdAt: placed.createdAt.toISOString(),
          bidderLabel: maskBidder(userId),
          bidderId: userId,
        },
      };
      this.realtime.toLot(lotId, WS_EVENTS.BID_PLACED, event);
      this.realtime.toCatalog(WS_EVENTS.BID_PLACED, event);
      this.realtime.toAdmin(WS_EVENTS.BID_PLACED, event);

      if (placed.extended) {
        await this.lifecycle.scheduleClose(lotId, placed.lotAfter.endsAt);
        const ext = { lotId, endsAt: placed.lotAfter.endsAt.toISOString(), serverNow: new Date().toISOString() };
        this.realtime.toLot(lotId, WS_EVENTS.LOT_EXTENDED, ext);
        this.realtime.toCatalog(WS_EVENTS.LOT_EXTENDED, ext);

        // «Торги продлены» участникам (кроме автора продлившей ставки).
        // Троттлинг: при серии анти-снайп продлений push шлём не чаще раза в
        // extendThrottleSec — иначе 10 продлений = 10 уведомлений.
        if (await this.lifecycle.shouldNotifyExtend(lotId)) {
          const bidders = await this.prisma.bid.groupBy({ by: ['userId'], where: { lotId, rejectedAt: null } });
          await this.notifications.notifyMany(
            bidders.map((b) => b.userId).filter((id) => id !== userId),
            'lot_extended',
            { lotId, lotTitle: placed.lotTitle, endsAt: placed.lotAfter.endsAt.toISOString(), reason: 'antisnipe' },
          );
        }
      }

      if (placed.prevLeader && placed.prevLeader.userId !== userId) {
        const outbid = {
          lotId,
          lotTitle: placed.lotTitle,
          yourAmount: placed.prevLeader.amount,
          newAmount: placed.amount,
        };
        this.realtime.toUser(placed.prevLeader.userId, WS_EVENTS.OUTBID, outbid);
        await this.notifications.notify(placed.prevLeader.userId, 'outbid', outbid);
      }
    }

    return {
      bid: {
        id: placed.bidId,
        amount: placed.amount,
        createdAt: placed.createdAt.toISOString(),
        bidderLabel: 'Вы',
        isMine: true,
      },
      lot: {
        id: lotId,
        status: placed.lotAfter.status as never,
        currentPrice: placed.lotAfter.currentPrice,
        bidCount: placed.lotAfter.bidCount,
        participantsCount: placed.lotAfter.participantsCount,
        reserveMet: placed.lotAfter.reserveMet,
        endsAt: placed.lotAfter.endsAt.toISOString(),
        serverNow: new Date().toISOString(),
      },
    };
  }

  private async placeBidTx(
    tx: Prisma.TransactionClient,
    lotId: string,
    userId: string,
    amount: number,
    clientBidId: string,
    settings: { defaultBidStep: bigint; antisnipeEnabled: boolean; antisnipeWindowSec: number; antisnipeExtensionSec: number },
  ): Promise<PlacedBid> {
    // Row-lock сериализует все ставки по лоту
    const rows = await tx.$queryRaw<LockedLotRow[]>`
      SELECT id, status, start_price, reserve_price, bid_step, current_price, current_bid_id,
             reserve_met, starts_at, ends_at, bid_count, make, model
      FROM lots WHERE id = ${lotId}::uuid FOR UPDATE`;
    const lot = rows[0];
    if (!lot) throw new NotFoundException();

    const lotTitle = `${lot.make} ${lot.model}`;
    const now = new Date();

    // Идемпотентность: ретрай того же clientBidId возвращает исходный результат
    const existing = await tx.bid.findUnique({
      where: { lotId_clientBidId: { lotId, clientBidId } },
    });
    if (existing) {
      const fresh = await tx.lot.findUniqueOrThrow({ where: { id: lotId } });
      return {
        bidId: existing.id,
        amount: Number(existing.amount),
        createdAt: existing.createdAt,
        lotAfter: {
          endsAt: fresh.endsAt,
          bidCount: fresh.bidCount,
          participantsCount: fresh.participantsCount,
          reserveMet: fresh.reserveMet,
          currentPrice: Number(fresh.currentPrice),
          status: fresh.status,
        },
        extended: false,
        prevLeader: null,
        lotTitle,
        duplicate: true,
      };
    }

    if (lot.status !== 'live' || now < lot.starts_at || now >= lot.ends_at) {
      throw new ApiError(ERROR_CODES.LOT_NOT_LIVE, 'Торги по лоту не идут', HttpStatus.CONFLICT, {
        status: lot.status,
        endsAt: lot.ends_at.toISOString(),
        serverNow: now.toISOString(),
      });
    }

    const step = Number(lot.bid_step ?? settings.defaultBidStep);
    const minNext = minNextBid(Number(lot.current_price), Number(lot.start_price), lot.bid_count, step);

    if (lot.current_bid_id) {
      const currentBid = await tx.bid.findUnique({ where: { id: lot.current_bid_id } });
      if (currentBid?.userId === userId) {
        throw new ApiError(ERROR_CODES.ALREADY_LEADING, 'Ваша ставка уже лидирует', HttpStatus.CONFLICT, {
          currentPrice: Number(lot.current_price),
        });
      }
    }

    if (!Number.isInteger(amount) || amount < minNext) {
      throw new ApiError(ERROR_CODES.BID_TOO_LOW, `Минимальная ставка — ${minNext.toLocaleString('ru-RU')} ₽`, HttpStatus.CONFLICT, {
        currentPrice: Number(lot.current_price),
        minNextBid: minNext,
        step,
        endsAt: lot.ends_at.toISOString(),
        serverNow: now.toISOString(),
      });
    }

    // Предыдущий лидер — для нотификации outbid (читаем до перезаписи)
    let prevLeader: { userId: string; amount: number } | null = null;
    if (lot.current_bid_id) {
      const prev = await tx.bid.findUnique({ where: { id: lot.current_bid_id } });
      if (prev) prevLeader = { userId: prev.userId, amount: Number(prev.amount) };
    }

    const bid = await tx.bid.create({
      data: { lotId, userId, amount: BigInt(amount), clientBidId },
    });

    // Антиснайпинг: ставка в последние N секунд продлевает торги
    let endsAt = lot.ends_at;
    let extended = false;
    if (settings.antisnipeEnabled) {
      const leftMs = lot.ends_at.getTime() - now.getTime();
      if (leftMs <= settings.antisnipeWindowSec * 1000) {
        const candidate = new Date(now.getTime() + settings.antisnipeExtensionSec * 1000);
        if (candidate > endsAt) {
          endsAt = candidate;
          extended = true;
        }
      }
    }

    // Уникальные участники (включая только что созданную ставку) — держим в синхроне с bidCount.
    const participants = await tx.bid.groupBy({ by: ['userId'], where: { lotId, rejectedAt: null } });

    const reserveMet = BigInt(amount) >= lot.reserve_price;
    const updated = await tx.lot.update({
      where: { id: lotId },
      data: {
        currentPrice: BigInt(amount),
        currentBidId: bid.id,
        bidCount: { increment: 1 },
        participantsCount: participants.length,
        reserveMet,
        endsAt,
      },
    });

    if (extended) {
      await tx.auctionEvent.create({
        data: {
          lotId,
          type: 'extended',
          payload: { reason: 'antisnipe', endsAt: endsAt.toISOString(), bidId: bid.id },
        },
      });
    }

    return {
      bidId: bid.id,
      amount,
      createdAt: bid.createdAt,
      lotAfter: {
        endsAt: updated.endsAt,
        bidCount: updated.bidCount,
        participantsCount: updated.participantsCount,
        reserveMet: updated.reserveMet,
        currentPrice: Number(updated.currentPrice),
        status: updated.status,
      },
      extended,
      prevLeader,
      lotTitle,
      duplicate: false,
    };
  }
}
