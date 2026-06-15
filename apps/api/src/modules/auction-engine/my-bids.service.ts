import { Injectable } from '@nestjs/common';
import { PAGE_LIMITS, type MyBidRow, type Page } from '@hermes/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { lotToDto } from '../lots/lot.mapper';

export type { MyBidRow } from '@hermes/shared';

@Injectable()
export class MyBidsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  async list(
    userId: string,
    tab: 'active' | 'won',
    limit: number = PAGE_LIMITS.myBids,
    offset = 0,
  ): Promise<Page<MyBidRow>> {
    const defaults = await this.settings.lotDefaults();

    if (tab === 'won') {
      const [deals, total] = await this.prisma.$transaction([
        this.prisma.deal.findMany({
          where: { winnerUserId: userId },
          include: { lot: { include: { photos: true } } },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        this.prisma.deal.count({ where: { winnerUserId: userId } }),
      ]);
      return {
        items: deals.map((d) => ({
          lot: lotToDto(d.lot, defaults),
          myLastBid: Number(d.amount),
          isLeading: true,
          dealId: d.id,
          dealStatus: d.status,
          feeRate: Number(d.feeRate),
          feeAmount: Number(d.feeAmount),
          amountDue: Number(d.amount) + Number(d.feeAmount),
          dealNote: d.note?.trim() ? d.note : undefined,
          closedAt: d.closedAt?.toISOString() ?? null,
        })),
        total,
        limit,
        offset,
      };
    }

    // Активные: лоты в эфире/ожидании, где у меня есть неотклонённая ставка
    const myBids = await this.prisma.bid.groupBy({
      by: ['lotId'],
      where: { userId, rejectedAt: null, lot: { status: { in: ['live', 'upcoming'] } } },
      _max: { amount: true },
    });
    const total = myBids.length;
    if (total === 0) return { items: [], total, limit, offset };
    const lots = await this.prisma.lot.findMany({
      where: { id: { in: myBids.map((b) => b.lotId) } },
      include: { photos: true, currentBid: { select: { userId: true } } },
      orderBy: { endsAt: 'asc' },
    });
    const maxByLot = new Map(myBids.map((b) => [b.lotId, Number(b._max.amount)]));
    const rows: MyBidRow[] = lots.map((l) => ({
      lot: lotToDto(l, defaults),
      myLastBid: maxByLot.get(l.id) ?? 0,
      isLeading: l.currentBid?.userId === userId,
    }));
    return { items: rows.slice(offset, offset + limit), total, limit, offset };
  }
}
