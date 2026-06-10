import { Injectable } from '@nestjs/common';
import type { LotDto } from '@hermes/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { lotToDto } from '../lots/lot.mapper';

export interface MyBidRow {
  lot: LotDto;
  myLastBid: number;
  isLeading: boolean;
  /** Для выигранных: id сделки */
  dealId?: string;
}

@Injectable()
export class MyBidsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  async list(userId: string, tab: 'active' | 'won'): Promise<MyBidRow[]> {
    const step = await this.settings.defaultBidStep();

    if (tab === 'won') {
      const deals = await this.prisma.deal.findMany({
        where: { winnerUserId: userId },
        include: { lot: { include: { photos: true } } },
        orderBy: { createdAt: 'desc' },
      });
      return deals.map((d) => ({
        lot: lotToDto(d.lot, step),
        myLastBid: Number(d.amount),
        isLeading: true,
        dealId: d.id,
      }));
    }

    // Активные: лоты в эфире/ожидании, где у меня есть неотклонённая ставка
    const myBids = await this.prisma.bid.groupBy({
      by: ['lotId'],
      where: { userId, rejectedAt: null, lot: { status: { in: ['live', 'upcoming'] } } },
      _max: { amount: true },
    });
    if (myBids.length === 0) return [];
    const lots = await this.prisma.lot.findMany({
      where: { id: { in: myBids.map((b) => b.lotId) } },
      include: { photos: true, currentBid: { select: { userId: true } } },
      orderBy: { endsAt: 'asc' },
    });
    const maxByLot = new Map(myBids.map((b) => [b.lotId, Number(b._max.amount)]));
    return lots.map((l) => ({
      lot: lotToDto(l, step),
      myLastBid: maxByLot.get(l.id) ?? 0,
      isLeading: l.currentBid?.userId === userId,
    }));
  }
}
