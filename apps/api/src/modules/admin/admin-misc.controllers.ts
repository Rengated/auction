import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Prisma, type DealStatus, type Role } from '@prisma/client';
import { IsBoolean, IsIn, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, IsInt, Min, MinLength } from 'class-validator';
import { PAGE_LIMITS } from '@hermes/shared';
import { CurrentUser, Roles, type AuthUser } from '../../common/decorators';
import { PageQueryDto } from '../../common/pagination.dto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { photoToDto } from '../lots/lot.mapper';
import { NotificationsService } from '../notifications/notifications.service';
import { SettingsService } from '../settings/settings.service';

function dealToDto(d: {
  id: string;
  lot: { id: string; make: string; model: string; photos: Parameters<typeof photoToDto>[0][] };
  winner: { id: string; fullName: string | null; displayName: string; phone: string | null; email: string | null };
  amount: bigint;
  feeRate: Prisma.Decimal;
  feeAmount: bigint;
  status: DealStatus;
  note: string;
  createdAt: Date;
  closedAt: Date | null;
}) {
  return {
    id: d.id,
    lotId: d.lot.id,
    lotTitle: `${d.lot.make} ${d.lot.model}`,
    photo: d.lot.photos[0] ? photoToDto(d.lot.photos[0]).card : null,
    winner: {
      id: d.winner.id,
      name: d.winner.fullName || d.winner.displayName,
      phone: d.winner.phone,
      email: d.winner.email,
    },
    amount: Number(d.amount),
    feeRate: Number(d.feeRate),
    feeAmount: Number(d.feeAmount),
    status: d.status,
    note: d.note,
    createdAt: d.createdAt.toISOString(),
    closedAt: d.closedAt?.toISOString() ?? null,
  };
}

const DEAL_INCLUDE = {
  lot: { include: { photos: true } },
  winner: true,
} as const;

class DealPatchDto {
  @IsOptional() @IsIn(['won', 'contacted', 'signed', 'delivered', 'cancelled']) status?: DealStatus;
  @IsOptional() @IsString() note?: string;
}

