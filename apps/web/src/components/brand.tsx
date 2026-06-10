/* Бренд-знаки Hermes Trade — из hifi-shared.jsx */

export function HermesH({ size = 40, color = '#cdd3da' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" style={{ display: 'block' }} aria-label="Hermes Trade">
      <circle cx="60" cy="60" r="52" fill="none" stroke={color} strokeWidth="3" opacity="0.55" />
      <rect x="40" y="36" width="6" height="48" fill={color} />
      <rect x="74" y="36" width="6" height="48" fill={color} />
      <path d="M46 64 L74 52" stroke={color} strokeWidth="6" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function HermesLogo({
  markSize = 30,
  fontSize = 17,
  color = 'var(--text)',
  accent = '#aeb6bf',
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
      <HermesH size={markSize} color={accent} />
      <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <span style={{ fontFamily: "'Marcellus', serif", letterSpacing: '0.18em', textTransform: 'uppercase', fontSize, color }}>
          Hermes
        </span>
        {sub && (
          <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", letterSpacing: '0.42em', textTransform: 'uppercase', fontSize: Math.round(fontSize * 0.42), color: accent, marginTop: 5 }}>
            Trade
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
