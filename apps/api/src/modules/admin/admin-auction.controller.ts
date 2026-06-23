import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { IsInt, IsUUID, Max, Min } from 'class-validator';
import { CurrentUser, Roles, STAFF, type AuthUser } from '../../common/decorators';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LifecycleService } from '../auction-engine/lifecycle.service';

class ExtendDto {
  @IsInt() @Min(5) @Max(3600) seconds!: number;
}

class StepDto {
  @IsInt() @Min(1000) step!: number;
}

class ChooseWinnerDto {
  @IsUUID() userId!: string;
}

@Roles(...STAFF)
@Controller('admin/lots/:id')
export class AdminAuctionController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lifecycle: LifecycleService,
  ) {}

  @Post('extend')
  async extend(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ExtendDto, @CurrentUser() user: AuthUser) {
    const endsAt = await this.lifecycle.extend(id, dto.seconds, user!.id);
    return { endsAt: endsAt.toISOString() };
  }

  @Post('close-early')
  async closeEarly(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    await this.lifecycle.closeLot(id, { force: true, actorUserId: user!.id });
    return { ok: true };
  }

  @Post('withdraw')
  async withdraw(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    await this.lifecycle.withdraw(id, user!.id);
    return { ok: true };
  }

  @Post('reject-last-bid')
  async rejectLastBid(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    await this.lifecycle.rejectLastBid(id, user!.id);
    return { ok: true };
  }

  /** Отклонение конкретной ставки из ленты (не обязательно последней). */
  @Post('bids/:bidId/reject')
  async rejectBid(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('bidId', ParseUUIDPipe) bidId: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.lifecycle.rejectBid(id, bidId, user!.id);
    return { ok: true };
  }

  /** Немедленный запуск upcoming-лота («Запустить сейчас»). */
  @Post('start-now')
  async startNow(@Param('id', ParseUUIDPipe) id: string) {
    await this.prisma.lot.updateMany({ where: { id, status: 'upcoming' }, data: { startsAt: new Date() } });
    await this.lifecycle.openLot(id);
    return { ok: true };
  }

  /** Ручное назначение победителя завершённого лота (резерв не взят / отказ победителя). */
  @Post('choose-winner')
  async chooseWinner(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChooseWinnerDto,
    @CurrentUser() user: AuthUser,
  ) {
    await this.lifecycle.chooseWinner(id, dto.userId, user!.id);
    return { ok: true };
  }

  @Patch('step')
  async setStep(@Param('id', ParseUUIDPipe) id: string, @Body() dto: StepDto, @CurrentUser() user: AuthUser) {
    await this.prisma.lot.update({ where: { id }, data: { bidStep: BigInt(dto.step) } });
    await this.prisma.auctionEvent.create({
      data: { lotId: id, type: 'step_changed', actorUserId: user!.id, payload: { step: dto.step } },
    });
    return { ok: true };
  }

  /** Участники торга с контактами — только для менеджера. */
  @Get('participants')
  async participants(@Param('id', ParseUUIDPipe) id: string) {
    const lot = await this.prisma.lot.findUniqueOrThrow({ where: { id }, select: { currentBidId: true } });
    const grouped = await this.prisma.bid.groupBy({
      by: ['userId'],
      where: { lotId: id, rejectedAt: null },
      _max: { amount: true },
      _count: true,
    });
    const users = await this.prisma.user.findMany({
      where: { id: { in: grouped.map((g) => g.userId) } },
      select: { id: true, displayName: true, fullName: true, phone: true, email: true },
    });
    const leader = lot.currentBidId
      ? (await this.prisma.bid.findUnique({ where: { id: lot.currentBidId } }))?.userId
      : null;
    const byId = new Map(users.map((u) => [u.id, u]));
    return grouped
      .map((g) => ({
        userId: g.userId,
        name: byId.get(g.userId)?.fullName || byId.get(g.userId)?.displayName || '—',
        phone: byId.get(g.userId)?.phone ?? null,
        email: byId.get(g.userId)?.email ?? null,
        maxBid: Number(g._max.amount),
        bids: g._count,
        isLeader: g.userId === leader,
      }))
      .sort((a, b) => b.maxBid - a.maxBid);
  }

  /** Лента ставок с реальными именами — только для менеджера. */
  @Get('feed')
  async feed(@Param('id', ParseUUIDPipe) id: string) {
    const bids = await this.prisma.bid.findMany({
      where: { lotId: id, rejectedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 40,
      include: { user: { select: { displayName: true, fullName: true } } },
    });
    return bids.map((b) => ({
      id: b.id,
      amount: Number(b.amount),
      createdAt: b.createdAt.toISOString(),
      name: b.user.fullName || b.user.displayName,
    }));
  }
}
