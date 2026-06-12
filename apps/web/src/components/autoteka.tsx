import type { LotDto } from '@hermes/shared';
import { I, Ic } from './icons';

/** Отчёт Автотеки: PDF-файл, загруженный администратором. */
export function AutotekaReport({ lot }: { lot: LotDto }) {
  if (!lot.autotekaPdfUrl) {
    return (
      <div className="card" style={{ padding: '14px 15px', display: 'flex', alignItems: 'center', gap: 11 }}>
        <span style={{ width: 18, height: 18, color: 'var(--text-faint)', flex: 'none' }}>{I.doc}</span>
        <span style={{ fontSize: 13, color: 'var(--text-faint)' }}>Отчёт Автотеки готовится — появится до старта торгов</span>
      </div>
    );
  }
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '13px 15px', display: 'flex', alignItems: 'center', gap: 11 }}>
        <span style={{ width: 30, height: 30, borderRadius: 8, background: '#d6f0e0', color: '#1f8a52', display: 'grid', placeItems: 'center', flex: 'none', fontWeight: 800, fontSize: 13, fontFamily: 'var(--num)' }}>А</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700 }}>Отчёт Автотеки</div>
          {lot.vin && <div className="num" style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 3 }}>VIN {lot.vin}</div>}
        </div>
        <span className="num" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: 'var(--ok)', flex: 'none' }}>
          <span style={{ width: 13, height: 13 }}>{I.check}</span> проверка пройдена
        </span>
      </div>
      <a
        href={lot.autotekaPdfUrl}
        target="_blank"
        rel="noreferrer"
        style={{ textDecoration: 'none', padding: '13px 15px', display: 'flex', gap: 10, alignItems: 'center', background: 'var(--surface-2)', borderTop: '1px solid var(--line-soft)', color: 'var(--text)' }}
      >
        <Ic d={I.doc} s={16} />
        <span style={{ fontSize: 12.5, color: 'var(--text-dim)', flex: 1 }}>Полный отчёт о юридической чистоте</span>
        <span className="num" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--accent)', whiteSpace: 'nowrap' }}>Открыть PDF-отчёт →</span>
      </a>
    </div>
  );
}
