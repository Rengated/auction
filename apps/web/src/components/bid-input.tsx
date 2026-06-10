import { fmt } from '@hermes/shared';

/** Степпер ставки: − | поле | + (BidInput из хендоффа). */
export function BidInput({ value, step, onChange }: { value: number; step: number; onChange: (v: number) => void }) {
  const set = (v: number) => onChange(Math.max(0, v));
  return (
    <div className="bid-input">
      <button className="step" onClick={() => set(value - step)}>−</button>
      <div className="field">
        <input
          className="num"
          inputMode="numeric"
          value={fmt(value)}
          onChange={(e) => {
            const n = parseInt(e.target.value.replace(/\D/g, ''), 10);
            set(Number.isNaN(n) ? 0 : n);
          }}
        />
        <div className="hint">ваша ставка, ₽</div>
      </div>
      <button className="step" onClick={() => set(value + step)}>+</button>
    </div>
  );
}
