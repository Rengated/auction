import { useState } from 'react';

/**
 * Выбор диапазона дат «с — по» с быстрыми пресетами (Неделя/Месяц/Квартал).
 * Значения наружу — ISO-строки (начало суток `from`, конец суток `to`).
 */

export interface DateRangeValue {
  from: string; // ISO, начало суток
  to: string; // ISO, конец суток
}

const PRESETS: Array<[string, number]> = [
  ['Неделя', 7],
  ['Месяц', 30],
  ['Квартал', 90],
];

/** Начало суток N дней назад (включая сегодня) → ISO. */
const startDaysAgo = (n: number): Date => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (n - 1));
  return d;
};
const endOfToday = (): Date => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
};

/** ISO → значение для input type="date" (YYYY-MM-DD) в локальном поясе. */
const isoToDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
/** YYYY-MM-DD → ISO начала суток (atEnd=true → конец суток). */
const dateToIso = (s: string, atEnd: boolean): string | null => {
  if (!s) return null;
  const [y, m, day] = s.split('-').map(Number);
  if (!y || !m || !day) return null;
  const d = new Date(y, m - 1, day, atEnd ? 23 : 0, atEnd ? 59 : 0, atEnd ? 59 : 0, atEnd ? 999 : 0);
  return d.toISOString();
};

/** Дефолтный диапазон — последние 7 дней (для инициализации в страницах). */
export const defaultRange = (): DateRangeValue => ({
  from: startDaysAgo(7).toISOString(),
  to: endOfToday().toISOString(),
});

export function DateRange({ value, onChange }: { value: DateRangeValue; onChange: (v: DateRangeValue) => void }) {
  // Какой пресет активен (если границы совпадают), иначе — кастом.
  const [custom, setCustom] = useState(false);

  const applyPreset = (days: number) => {
    setCustom(false);
    onChange({ from: startDaysAgo(days).toISOString(), to: endOfToday().toISOString() });
  };
  const activePreset = !custom
    ? PRESETS.find(([, d]) => isoToDate(value.from) === isoToDate(startDaysAgo(d).toISOString()) && isoToDate(value.to) === isoToDate(endOfToday().toISOString()))?.[1]
    : undefined;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      {PRESETS.map(([label, d]) => (
        <button key={d} className={`btn sm ${activePreset === d ? 'acc' : ''}`} onClick={() => applyPreset(d)}>
          {label}
        </button>
      ))}
      <span style={{ width: 1, height: 20, background: 'var(--line)', margin: '0 2px' }} />
      <input
        className="in"
        type="date"
        value={isoToDate(value.from)}
        max={isoToDate(value.to)}
        onChange={(e) => {
          const iso = dateToIso(e.target.value, false);
          if (iso) { setCustom(true); onChange({ ...value, from: iso }); }
        }}
        style={{ width: 150 }}
      />
      <span style={{ color: 'var(--dim)' }}>—</span>
      <input
        className="in"
        type="date"
        value={isoToDate(value.to)}
        min={isoToDate(value.from)}
        onChange={(e) => {
          const iso = dateToIso(e.target.value, true);
          if (iso) { setCustom(true); onChange({ ...value, to: iso }); }
        }}
        style={{ width: 150 }}
      />
    </div>
  );
}
