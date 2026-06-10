import type { ReactNode } from 'react';
import { displayStatus, rub, STATUS_META, type LotDto } from '@hermes/shared';
import { useNow } from '../lib/time';

/** Плитка характеристики с иконкой (SpecTile из хендоффа). */
export function SpecTile({ icon, k, v }: { icon: ReactNode; k: string; v: string }) {
  return (
    <div className="card" style={{ padding: '11px 13px', display: 'flex', flexDirection: 'column', gap: 7 }}>
      <span style={{ width: 17, height: 17, color: 'var(--text-faint)' }}>{icon}</span>
      <div>
        <div className="num" style={{ fontSize: 14, fontWeight: 600 }}>{v}</div>
        <div className="eyebrow" style={{ marginTop: 3 }}>{k}</div>
      </div>
    </div>
  );
}

/** Бегущая лента живых ставок (RecentBidsTicker). Данные — из живых лотов каталога. */
export function RecentBidsTicker({ lots }: { lots: LotDto[] }) {
  const now = useNow();
  const liveLots = lots.filter((l) => STATUS_META[displayStatus(l.status, l.endsAt, now)].group === 'live');
  const pool = ['Участник 77', 'Участник 12', 'Участник 09', 'Участник 33', 'Участник 51', 'Участник 88'];
  const items: Array<{ who: string; car: string; amt: number }> = [];
  liveLots.forEach((l, li) => {
    const step = l.bidStep;
    for (let k = 0; k < 3 && k < l.bidCount; k++) {
      items.push({ who: pool[(li * 3 + k) % pool.length], car: `${l.make} ${l.model.split(' ')[0]}`, amt: l.currentPrice - k * step });
    }
  });
  if (items.length === 0) return null;
  const Row = ({ it }: { it: { who: string; car: string; amt: number } }) => (
    <div className="tick-item">
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', flex: 'none' }} />
      <span className="who">{it.who}</span>
      <span className="car">{it.car}</span>
      <span className="amt">{rub(it.amt)}</span>
    </div>
  );
  return (
    <div className="ticker">
      <div className="ticker-label">
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--live)', display: 'inline-block' }} />
        ставки
      </div>
      <div className="ticker-view">
        <div className="ticker-track">
          {items.map((it, i) => <Row key={'a' + i} it={it} />)}
          {items.map((it, i) => <Row key={'b' + i} it={it} />)}
        </div>
      </div>
    </div>
  );
}
