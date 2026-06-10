import type { DisplayStatus, LotStatus } from './types';

/** Порог «СКОРО КОНЕЦ», секунд (из дизайна). */
export const ENDING_THRESHOLD_SEC = 300;

export function fmt(n: number): string {
  return n.toLocaleString('ru-RU');
}

export function rub(n: number): string {
  return `${fmt(n)} ₽`;
}

/** Секунды → «1ч 23м» или «04:52» (из hifi-shared.jsx). */
export function fmtTime(sec: number): string {
  if (sec >= 3600) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${h}ч ${m}м`;
  }
  const m = Math.floor(sec / 60);
  const s = Math.max(0, Math.floor(sec % 60));
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Статус для отображения: live с остатком ≤ 300с → ending. */
export function displayStatus(
  status: LotStatus,
  endsAt: string | Date,
  now: number,
): DisplayStatus {
  if (status === 'draft') return 'upcoming';
  if (status === 'live') {
    const left = (new Date(endsAt).getTime() - now) / 1000;
    return left <= ENDING_THRESHOLD_SEC ? 'ending' : 'live';
  }
  return status;
}

export const STATUS_META: Record<
  DisplayStatus,
  { label: string; tone: 'live' | 'soon' | 'ok' | 'muted'; group: 'live' | 'soon' | 'done' }
> = {
  live: { label: 'В эфире', tone: 'live', group: 'live' },
  ending: { label: 'Скоро конец', tone: 'live', group: 'live' },
  upcoming: { label: 'Ожидает старта', tone: 'soon', group: 'soon' },
  sold: { label: 'Продан', tone: 'ok', group: 'done' },
  finished: { label: 'Резерв не взят', tone: 'muted', group: 'done' },
  withdrawn: { label: 'Снят с торгов', tone: 'muted', group: 'done' },
};

/** Минимальная следующая ставка. */
export function minNextBid(currentPrice: number, startPrice: number, bidCount: number, step: number): number {
  return bidCount === 0 ? Math.max(startPrice, step) : currentPrice + step;
}

export function feeAmount(amount: number, feeRate: number): number {
  return Math.round(amount * feeRate);
}

export function feePctLabel(feeRate: number): string {
  return (feeRate * 100).toLocaleString('ru-RU', { maximumFractionDigits: 2 });
}

/** Маскированное имя участника для публичной ленты. */
export function maskBidder(userId: string): string {
  // Стабильный номер из uuid: первые 4 hex-символа → 0..99
  const n = parseInt(userId.replace(/-/g, '').slice(0, 4), 16) % 100;
  return `Участник ${String(n).padStart(2, '0')}`;
}
