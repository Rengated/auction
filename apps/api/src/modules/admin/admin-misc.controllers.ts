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
import { CurrentUser, Roles, type AuthUser } from '../../common/decorators';
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
  @IsOptional() @IsIn(['in_progress', 'completed', 'cancelled']) status?: DealStatus;
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
  async list() {
    const deals = await this.prisma.deal.findMany({ include: DEAL_INCLUDE, orderBy: { createdAt: 'desc' } });
    return deals.map(dealToDto);
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
        closedAt: dto.status === 'completed' ? new Date() : dto.status === 'in_progress' ? null : undefined,
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
  @IsOptional() @IsIn(['buyer', 'manager', 'admin']) role?: Role;
  /** ISO-дата, 'perm' (навсегда) или null (снять блокировку) */
  @IsOptional() blockedUntil?: string | null;
  @IsOptional() @IsString() blockReason?: string;
  @IsOptional() @IsString() fullName?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsBoolean() verified?: boolean;
}

const PERMANENT_BLOCK = new Date('9999-01-01');

@Roles('manager', 'admin')
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query('filter') filter = 'all') {
    const now = new Date();
    const where: Prisma.UserWhereInput =
      filter === 'blocked'
        ? { blockedUntil: { gt: now } }
        : filter === 'manager'
          ? { role: { in: ['manager', 'admin'] } }
          : filter === 'buyer'
            ? { role: 'buyer' }
            : {};
    const users = await this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { bids: true, wonDeals: true } } },
    });
    return users.map((u) => ({
      id: u.id,
      name: u.fullName || u.displayName,
      username: u.username,
      isStaff: u.role !== 'buyer',
      phone: u.phone,
      email: u.email,
      role: u.role,
      verified: Boolean(u.contactsFilledAt),
      blockedUntil: u.blockedUntil && u.blockedUntil > now ? u.blockedUntil.toISOString() : null,
      blockPermanent: Boolean(u.blockedUntil && u.blockedUntil >= PERMANENT_BLOCK),
      blockReason: u.blockReason,
      bids: u._count.bids,
      wins: u._count.wonDeals,
      joined: u.createdAt.toISOString(),
    }));
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
        role: dto.role,
        blockedUntil,
        blockReason: dto.blockedUntil === null ? null : dto.blockReason,
        fullName: dto.fullName,
        phone: dto.phone,
        email: dto.email,
        contactsFilledAt: dto.verified === undefined ? undefined : dto.verified ? new Date() : null,
      },
    });
    return { ok: true };
  }

  /** Удаление пользователя — только admin. Запрещено, если есть история торгов
   * (ставки/сделки) или попытка удалить себя — тогда используйте блокировку. */
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
  @IsOptional() @IsString() telegramFooter?: string;
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
      telegramFooter: s.telegramFooter,
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
        telegramFooter: dto.telegramFooter,
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
  async get() {
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);

    const [liveCount, upcomingCount, bidsToday, deals] = await Promise.all([
      this.prisma.lot.count({ where: { status: 'live' } }),
      this.prisma.lot.count({ where: { status: 'upcoming', published: true } }),
      this.prisma.bid.count({ where: { createdAt: { gte: dayStart } } }),
      this.prisma.deal.findMany({ select: { feeAmount: true } }),
    ]);

    // Ставки по дням за неделю
    const weekAgo = new Date(now.getTime() - 6 * 86_400_000);
    weekAgo.setHours(0, 0, 0, 0);
    const weekBids = await this.prisma.bid.findMany({
      where: { createdAt: { gte: weekAgo } },
      select: { createdAt: true },
    });
    const week: number[] = Array(7).fill(0);
    for (const b of weekBids) {
      const idx = Math.floor((b.createdAt.getTime() - weekAgo.getTime()) / 86_400_000);
      if (idx >= 0 && idx < 7) week[idx]++;
    }

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
      liveCount,
      upcomingCount,
      bidsToday,
      commissionTotal: deals.reduce((s, d) => s + Number(d.feeAmount), 0),
      dealsCount: deals.length,
      week,
      activity,
      serverNow: now.toISOString(),
    };
  }
}
