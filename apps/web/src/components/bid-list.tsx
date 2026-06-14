import type { BidRowDto } from '@hermes/shared';
import { rub } from '@hermes/shared';
import { useNow } from '../lib/time';

export function relTime(iso: string, now: number): string {
  const sec = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (sec < 5) return 'сейчас';
  if (sec < 60) return `${sec} сек назад`;
  if (sec < 3600) return `${Math.floor(sec / 60)} мин назад`;
  if (sec < 86_400) return `${Math.floor(sec / 3600)} ч назад`;
  return `${Math.floor(sec / 86_400)} дн назад`;
}

/** Лента ставок (BidList из хендоффа) — реальные данные, маскированные имена. */
export function BidList({ bids, scroll = false, max = 8 }: { bids: BidRowDto[]; scroll?: boolean; max?: number }) {
  const now = useNow();
  const rows = bids.slice(0, max);
  if (rows.length === 0) {
    return (
      <div className="card" style={{ padding: '22px 16px', textAlign: 'center', color: 'var(--text-faint)', fontSize: 13 }}>
        Ставок пока нет — будьте первым
      </div>
    );
  }
  return (
    <div className="card" style={{ padding: '2px 16px', ...(scroll ? { maxHeight: 256, overflowY: 'auto', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' } : {}) }}>
      {rows.map((r, i) => (
        <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 0', borderBottom: i < rows.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
          <span style={{ width: 30, height: 30, borderRadius: '50%', flex: 'none', background: r.isMine ? 'var(--accent-glow)' : 'var(--surface-2)', border: '1px solid var(--line)', display: 'grid', placeItems: 'center', font: '700 12px/1 var(--num)', color: r.isMine ? 'var(--accent)' : 'var(--text-dim)' }}>
            {r.isMine ? 'Я' : r.bidderLabel[0].toUpperCase()}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: r.isMine ? 700 : 500, color: r.isMine ? 'var(--accent)' : 'var(--text)' }}>
              {r.isMine ? 'Вы' : r.bidderLabel}
            </div>
            <div className="num" style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>{relTime(r.createdAt, now)}</div>
          </div>
          <span className="num" style={{ fontSize: 15, fontWeight: 600 }}>{rub(r.amount)}</span>
        </div>
      ))}
    </div>
  );
}
