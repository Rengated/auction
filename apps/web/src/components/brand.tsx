/* Бренд-знаки Auction Germes — тёмная плитка AG с оранжевым глифом */

/**
 * Монограмма AG (dark): тёмная плитка-squircle с оранжевым глифом «AG».
 * Глиф — векторный путь из logo-AG-glyph.svg (logo_export_dark).
 * `color` сохранён в сигнатуре для обратной совместимости с местами вызова,
 * но визуал бренда фиксирован.
 */
export function HermesH({ size = 40 }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 1024 1024" style={{ display: 'block' }} aria-label="Auction Germes">
      <defs>
        <linearGradient id="ag-tile" x1="133" y1="0" x2="891" y2="1024" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#23272f" />
          <stop offset="1" stopColor="#0f1115" />
        </linearGradient>
      </defs>
      <rect width="1024" height="1024" rx="229" ry="229" fill="url(#ag-tile)" />
      <path
        d="M236.72 700.59L144.15 700.59L293.11 323.94L384.62 323.94L531.98 700.59L438.88 700.59L418.13 642.07L258 642.07L236.72 700.59ZM338.87 418.10L285.13 563.87L391 563.87L338.87 418.10ZM705.35 704.85L705.35 704.85Q648.96 704.85 607.73 680.91Q566.50 656.97 544.42 613.61Q522.34 570.25 522.34 511.20L522.34 511.20Q522.34 467.05 534.84 431.93Q547.35 396.82 571.29 371.55Q595.23 346.28 629.01 332.72Q662.79 319.15 705.35 319.15L705.35 319.15Q748.44 319.15 783.82 333.51Q819.20 347.88 842.34 376.87Q865.48 405.87 872.40 450.02L872.40 450.02L786.21 450.02Q782.49 433 772.38 422.09Q762.27 411.19 746.85 405.87Q731.42 400.55 711.20 400.55L711.20 400.55Q683.54 400.55 664.39 410.12Q645.23 419.70 633.53 435.92Q621.83 452.15 616.51 472.37Q611.19 492.58 611.19 513.86L611.19 513.86Q611.19 542.06 621.03 567.33Q630.87 592.60 652.42 608.03Q673.96 623.45 709.61 623.45L709.61 623.45Q730.35 623.45 747.91 617.60Q765.47 611.75 776.64 599.25Q787.81 586.75 789.94 568.13L789.94 568.13L694.18 568.13L694.18 494.71L879.85 494.71L879.85 512.27Q879.85 572.91 860.69 616.01Q841.54 659.10 802.97 681.97Q764.40 704.85 705.35 704.85Z"
        fill="#e0632b"
      />
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
