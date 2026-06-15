import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { maskBidder, PAGE_LIMITS, type BidRowDto, type LotDto, type Page } from '@hermes/shared';
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

  async catalog(
    filter: CatalogFilter,
    q: string | undefined,
    userId: string | null,
    limit: number = PAGE_LIMITS.catalog,
    offset = 0,
  ): Promise<Page<LotDto>> {
    if (filter === 'fav' && !userId) return { items: [], total: 0, limit, offset };

    const conds: Prisma.Sql[] = [Prisma.sql`l.published = true`, Prisma.sql`l.status <> 'draft'`];
    if (filter === 'live') conds.push(Prisma.sql`l.status = 'live'`);
    if (filter === 'soon') conds.push(Prisma.sql`l.status = 'upcoming'`);
    if (filter === 'done') conds.push(Prisma.sql`l.status IN ('sold', 'finished', 'withdrawn')`);
    if (filter === 'fav') {
      conds.push(
        Prisma.sql`EXISTS (SELECT 1 FROM favorites f WHERE f.lot_id = l.id AND f.user_id = ${userId}::uuid)`,
      );
    }
    if (q) {
      const like = `%${q}%`;
      conds.push(
        Prisma.sql`(l.make ILIKE ${like} OR l.family ILIKE ${like} OR l.model ILIKE ${like})`,
      );
    }
    const whereSql = Prisma.join(conds, ' AND ');

    const rows = await this.prisma.$queryRaw<Array<{ id: string; total: bigint }>>(Prisma.sql`
      SELECT l.id, COUNT(*) OVER() AS total
      FROM lots l
      WHERE ${whereSql}
      ORDER BY CASE l.status WHEN 'live' THEN 0 WHEN 'upcoming' THEN 1 ELSE 2 END, l.ends_at ASC
      LIMIT ${limit} OFFSET ${offset}
    `);

    const total = rows.length ? Number(rows[0].total) : 0;
    const ids = rows.map((r) => r.id);
    if (ids.length === 0) return { items: [], total, limit, offset };

    const lots = await this.prisma.lot.findMany({ where: { id: { in: ids } }, include: { photos: true } });
    const byId = new Map(lots.map((l) => [l.id, l]));
    const ordered = ids.map((id) => byId.get(id)!);

    const favs = userId
      ? new Set(
          (
            await this.prisma.favorite.findMany({ where: { userId, lotId: { in: ids } }, select: { lotId: true } })
          ).map((f) => f.lotId),
        )
      : new Set<string>();
    const defaults = await this.settings.lotDefaults();
    return {
      items: ordered.map((l) => lotToDto(l, defaults, { isFavorite: favs.has(l.id) })),
      total,
      limit,
      offset,
    };
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