@Roles('manager', 'admin')
@Controller('admin/deals')
export class AdminDealsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @Get()
  async list(@Query() page: PageQueryDto) {
    const limit = page.limit ?? PAGE_LIMITS.admin;
    const offset = page.offset ?? 0;
    const [deals, total] = await this.prisma.$transaction([
      this.prisma.deal.findMany({
        include: DEAL_INCLUDE,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.deal.count(),
    ]);
    return { items: deals.map(dealToDto), total, limit, offset };
  }

  @Get(':id')
  async byId(@Param('id', ParseUUIDPipe) id: string) {
    const deal = await this.prisma.deal.findUnique({ where: { id }, include: DEAL_INCLUDE });
    if (!deal) throw new NotFoundException();
    return dealToDto(deal);
  }

  @Patch(':id')
  async patch(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DealPatchDto) {
    const before = await this.prisma.deal.findUnique({ where: { id }, select: { status: true } });
    if (!before) throw new NotFoundException();
    const deal = await this.prisma.deal.update({
      where: { id },
      data: {
        status: dto.status,
        note: dto.note,
        // closedAt = дата выдачи: ставим при delivered, снимаем при откате на ранний этап.
        closedAt:
          dto.status === 'delivered' ? new Date() : dto.status && dto.status !== 'cancelled' ? null : undefined,
      },
      include: DEAL_INCLUDE,
    });
    if (dto.status && dto.status !== before.status) {
      await this.notifications.notify(deal.winnerUserId, 'deal_update', {
        lotId: deal.lot.id,
        lotTitle: `${deal.lot.make} ${deal.lot.model}`,
        dealId: deal.id,
        status: deal.status,
      });
    }
    return dealToDto(deal);
  }
}

class UserPatchDto {
  // Роль покупателя не меняется через этот эндпоинт: покупатель всегда buyer,
  // персонал управляется отдельно в /admin/staff (только admin). См. 7b/7c.
  /** ISO-дата, 'perm' (навсегда) или null (снять блокировку) */
  @IsOptional() blockedUntil?: string | null;
  @IsOptional() @IsString() blockReason?: string;
  @IsOptional() @IsString() fullName?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
}

const PERMANENT_BLOCK = new Date('9999-01-01');

@Roles('manager', 'admin')
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query('filter') filter = 'all', @Query() page: PageQueryDto) {
    const limit = page.limit ?? PAGE_LIMITS.admin;
    const offset = page.offset ?? 0;
    const now = new Date();
    // Архивные скрыты из всех списков, кроме явного фильтра 'archived'.
    const notArchived = { archivedAt: null };
    const where: Prisma.UserWhereInput =
      filter === 'archived'
        ? { archivedAt: { not: null } }
        : filter === 'blocked'
          ? { ...notArchived, blockedUntil: { gt: now } }
          : filter === 'manager'
            ? { ...notArchived, role: { in: ['manager', 'admin'] } }
            : filter === 'buyer'
              ? { ...notArchived, role: 'buyer' }
              : notArchived;
    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { bids: true, wonDeals: true } } },
        take: limit,
        skip: offset,
      }),
      this.prisma.user.count({ where }),
    ]);
    const items = users.map((u) => ({
      id: u.id,
      name: u.fullName || u.displayName,
      username: u.username,
      isStaff: u.role !== 'buyer',
      phone: u.phone,
      email: u.email,
      role: u.role,
      verified: Boolean(u.fullName && u.phone && u.email),
      blockedUntil: u.blockedUntil && u.blockedUntil > now ? u.blockedUntil.toISOString() : null,
      blockPermanent: Boolean(u.blockedUntil && u.blockedUntil >= PERMANENT_BLOCK),
      blockReason: u.blockReason,
      archived: Boolean(u.archivedAt),
      bids: u._count.bids,
      wins: u._count.wonDeals,
      joined: u.createdAt.toISOString(),
    }));
    return { items, total, limit, offset };
  }

  @Patch(':id')
  async patch(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UserPatchDto) {
    const blockedUntil =
      dto.blockedUntil === undefined
        ? undefined
        : dto.blockedUntil === null
          ? null
          : dto.blockedUntil === 'perm'
            ? PERMANENT_BLOCK
            : new Date(dto.blockedUntil);
    await this.prisma.user.update({
      where: { id },
      data: {
        blockedUntil,
        blockReason: dto.blockedUntil === null ? null : dto.blockReason,
        fullName: dto.fullName,
        phone: dto.phone,
        email: dto.email,
      },
    });
    return { ok: true };
  }

  /** Архивация (мягкое скрытие). Для персонала это ещё и запрет входа (см. auth). */
  @Post(':id/archive')
  async archive(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthUser) {
    if (actor!.id === id) throw new BadRequestException('Нельзя архивировать свой аккаунт');
    await this.prisma.user.update({ where: { id }, data: { archivedAt: new Date() } });
    return { ok: true };
  }

  @Post(':id/unarchive')
  async unarchive(@Param('id', ParseUUIDPipe) id: string) {
    await this.prisma.user.update({ where: { id }, data: { archivedAt: null } });
    return { ok: true };
  }

  /** Удаление пользователя — только admin. Запрещено, если есть история торгов
   * (ставки/сделки) или попытка удалить себя — тогда используйте блокировку/архив. */
  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthUser) {
    if (actor!.role !== 'admin') throw new ForbiddenException('Удаление доступно только администратору');
    if (actor!.id === id) throw new BadRequestException('Нельзя удалить свой аккаунт');
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { _count: { select: { bids: true, wonDeals: true, managedDeals: true } } },
    });
    if (!user) throw new NotFoundException();
    if (user._count.bids > 0 || user._count.wonDeals > 0 || user._count.managedDeals > 0) {
      throw new ConflictException(
        'У пользователя есть история торгов или сделки — удаление недоступно, используйте блокировку',
      );
    }
    // favorites/notifications/push/refreshTokens удалятся каскадно (onDelete: Cascade)
    await this.prisma.user.delete({ where: { id } });
    return { ok: true };
  }
}

