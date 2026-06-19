/* Бренд-знаки Auction Germes — оранжевая плитка AG (Onest) */

/**
 * Монограмма AG: оранжевая плитка-squircle с чёрными буквами AG (Onest 800).
 * `color` сохранён в сигнатуре для обратной совместимости с местами вызова,
 * но визуал бренда фиксирован (плитка с градиентом).
 */
export function HermesH({ size = 40 }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" style={{ display: 'block' }} aria-label="Auction Germes">
      <defs>
        <linearGradient id="ag-tile" x1="16" y1="0" x2="104" y2="120" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ef7438" />
          <stop offset="1" stopColor="#c44e1d" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="120" height="120" rx="27" ry="27" fill="url(#ag-tile)" />
      <text
        x="60"
        y="60"
        fontFamily="'Onest', sans-serif"
        fontWeight={800}
        fontSize="64"
        fill="#16140f"
        textAnchor="middle"
        dominantBaseline="central"
        letterSpacing="-3"
      >
        AG
      </text>
    </svg>
  );
}

export function HermesLogo({
  markSize = 30,
  fontSize = 17,
  color = 'var(--text)',
  accent = 'var(--text-dim)',
  sub = true,
}: {
  markSize?: number;
  fontSize?: number;
  color?: string;
  accent?: string;
  sub?: boolean;
}) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 11 }}>
      <HermesH size={markSize} />
      <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <span style={{ fontFamily: "'Onest', sans-serif", fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', fontSize, color }}>
          Auction
        </span>
        {sub && (
          <span style={{ fontFamily: "'Onest', sans-serif", fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase', fontSize: Math.round(fontSize * 0.62), color: accent, marginTop: 5 }}>
            Germes
          </span>
        )}
      </span>
    </span>
  );
}

export const YA_RED = '#fc3f1d';

export function YandexGlyph({ size = 20 }: { size?: number }) {
  return (
    <span
      style={{
        width: size, height: size, borderRadius: '50%', background: YA_RED, color: '#fff',
        display: 'inline-grid', placeItems: 'center',
        font: `700 ${Math.round(size * 0.62)}px/1 'Hanken Grotesk', sans-serif`, flex: 'none',
      }}
    >
      Я
    </span>
  );
}
