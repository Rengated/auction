import { io, type Socket } from 'socket.io-client';
import { useEffect } from 'react';
import type { InfiniteData } from '@tanstack/react-query';
import {
  WS_EVENTS,
  type BidPlacedEvent,
  type BidRejectedEvent,
  type BidRowDto,
  type LotDto,
  type LotExtendedEvent,
  type LotStatusEvent,
  type LotTickDto,
  type NotificationDto,
  type Page,
  type UnreadCountDto,
} from '@hermes/shared';
import { queryClient } from './queries';
import { useTimeStore } from './time';

/** Патч одного лота во всех страницах infinite-кэша каталога. */
type LotsCache = InfiniteData<Page<LotDto>>;
function patchLotsPages(id: string, fn: (l: LotDto) => LotDto): void {
  queryClient.setQueriesData<LotsCache>({ queryKey: ['lots'] }, (data) =>
    data
      ? { ...data, pages: data.pages.map((p) => ({ ...p, items: p.items.map((l) => (l.id === id ? fn(l) : l)) })) }
      : data,
  );
}

let socket: Socket | null = null;

function patchLotCaches(tick: LotTickDto): void {
  useTimeStore.getState().syncServerNow(tick.serverNow);
  const apply = (lot: LotDto): LotDto => ({
    ...lot,
    status: tick.status,
    currentPrice: tick.currentPrice,
    bidCount: tick.bidCount,
    reserveMet: tick.reserveMet,
    endsAt: tick.endsAt,
  });
  queryClient.setQueryData<LotDto>(['lot', tick.id], (old) => (old ? apply(old) : old));
  patchLotsPages(tick.id, apply);
}

export function getSocket(): Socket {
  if (socket) return socket;
  socket = io({ withCredentials: true });

  socket.on(WS_EVENTS.BID_PLACED, (e: BidPlacedEvent) => {
    patchLotCaches(e.lot);
    // Лента ставок: вставляем строку без рефетча
    queryClient.setQueryData<BidRowDto[]>(['bids', e.lot.id], (old) => {
      if (!old || old.some((b) => b.id === e.bid.id)) return old;
      const me = queryClient.getQueryData<{ id: string } | null>(['me']);
      const isMine = me?.id === e.bid.bidderId;
      return [
        { id: e.bid.id, amount: e.bid.amount, createdAt: e.bid.createdAt, bidderLabel: isMine ? 'Вы' : e.bid.bidderLabel, isMine },
        ...old,
      ].slice(0, 30);
    });
    // Если перебили меня — мой статус лидера в кэше лота сбрасывается
    const me = queryClient.getQueryData<{ id: string } | null>(['me']);
    if (me && e.bid.bidderId !== me.id) {
      queryClient.setQueryData<LotDto>(['lot', e.lot.id], (old) =>
        old?.my ? { ...old, my: { ...old.my, isLeading: false } } : old,
      );
    }
  });

  socket.on(WS_EVENTS.LOT_EXTENDED, (e: LotExtendedEvent) => {
    useTimeStore.getState().syncServerNow(e.serverNow);
    queryClient.setQueryData<LotDto>(['lot', e.lotId], (old) => (old ? { ...old, endsAt: e.endsAt } : old));
    patchLotsPages(e.lotId, (l) => ({ ...l, endsAt: e.endsAt }));
  });

  socket.on(WS_EVENTS.LOT_STATUS, (e: LotStatusEvent) => {
    patchLotCaches(e.lot);
    queryClient.invalidateQueries({ queryKey: ['lots'] });
    queryClient.invalidateQueries({ queryKey: ['my-bids'] });
  });

  socket.on(WS_EVENTS.BID_REJECTED, (e: BidRejectedEvent) => {
    patchLotCaches(e.lot);
    // Лидерство пересчитано на сервере: моё isLeading = я ли новый лидер.
    // Иначе после снятия моей завышенной ставки бейдж «вы лидируете» и кнопка
    // «ставка принята» зависали бы со старой ценой.
    const me = queryClient.getQueryData<{ id: string } | null>(['me']);
    if (me) {
      queryClient.setQueryData<LotDto>(['lot', e.lot.id], (old) =>
        old?.my ? { ...old, my: { ...old.my, isLeading: e.newLeaderId === me.id } } : old,
      );
      // Если сняли именно мою ставку — обновим «мои ставки»
      if (e.rejectedBidderId === me.id) {
        queryClient.invalidateQueries({ queryKey: ['my-bids'] });
      }
    }
    queryClient.invalidateQueries({ queryKey: ['bids', e.lot.id] });
  });

  socket.on(WS_EVENTS.OUTBID, () => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['my-bids'] });
  });

  socket.on(WS_EVENTS.LOT_WON, () => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['my-bids'] });
  });

  socket.on(WS_EVENTS.NOTIFICATION, (n?: NotificationDto) => {
    // Вставляем уведомление в кэш без рефетча; фолбэк — инвалидация
    const list = queryClient.getQueryData<NotificationDto[]>(['notifications']);
    if (n?.id && list) {
      if (list.some((x) => x.id === n.id)) return; // дубль — счётчик не трогаем
      queryClient.setQueryData<NotificationDto[]>(['notifications'], [n, ...list].slice(0, 50));
    } else {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
    if (n?.id && queryClient.getQueryData<UnreadCountDto>(['notifications-unread'])) {
      queryClient.setQueryData<UnreadCountDto>(['notifications-unread'], (old) =>
        old ? { count: old.count + 1 } : old,
      );
    } else {
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    }
  });

  // После реконнекта кэш мог «заморозиться» — рефетчим всё живое
  socket.io.on('reconnect', () => {
    queryClient.invalidateQueries({ queryKey: ['lots'] });
    queryClient.invalidateQueries({ queryKey: ['lot'] });
    queryClient.invalidateQueries({ queryKey: ['bids'] });
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
  });

  return socket;
}

/** Подписка на комнату лота на время жизни экрана. */
export function useLotRoom(lotId: string | undefined): void {
  useEffect(() => {
    if (!lotId) return;
    const s = getSocket();
    s.emit(WS_EVENTS.JOIN_LOT, lotId);
    return () => {
      s.emit(WS_EVENTS.LEAVE_LOT, lotId);
    };
  }, [lotId]);
}