class CreateStaffDto {
  @IsString() @IsNotEmpty() username!: string;
  @IsString() @MinLength(6) password!: string;
  @IsString() @IsNotEmpty() displayName!: string;
  @IsIn(['manager', 'admin']) role!: Role;
}

class SetPasswordDto {
  @IsString() @MinLength(6) password!: string;
}

class StaffPatchDto {
  @IsOptional() @IsString() @IsNotEmpty() displayName?: string;
  @IsOptional() @IsIn(['manager', 'admin']) role?: Role;
}

/** Управление персоналом (admin/manager-аккаунты) — только для role=admin. */
@Roles('admin')
@Controller('admin/staff')
export class AdminStaffController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  @Post()
  async create(@Body() dto: CreateStaffDto) {
    const exists = await this.prisma.user.findUnique({ where: { username: dto.username } });
    if (exists) throw new BadRequestException('Логин уже занят');
    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        passwordHash: await this.auth.hashPassword(dto.password),
        displayName: dto.displayName,
        role: dto.role,
        contactsFilledAt: new Date(),
      },
    });
    return { id: user.id };
  }

  @Patch(':id/password')
  async setPassword(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetPasswordDto) {
    const u = await this.prisma.user.findUnique({ where: { id } });
    if (!u || u.role === 'buyer') throw new BadRequestException('Не сотрудник');
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash: await this.auth.hashPassword(dto.password) },
    });
    return { ok: true };
  }

  /** Редактирование сотрудника: имя и роль (manager/admin). Покупателя не трогаем. */
  @Patch(':id')
  async patch(@Param('id', ParseUUIDPipe) id: string, @Body() dto: StaffPatchDto, @CurrentUser() actor: AuthUser) {
    const u = await this.prisma.user.findUnique({ where: { id } });
    if (!u || u.role === 'buyer') throw new BadRequestException('Не сотрудник');
    // Нельзя понизить самого себя в роли (иначе можно потерять доступ к админке).
    if (actor!.id === id && dto.role && dto.role !== u.role) {
      throw new BadRequestException('Нельзя изменить свою роль');
    }
    await this.prisma.user.update({
      where: { id },
      data: { displayName: dto.displayName, role: dto.role },
    });
    return { ok: true };
  }
}

class SettingsPutDto {
  @IsOptional() @IsNumber() @Min(0) feeRate?: number;
  @IsOptional() @IsInt() @Min(1000) defaultBidStep?: number;
  @IsOptional() @IsBoolean() antisnipeEnabled?: boolean;
  @IsOptional() @IsInt() @Min(5) antisnipeWindowSec?: number;
  @IsOptional() @IsInt() @Min(5) antisnipeExtensionSec?: number;
  @IsOptional() @IsObject() managerContacts?: Record<string, unknown>;
  @IsOptional() @IsObject() notificationToggles?: Record<string, unknown>;
  @IsOptional() @IsString() telegramBotToken?: string;
  @IsOptional() @IsString() telegramChannelId?: string;
  @IsOptional() @IsString() telegramContact?: string;
  @IsOptional() @IsObject() tgEventToggles?: Record<string, unknown>;
}

