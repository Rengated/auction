import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { maskBidder, type BidRowDto, type LotDto } from '@hermes/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { lotToDto } from './lot.mapper';

export type CatalogFilter = 'all' | 'live' | 'soon' | 'done' | 'fav';

@Injectable()
export class LotsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  async catalog(filter: CatalogFilter, q: string | undefined, userId: string | null): Promise<LotDto[]> {
    const where: Prisma.LotWhereInput = { published: true, status: { not: 'draft' } };
    if (filter === 'live') where.status = 'live';
    if (filter === 'soon') where.status = 'upcoming';
    if (filter === 'done') where.status = { in: ['sold', 'finished', 'withdrawn'] };
    if (filter === 'fav') {
      if (!userId) return [];
      where.favorites = { some: { userId } };
    }
    if (q) {
      where.OR = ['make', 'family', 'model'].map((f) => ({
        [f]: { contains: q, mode: 'insensitive' as const },
      }));
    }
    const lots = await this.prisma.lot.findMany({
      where,
      include: { photos: true },
      orderBy: [{ status: 'asc' }, { endsAt: 'asc' }],
    });
    // Порядок групп: live → upcoming → завершённые (как в дизайне)
    const rank = { live: 0, upcoming: 1, sold: 2, finished: 2, withdrawn: 2, draft: 3 } as const;
    lots.sort((a, b) => rank[a.status] - rank[b.status] || a.endsAt.getTime() - b.endsAt.getTime());

    const favs = userId
      ? new Set(
          (await this.prisma.favorite.findMany({ where: { userId }, select: { lotId: true } })).map((f) => f.lotId),
        )
      : new Set<string>();
    const defaults = await this.settings.lotDefaults();
    return lots.map((l) => lotToDto(l, defaults, { isFavorite: favs.has(l.id) }));
  }

  async byId(id: string, userId: string | null): Promise<LotDto> {
    const lot = await this.prisma.lot.findUnique({ where: { id }, include: { photos: true } });
    if (!lot || (!lot.published && !userId)) throw new NotFoundException();
    const defaults = await this.settings.lotDefaults();

    let extra: { isFavorite?: boolean; my?: { isLeading: boolean; lastBid: number | null } } = {};
    if (userId) {
      const [fav, myLast, current] = await Promise.all([
        this.prisma.favorite.findUnique({ where: { userId_lotId: { userId, lotId: id } } }),
        this.prisma.bid.findFirst({
          where: { lotId: id, userId, rejectedAt: null },
          orderBy: { amount: 'desc' },
        }),
        lot.currentBidId
          ? this.prisma.bid.findUnique({ where: { id: lot.currentBidId } })
          : Promise.resolve(null),
      ]);
      extra = {
        isFavorite: Boolean(fav),
        my: { isLeading: current?.userId === userId, lastBid: myLast ? Number(myLast.amount) : null },
      };
    }
    return lotToDto(lot, defaults, extra);
  }

  /** Публичная лента ставок — имена маскированы, свои подсвечены. */
  async bidsFeed(lotId: string, userId: string | null, limit = 30): Promise<BidRowDto[]> {
    const bids = await this.prisma.bid.findMany({
      where: { lotId, rejectedAt: null },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { user: { select: { id: true, displayName: true } } },
    });
    return bids.map((b) => ({
      id: b.id,
      amount: Number(b.amount),
      createdAt: b.createdAt.toISOString(),
      bidderLabel: b.userId === userId ? b.user.displayName : maskBidder(b.userId),
      isMine: b.userId === userId,
    }));
  }

  async setFavorite(lotId: string, userId: string, on: boolean): Promise<void> {
    const lot = await this.prisma.lot.findUnique({ where: { id: lotId }, select: { id: true } });
    if (!lot) throw new NotFoundException();
    if (on) {
      await this.prisma.favorite.upsert({
        where: { userId_lotId: { userId, lotId } },
        create: { userId, lotId },
        update: {},
      });
    } else {
      await this.prisma.favorite.deleteMany({ where: { userId, lotId } });
    }
  }
}
