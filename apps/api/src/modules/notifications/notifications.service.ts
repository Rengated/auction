import { Injectable } from '@nestjs/common';
import type { NotificationType, Prisma } from '@prisma/client';
import { WS_EVENTS, type NotificationDto } from '@hermes/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  /** Создаёт нотификацию в БД и шлёт WS в комнату пользователя. */
  async notify(userId: string, type: NotificationType, payload: Record<string, unknown>): Promise<void> {
    const n = await this.prisma.notification.create({
      data: { userId, type, payload: payload as Prisma.InputJsonObject },
    });
    this.realtime.toUser(userId, WS_EVENTS.NOTIFICATION, this.toDto(n));
  }

  async listFor(userId: string, limit = 50): Promise<NotificationDto[]> {
    const rows = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map((n) => this.toDto(n));
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  private toDto(n: {
    id: string;
    type: NotificationType;
    payload: unknown;
    readAt: Date | null;
    createdAt: Date;
  }): NotificationDto {
    return {
      id: n.id,
      type: n.type,
      payload: (n.payload as Record<string, unknown>) ?? {},
      readAt: n.readAt?.toISOString() ?? null,
      createdAt: n.createdAt.toISOString(),
    };
  }
}
