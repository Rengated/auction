import { create } from 'zustand';

/**
 * Единый источник времени: сервер шлёт serverNow, клиент держит offset
 * и тикает раз в секунду — все таймеры подписаны на now.
 */
interface TimeState {
  now: number;
  offset: number;
  syncServerNow: (serverNowIso: string) => void;
}

export const useTimeStore = create<TimeState>((set) => ({
  now: Date.now(),
  offset: 0,
  syncServerNow: (iso) => set({ offset: new Date(iso).getTime() - Date.now() }),
}));

setInterval(() => {
  const { offset } = useTimeStore.getState();
  useTimeStore.setState({ now: Date.now() + offset });
}, 1000);

export const useNow = () => useTimeStore((s) => s.now);

export function leftSec(until: string | Date, now: number): number {
  return Math.max(0, Math.floor((new Date(until).getTime() - now) / 1000));
}
