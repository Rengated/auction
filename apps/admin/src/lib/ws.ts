import { io, type Socket } from 'socket.io-client';
import { useEffect } from 'react';
import { WS_EVENTS, type BidPlacedEvent } from '@hermes/shared';
import { queryClient } from './queries';
import { useTimeStore } from './time';

let socket: Socket | null = null;

/** Админ-сокет: на любые события торгов инвалидируем админские запросы. */
export function getSocket(): Socket {
  if (socket) return socket;
  socket = io({ withCredentials: true });

  const refreshLots = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-lots'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  socket.on(WS_EVENTS.BID_PLACED, (e: BidPlacedEvent) => {
    useTimeStore.getState().syncServerNow(e.lot.serverNow);
    queryClient.invalidateQueries({ queryKey: ['admin-lot', e.lot.id] });
    queryClient.invalidateQueries({ queryKey: ['admin-feed', e.lot.id] });
    queryClient.invalidateQueries({ queryKey: ['participants', e.lot.id] });
    refreshLots();
  });
  socket.on(WS_EVENTS.LOT_EXTENDED, () => refreshLots());
  socket.on(WS_EVENTS.LOT_STATUS, () => {
    refreshLots();
    queryClient.invalidateQueries({ queryKey: ['deals'] });
    queryClient.invalidateQueries({ queryKey: ['admin-lot'] });
  });
  socket.on(WS_EVENTS.BID_REJECTED, () => {
    refreshLots();
    queryClient.invalidateQueries({ queryKey: ['admin-lot'] });
    queryClient.invalidateQueries({ queryKey: ['admin-feed'] });
  });
  socket.io.on('reconnect', () => queryClient.invalidateQueries());

  return socket;
}

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
