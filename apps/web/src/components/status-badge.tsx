import type { CSSProperties } from 'react';
import { displayStatus, STATUS_META, type LotDto } from '@hermes/shared';
import { useNow } from '../lib/time';
import { I, Ic } from './icons';

export function StatusBadge({ lot }: { lot: LotDto }) {
  const now = useNow();
  const ds = displayStatus(lot.status, lot.endsAt, now);
  const meta = STATUS_META[ds];
  if (meta.tone === 'live') {
    return (
      <span className="live">
        <span className="dot" />
        {ds === 'ending' ? 'СКОРО КОНЕЦ' : 'В ЭФИРЕ'}
      </span>
    );
  }
  const styles: Record<string, { color: string; bd: string; bg: string }> = {
    soon: { color: 'var(--text)', bd: 'var(--line)', bg: 'color-mix(in srgb, var(--bg) 60%, transparent)' },
    ok: { color: 'var(--win-ink)', bd: 'transparent', bg: 'var(--win)' },
    muted: { color: 'var(--text-dim)', bd: 'var(--line)', bg: 'color-mix(in srgb, var(--bg) 60%, transparent)' },
  };
  const s = styles[meta.tone];
  // Клиент не видит слова «резерв»: завершённый без продажи → «Лот не сыгран»
  // (shared STATUS_META не трогаем — там «Резерв не взят» для админки).
  const label = ds === 'finished' ? 'Лот не сыгран' : meta.label;
  const css: CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10.5, fontWeight: 700,
    letterSpacing: '0.04em', textTransform: 'uppercase', color: s.color, background: s.bg,
    border: `1px solid ${s.bd}`, padding: '5px 9px', borderRadius: 7, backdropFilter: 'blur(4px)',
  };
  return (
    <span className="num" style={css}>
      {meta.tone === 'ok' && <Ic d={I.check} s={12} />}
      {label}
    </span>
  );
}
