import { displayStatus, fmt, fmtTime, rub, type LotDto } from '@hermes/shared';
import { leftSec, useNow } from '../lib/time';
import { I, Ic } from './icons';
import { Photo } from './photo';
import { StatusBadge } from './status-badge';

function dateLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  if (sameDay(d, today)) return `сегодня, ${time}`;
  const tomorrow = new Date(today.getTime() + 86_400_000);
  if (sameDay(d, tomorrow)) return `завтра, ${time}`;
  const yesterday = new Date(today.getTime() - 86_400_000);
  if (sameDay(d, yesterday)) return `вчера, ${time}`;
  return `${d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}, ${time}`;
}

export function cardPriceMeta(lot: LotDto, now: number) {
  const ds = displayStatus(lot.status, lot.endsAt, now);
  if (ds === 'live' || ds === 'ending') {
    const left = leftSec(lot.endsAt, now);
    return { pL: 'макс. ставка', p: lot.currentPrice, tL: 'до конца', tV: fmtTime(left), urgent: left <= 300, sold: false };
  }
  if (ds === 'upcoming') {
    return { pL: 'стартовая цена', p: lot.currentPrice, tL: 'старт', tV: `через ${fmtTime(leftSec(lot.startsAt, now))}`, urgent: false, sold: false };
  }
  if (ds === 'sold') {
    return { pL: 'продан за', p: lot.currentPrice, sold: true, tL: 'завершён', tV: dateLabel(lot.endsAt), urgent: false };
  }
  return { pL: 'макс. ставка', p: lot.currentPrice, tL: 'завершён', tV: dateLabel(lot.endsAt), urgent: false, sold: false };
}

export function ReserveInline({ lot }: { lot: LotDto }) {
  if (lot.status === 'sold') {
    return <span className="num" style={{ fontSize: 11, fontWeight: 600, color: 'var(--win)' }}>✓ продан · резерв {fmt(lot.reservePrice)} ₽</span>;
  }
  return (
    <span className="num" style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-faint)' }}>
      резерв {fmt(lot.reservePrice)} ₽ ·{' '}
      <span style={{ color: lot.reserveMet ? 'var(--ok)' : 'var(--text-dim)' }}>{lot.reserveMet ? 'взят' : 'не взят'}</span>
    </span>
  );
}

/** Тело карточки лота — общее для мобайла и веба (LotCardBody из хендоффа). */
export function LotCardBody({ lot, onToggleFav }: { lot: LotDto; onToggleFav?: (on: boolean) => void }) {
  const now = useNow();
  const m = cardPriceMeta(lot, now);
  const cover = lot.photos[0]?.card || null;
  return (
    <>
      <Photo src={cover} cap={`${lot.photos.length} фото`} h={182} glyph={lot.make.toUpperCase()} fit="cover">
        <div style={{ position: 'absolute', top: 12, left: 12, right: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', pointerEvents: 'auto' }}>
          <StatusBadge lot={lot} />
          <span
            role="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onToggleFav?.(!lot.isFavorite);
            }}
            style={{ width: 31, height: 31, borderRadius: 8, background: 'color-mix(in srgb, var(--bg) 55%, transparent)', border: '1px solid var(--line)', display: 'grid', placeItems: 'center', color: lot.isFavorite ? 'var(--accent)' : 'var(--text-dim)', backdropFilter: 'blur(4px)', cursor: 'pointer' }}
          >
            <Ic d={I.bookmark} s={16} />
          </span>
        </div>
      </Photo>
      <div style={{ padding: '14px 16px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
          <span style={{ font: '700 17px/1.2 var(--ui)', letterSpacing: '-0.01em', color: 'var(--text)' }}>{lot.make} {lot.model}</span>
          <span className="num" style={{ fontSize: 12, color: 'var(--text-faint)', flex: 'none' }}>{lot.year}</span>
        </div>
        <div className="num" style={{ display: 'flex', flexWrap: 'wrap', gap: '0 9px', color: 'var(--text-dim)', fontSize: 12.5, marginTop: 8 }}>
          <span>{fmt(lot.mileage)} км</span>
          <span style={{ color: 'var(--line)' }}>·</span>
          <span>{lot.engine}</span>
          <span style={{ color: 'var(--line)' }}>·</span>
          <span>{lot.fuel}</span>
        </div>
        <hr style={{ height: 1, background: 'var(--line-soft)', border: 0, margin: '14px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 5 }}>{m.pL}</div>
            <div className="num" style={{ fontSize: 20, fontWeight: 700, color: m.sold ? 'var(--win)' : 'var(--text)' }}>{rub(m.p)}</div>
            <div style={{ marginTop: 6 }}><ReserveInline lot={lot} /></div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="eyebrow" style={{ marginBottom: 5 }}>{m.tL}</div>
            <span className="num" style={{ fontSize: 14, fontWeight: 600, color: m.urgent ? 'var(--live)' : 'var(--text)', whiteSpace: 'nowrap' }}>{m.tV}</span>
            {lot.bidCount > 0 && <div className="num" style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 6 }}>{lot.bidCount} ставок</div>}
          </div>
        </div>
        <div className="num" style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 13, paddingTop: 11, borderTop: '1px dashed var(--line-soft)', fontSize: 11, color: 'var(--text-faint)' }}>
          <span>старт <span style={{ color: 'var(--text-dim)' }}>{dateLabel(lot.startsAt)}</span></span>
          <span>оконч. <span style={{ color: 'var(--text-dim)' }}>{dateLabel(lot.endsAt)}</span></span>
        </div>
      </div>
    </>
  );
}
