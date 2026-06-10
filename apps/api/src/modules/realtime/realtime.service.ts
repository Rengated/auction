import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';

/** Тонкая обёртка над socket.io server — точка эмита для движка торгов. */
@Injectable()
export class RealtimeService {
  private server: Server | null = null;

  attach(server: Server): void {
    this.server = server;
  }

  toLot(lotId: string, event: string, payload: unknown): void {
    this.server?.to(`lot:${lotId}`).emit(event, payload);
  }

  toCatalog(event: string, payload: unknown): void {
    this.server?.to('catalog').emit(event, payload);
  }

  toUser(userId: string, event: string, payload: unknown): void {
    this.server?.to(`user:${userId}`).emit(event, payload);
  }

  toAdmin(event: string, payload: unknown): void {
    this.server?.to('admin').emit(event, payload);
  }
}
