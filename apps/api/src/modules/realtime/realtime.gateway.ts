import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import type { Server, Socket } from 'socket.io';
import { WS_EVENTS } from '@hermes/shared';
import { AuthService } from '../auth/auth.service';
import { RealtimeService } from './realtime.service';

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

@WebSocketGateway({
  cors: {
    origin: [process.env.WEB_ORIGIN ?? 'http://localhost:5173', process.env.ADMIN_ORIGIN ?? 'http://localhost:5174'],
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection {
  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly auth: AuthService,
    private readonly realtime: RealtimeService,
  ) {}

  afterInit(server: Server): void {
    const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
    const pub = new Redis(url, { maxRetriesPerRequest: null });
    const sub = pub.duplicate();
    server.adapter(createAdapter(pub, sub));
    this.realtime.attach(server);
    this.logger.log('Socket.io gateway initialized (redis adapter)');
  }

  /** Анонимам можно смотреть (read-only); авторизованные попадают в user:{id} (+admin по роли). */
  handleConnection(socket: Socket): void {
    socket.join('catalog');
    const token = parseCookies(socket.handshake.headers.cookie).access_token;
    if (!token) return;
    try {
      const payload = this.auth.verifyAccess(token);
      socket.data.userId = payload.sub;
      socket.data.role = payload.role;
      socket.join(`user:${payload.sub}`);
      if (payload.role !== 'buyer') socket.join('admin');
    } catch {
      // протухший токен — остаёмся анонимом
    }
  }

  @SubscribeMessage(WS_EVENTS.JOIN_LOT)
  joinLot(socket: Socket, lotId: string): void {
    if (typeof lotId === 'string' && /^[0-9a-f-]{36}$/.test(lotId)) socket.join(`lot:${lotId}`);
  }

  @SubscribeMessage(WS_EVENTS.LEAVE_LOT)
  leaveLot(socket: Socket, lotId: string): void {
    if (typeof lotId === 'string') socket.leave(`lot:${lotId}`);
  }
}