@Roles('manager', 'admin')
@Controller('admin/settings')
export class AdminSettingsController {
  constructor(
    private readonly settings: SettingsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async get() {
    const s = await this.settings.get();
    return {
      feeRate: Number(s.feeRate),
      defaultBidStep: Number(s.defaultBidStep),
      antisnipeEnabled: s.antisnipeEnabled,
      antisnipeWindowSec: s.antisnipeWindowSec,
      antisnipeExtensionSec: s.antisnipeExtensionSec,
      managerContacts: s.managerContacts,
      notificationToggles: s.notificationToggles,
      telegramBotToken: s.telegramBotToken,
      telegramChannelId: s.telegramChannelId,
      telegramContact: s.telegramContact,
      tgEventToggles: s.tgEventToggles,
    };
  }

  @Put()
  async put(@Body() dto: SettingsPutDto) {
    await this.settings.get();
    await this.prisma.settings.update({
      where: { id: 1 },
      data: {
        feeRate: dto.feeRate,
        defaultBidStep: dto.defaultBidStep != null ? BigInt(dto.defaultBidStep) : undefined,
        antisnipeEnabled: dto.antisnipeEnabled,
        antisnipeWindowSec: dto.antisnipeWindowSec,
        antisnipeExtensionSec: dto.antisnipeExtensionSec,
        managerContacts: dto.managerContacts as Prisma.InputJsonObject | undefined,
        notificationToggles: dto.notificationToggles as Prisma.InputJsonObject | undefined,
        telegramBotToken: dto.telegramBotToken,
        telegramChannelId: dto.telegramChannelId,
        telegramContact: dto.telegramContact,
        tgEventToggles: dto.tgEventToggles as Prisma.InputJsonObject | undefined,
      },
    });
    return this.get();
  }
}

@Roles('manager', 'admin')
@Controller('admin/dashboard')
export class AdminDashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async get(@Query('from') fromRaw?: string, @Query('to') toRaw?: string) {
    const now = new Date();
    // Диапазон: дефолт — последние 7 дней. Валидируем, иначе откатываем к дефолту.
    const parse = (s: string | undefined): Date | null => {
      if (!s) return null;
      const d = new Date(s);
      return Number.isNaN(d.getTime()) ? null : d;
    };
    const to = parse(toRaw) ?? now;
    const from = parse(fromRaw) ?? new Date(to.getTime() - 6 * 86_400_000);
    const range = { gte: from, lte: to };
    // Число дневных бакетов для трендов (1..31, по фактическому окну).
    const dayMs = 86_400_000;
    const fromDay = new Date(from);
    fromDay.setHours(0, 0, 0, 0);
    const buckets = Math.min(31, Math.max(1, Math.floor((to.getTime() - fromDay.getTime()) / dayMs) + 1));
    const bucketIdx = (d: Date) => Math.floor((d.getTime() - fromDay.getTime()) / dayMs);

    // Текущее состояние — НЕ зависит от диапазона (это «сейчас»).
    const [liveCount, upcomingCount] = await Promise.all([
      this.prisma.lot.count({ where: { status: 'live' } }),
      this.prisma.lot.count({ where: { status: 'upcoming', published: true } }),
    ]);

    // Ставки по дням за период
    const periodBids = await this.prisma.bid.findMany({
      where: { createdAt: range },
      select: { createdAt: true },
    });
    const week: number[] = Array(buckets).fill(0);
    for (const b of periodBids) {
      const idx = bucketIdx(b.createdAt);
      if (idx >= 0 && idx < buckets) week[idx]++;
    }

    // ── Финансы (только выданные машины: status=delivered по дате выдачи closedAt) ──
    const deliveredWhere = { status: 'delivered' as const, closedAt: range };
    const [moneyAgg, deliveredList, newUsersPeriod, usersPeriod, lotStatusGroups, bidStats] =
      await Promise.all([
        this.prisma.deal.aggregate({ where: deliveredWhere, _sum: { amount: true, feeAmount: true }, _avg: { amount: true }, _count: true }),
        this.prisma.deal.findMany({ where: deliveredWhere, select: { amount: true, closedAt: true } }),
        this.prisma.user.count({ where: { role: 'buyer', createdAt: range } }),
        this.prisma.user.findMany({ where: { role: 'buyer', createdAt: range }, select: { createdAt: true } }),
        // Конверсия/резерв — по лотам, закрытым в периоде (по endsAt).
        this.prisma.lot.groupBy({ by: ['status'], _count: true, where: { status: { in: ['sold', 'finished', 'withdrawn'] }, endsAt: range } }),
        this.prisma.bid.aggregate({ where: { createdAt: range }, _count: { _all: true } }),
      ]);

