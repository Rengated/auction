import { Injectable } from '@nestjs/common';
import type { Settings } from '@prisma/client';
import type { AuctionSettingsDto, PublicConfigDto } from '@hermes/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Настройки читаются на каждую операцию — без кэша, чтобы изменения применялись сразу. */
  async get(): Promise<Settings> {
    const row = await this.prisma.settings.findUnique({ where: { id: 1 } });
    if (row) return row;
    return this.prisma.settings.create({ data: { id: 1 } });
  }

  async defaultBidStep(): Promise<number> {
    return Number((await this.get()).defaultBidStep);
  }

  /** Глобальные дефолты для полей, переопределяемых на лоте (одним запросом). */
  async lotDefaults(): Promise<{ bidStep: number; feeRate: number }> {
    const s = await this.get();
    return { bidStep: Number(s.defaultBidStep), feeRate: Number(s.feeRate) };
  }

  async toDto(): Promise<AuctionSettingsDto> {
    const s = await this.get();
    return {
      feeRate: Number(s.feeRate),
      defaultBidStep: Number(s.defaultBidStep),
      antisnipeEnabled: s.antisnipeEnabled,
      antisnipeWindowSec: s.antisnipeWindowSec,
      antisnipeExtensionSec: s.antisnipeExtensionSec,
    };
  }

  async publicConfig(): Promise<PublicConfigDto> {
    const s = await this.get();
    return {
      feeRate: Number(s.feeRate),
      defaultBidStep: Number(s.defaultBidStep),
      vapidPublicKey: process.env.VAPID_PUBLIC_KEY || null,
      managerContacts: (s.managerContacts ?? {}) as PublicConfigDto['managerContacts'],
    };
  }

  async update(patch: Partial<AuctionSettingsDto> & { managerContacts?: Record<string, unknown> }) {
    await this.get();
    return this.prisma.settings.update({
      where: { id: 1 },
      data: {
        feeRate: patch.feeRate,
        defaultBidStep: patch.defaultBidStep != null ? BigInt(patch.defaultBidStep) : undefined,
        antisnipeEnabled: patch.antisnipeEnabled,
        antisnipeWindowSec: patch.antisnipeWindowSec,
        antisnipeExtensionSec: patch.antisnipeExtensionSec,
        managerContacts: patch.managerContacts as object | undefined,
      },
    });
  }
}
