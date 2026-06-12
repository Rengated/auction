import { useState, type CSSProperties, type ReactNode } from 'react';
import type { LotPhotoDto } from '@hermes/shared';

/** Фото с фолбэком на глиф-плейсхолдер (как в прототипе). */
export function Photo({
  src,
  cap,
  h = 220,
  style = {},
  glyph = 'ФОТО',
  fit = 'cover',
  children,
}: {
  src?: string | null;
  cap?: string;
  h?: number;
  style?: CSSProperties;
  glyph?: string;
  fit?: 'cover' | 'contain';
  children?: ReactNode;
}) {
  const [ok, setOk] = useState(true);
  return (
    <div className="photo" style={{ height: h, ...style }}>
      <span className="glyph">{glyph}</span>
      {src && ok && (
        <img
          src={src}
          alt=""
          onError={() => setOk(false)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: fit, zIndex: 1 }}
        />
      )}
      <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }}>
        {cap && <span className="cap">{cap}</span>}
        {children}
      </div>
    </div>
  );
}

/** Карусель фото лота: стрелки, точки-индикаторы. */
export function Carousel({
  photos,
  h = 300,
  glyph = 'ФОТО',
  radius = 0,
  style = {},
  size = 'md',
}: {
  photos: LotPhotoDto[];
  h?: number;
  glyph?: string;
  radius?: number;
  style?: CSSProperties;
  size?: 'md' | 'lg';
}) {
  const total = Math.max(1, photos.length);
  const slides = total;
  const [i, setI] = useState(0);
  const go = (d: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setI((p) => (p + d + slides) % slides);
  };
  const arrow = (side: 'left' | 'right'): CSSProperties => ({
    position: 'absolute', top: '50%', [side]: 12, transform: 'translateY(-50%)', zIndex: 4,
    width: 38, height: 38, borderRadius: '50%', border: '1px solid var(--line)',
    background: 'color-mix(in srgb, var(--bg) 55%, transparent)', backdropFilter: 'blur(6px)',
    color: 'var(--text)', font: '300 22px/1 var(--ui)', cursor: 'pointer', display: 'grid', placeItems: 'center',
  });
  const cur = photos[i];
  const isVideo = cur?.kind === 'video';
  return (
    <div style={{ position: 'relative', ...style }}>
      {isVideo ? (
        <div className="photo" style={{ height: h, borderRadius: radius }}>
          <video
            key={cur.id}
            src={cur.lg}
            controls
            playsInline
            preload="metadata"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 1 }}
          />
          <span className="cap" style={{ zIndex: 2 }}>{i + 1} / {total}</span>
        </div>
      ) : (
        <Photo src={cur ? cur[size] : null} h={h} glyph={cur ? glyph : `ФОТО ${i + 1}`} fit="cover" cap={`${i + 1} / ${total}`} style={{ borderRadius: radius }} />
      )}
      {slides > 1 && (
        <>
          <button style={arrow('left')} onClick={(e) => go(-1, e)}>‹</button>
          <button style={arrow('right')} onClick={(e) => go(1, e)}>›</button>
          {slides > 10 ? (
            <div className="num" style={{ position: 'absolute', bottom: 12, left: 0, right: 0, zIndex: 4, textAlign: 'center', font: '600 11px/1 var(--num)', color: 'var(--text)', textShadow: '0 1px 3px rgba(0,0,0,0.6)', pointerEvents: 'none' }}>
              {i + 1} / {total}
            </div>
          ) : (
            <div style={{ position: 'absolute', bottom: 12, left: 0, right: 0, zIndex: 4, display: 'flex', gap: 5, justifyContent: 'center', pointerEvents: 'none' }}>
              {Array.from({ length: slides }).map((_, k) => (
                <span key={k} style={{ width: k === i ? 16 : 6, height: 6, borderRadius: 3, background: k === i ? 'var(--accent)' : 'color-mix(in srgb, var(--text) 45%, transparent)', transition: 'all .2s ease' }} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