    // Тренды по дням (оборот выданных и регистрации)
    const turnoverWeek: number[] = Array(buckets).fill(0);
    for (const d of deliveredList) {
      if (!d.closedAt) continue;
      const idx = bucketIdx(d.closedAt);
      if (idx >= 0 && idx < buckets) turnoverWeek[idx] += Number(d.amount);
    }
    const registrationsWeek: number[] = Array(buckets).fill(0);
    for (const u of usersPeriod) {
      const idx = bucketIdx(u.createdAt);
      if (idx >= 0 && idx < buckets) registrationsWeek[idx]++;
    }

    // ── Качество (в пределах периода) ────────────────────────────────────
    const cnt = (s: string) => lotStatusGroups.find((g) => g.status === s)?._count ?? 0;
    const sold = cnt('sold');
    const finished = cnt('finished');
    const withdrawn = cnt('withdrawn');
    const closedTotal = sold + finished + withdrawn;
    // Конверсия в продажу — по РЕАЛЬНОЙ выдаче (delivered), а не по факту закрытия
    // торгов: доля выданных машин среди всех завершённых в периоде торгов.
    const deliveredCount = moneyAgg._count;
    // Кэп 100%: выдача и закрытие торгов считаются по разным датам (closedAt vs endsAt),
    // поэтому в коротком окне выданных может оказаться больше, чем закрытых.
    const conversionRate = closedTotal > 0 ? Math.min(100, Math.round((deliveredCount / closedTotal) * 100)) : 0;
    // Взят резерв — про аукцион (резерв достигнут на закрытии), остаётся по торгам.
    const reserveRate = sold + finished > 0 ? Math.round((sold / (sold + finished)) * 100) : 0;

    const rejectedPeriod = await this.prisma.bid.count({ where: { createdAt: range, rejectedAt: { not: null } } });
    const bidsPeriodTotal = bidStats._count._all;
    const rejectionRate = bidsPeriodTotal > 0 ? Math.round((rejectedPeriod / bidsPeriodTotal) * 100) : 0;

    // Последние события: ставки + системные события движка
    const [recentBids, recentEvents] = await Promise.all([
      this.prisma.bid.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { lot: { select: { make: true, model: true } } },
      }),
      this.prisma.auctionEvent.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { lot: { select: { make: true, model: true } } },
      }),
    ]);
    const activity = [
      ...recentBids.map((b) => ({
        type: 'bid',
        title: 'Новая ставка',
        detail: `${b.lot.make} ${b.lot.model} · ${Number(b.amount).toLocaleString('ru-RU')} ₽`,
        at: b.createdAt.toISOString(),
      })),
      ...recentEvents.map((e) => ({
        type: e.type,
        title:
          e.type === 'closed'
            ? (e.payload as { status?: string })?.status === 'sold'
              ? 'Лот продан'
              : 'Торги завершены'
            : e.type === 'opened'
              ? 'Старт торгов'
              : e.type === 'extended'
                ? 'Торги продлены'
                : 'Событие',
        detail: `${e.lot.make} ${e.lot.model}`,
        at: e.createdAt.toISOString(),
      })),
    ]
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 8);

    return {
      // Эхо диапазона (для отображения и кэш-ключа)
      from: from.toISOString(),
      to: to.toISOString(),
      // Текущее состояние (не зависит от диапазона)
      liveCount,
      upcomingCount,
      // За период
      bidsToday: bidsPeriodTotal,
      // Деньги — только выданные машины (delivered) в пределах диапазона по дате выдачи
      commissionTotal: Number(moneyAgg._sum.feeAmount ?? 0),
      dealsCount: moneyAgg._count,
      week,
      activity,
      // Финансы
      totalTurnover: Number(moneyAgg._sum.amount ?? 0),
      avgDeal: Math.round(Number(moneyAgg._avg.amount ?? 0)),
      commissionMonth: Number(moneyAgg._sum.feeAmount ?? 0),
      turnoverWeek,
      // Качество
      conversionRate,
      reserveRate,
      rejectionRate,
      newRegistrations: newUsersPeriod,
      registrationsWeek,
      serverNow: now.toISOString(),
    };
  }
}
