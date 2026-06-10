import type { LotDto } from '@hermes/shared';
import { I, Ic } from './icons';

/** Отчёт Автотеки (AutotekaReport из хендоффа). */
export function AutotekaReport({ lot }: { lot: LotDto }) {
  const a = lot.autoteka;
  if (!a || !a.attached) {
    return (
      <div className="card" style={{ padding: '14px 15px', display: 'flex', alignItems: 'center', gap: 11 }}>
        <span style={{ width: 18, height: 18, color: 'var(--text-faint)', flex: 'none' }}>{I.doc}</span>
        <span style={{ fontSize: 13, color: 'var(--text-faint)' }}>Отчёт Автотеки готовится — появится до старта торгов</span>
      </div>
    );
  }
  const rows: Array<[string, string, boolean]> = [
    ['Владельцев по ПТС', String(a.owners), (a.owners ?? 0) <= 2],
    ['ДТП в истории', a.accidents === 0 ? 'не найдено' : String(a.accidents), a.accidents === 0],
    ['Пробег', a.mileageOk ? 'без скруток' : 'есть расхождения', Boolean(a.mileageOk)],
    ['Ограничения ГИБДД', a.restrictions ? 'есть' : 'нет', !a.restrictions],
    ['Залог', a.pledge ? 'в залоге' : 'не в залоге', !a.pledge],
    ['Работа в такси', a.taxi ? 'да' : 'нет', !a.taxi],
  ];
  const flags = rows.filter((r) => !r[2]).length;
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '13px 15px', display: 'flex', alignItems: 'center', gap: 11, borderBottom: '1px solid var(--line-soft)' }}>
        <span style={{ width: 30, height: 30, borderRadius: 8, background: '#d6f0e0', color: '#1f8a52', display: 'grid', placeItems: 'center', flex: 'none', fontWeight: 800, fontSize: 13, fontFamily: 'var(--num)' }}>А</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700 }}>Отчёт Автотеки</div>
          <div className="num" style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 3 }}>VIN {lot.vin || '—'} · от {a.date}</div>
        </div>
        <span className="num" style={{ fontSize: 11, fontWeight: 700, color: flags === 0 ? 'var(--ok)' : 'var(--live)', flex: 'none' }}>
          {flags === 0 ? '✓ чисто' : `${flags} замеч.`}
        </span>
      </div>
      <div style={{ padding: '4px 15px' }}>
        {rows.map(([k, v, ok]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--line-soft)' }}>
            <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>{k}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: ok ? 'var(--text)' : 'var(--live)' }}>
              <span style={{ width: 14, height: 14, color: ok ? 'var(--ok)' : 'var(--live)' }}>{ok ? I.check : I.alert}</span>
              {v}
            </span>
          </div>
        ))}
      </div>
      <div style={{ padding: '12px 15px', display: 'flex', gap: 10, alignItems: 'center', background: 'var(--surface-2)', borderTop: '1px solid var(--line-soft)' }}>
        <Ic d={I.doc} s={16} />
        <span style={{ fontSize: 12, color: 'var(--text-dim)', flex: 1 }}>Полный PDF-отчёт</span>
        <span className="num" style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>Открыть →</span>
      </div>
    </div>
  );
}
