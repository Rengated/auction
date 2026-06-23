import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import Video from 'yet-another-react-lightbox/plugins/video';
import Counter from 'yet-another-react-lightbox/plugins/counter';
import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/counter.css';
import type { LotPhotoDto } from '@hermes/shared';
import { I } from './icons';

/** Фото с фолбэком на глиф-плейсхолдер (как в прототипе). */
export function Photo({
  src,
  cap,
  h = 220,
  style = {},
  glyph = 'ФОТО',
  fit = 'cover',
  priority = false,
  children,
}: {
  src?: string | null;
  cap?: string;
  h?: number;
  style?: CSSProperties;
  glyph?: string;
  fit?: 'cover' | 'contain';
  priority?: boolean;
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
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          {...(priority ? ({ fetchpriority: 'high' } as Record<string, string>) : {})}
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

/** Карусель фото лота на Embla + полноэкранный просмотр в лайтбоксе (YARL, с zoom). */
export function Carousel({
  photos,
  h = 300,
  glyph = 'ФОТО',
  radius = 0,
  style = {},
  size = 'md',
  index,
  onIndex,
}: {
  photos: LotPhotoDto[];
  h?: number;
  glyph?: string;
  radius?: number;
  style?: CSSProperties;
  size?: 'md' | 'lg';
  /** Контролируемый активный индекс (для синхронизации с плитками-миниатюрами). */
  index?: number;
  onIndex?: (i: number) => void;
}) {
  const total = photos.length;
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: total > 1, align: 'start' });
  const [selected, setSelected] = useState(index ?? 0);
  const [open, setOpen] = useState(false);
  const onIndexRef = useRef(onIndex);
  onIndexRef.current = onIndex;

  // Embla → активный индекс (счётчик/точки/миниатюры).
  useEffect(() => {
    if (!emblaApi) return;
    const onSel = () => {
      const idx = emblaApi.selectedScrollSnap();
      setSelected(idx);
      onIndexRef.current?.(idx);
    };
    emblaApi.on('select', onSel);
    emblaApi.on('reInit', onSel);
    return () => {
      emblaApi.off('select', onSel);
      emblaApi.off('reInit', onSel);
    };
  }, [emblaApi]);

  // Контролируемый индекс (миниатюры десктопа) → прокрутка карусели.
  useEffect(() => {
    if (emblaApi && index !== undefined && index !== emblaApi.selectedScrollSnap()) emblaApi.scrollTo(index);
  }, [emblaApi, index]);

  // Нет фото (медиа удалено) — плейсхолдер без управления.
  if (total === 0) {
    return <Photo src={null} h={h} glyph={glyph} style={{ borderRadius: radius, ...style }} />;
  }

  const arrow = (side: 'left' | 'right'): CSSProperties => ({
    position: 'absolute', top: '50%', [side]: 12, transform: 'translateY(-50%)', zIndex: 4,
    width: 38, height: 38, borderRadius: '50%', border: '1px solid var(--line)',
    background: 'color-mix(in srgb, var(--bg) 55%, transparent)', backdropFilter: 'blur(6px)',
    color: 'var(--text)', font: '300 22px/1 var(--ui)', cursor: 'pointer', display: 'grid', placeItems: 'center',
  });
  const fsBtn: CSSProperties = {
    position: 'absolute', bottom: 11, right: 11, zIndex: 6,
    width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--line)',
    background: 'color-mix(in srgb, var(--bg) 55%, transparent)', backdropFilter: 'blur(6px)',
    color: 'var(--text)', cursor: 'pointer', display: 'grid', placeItems: 'center', padding: 9,
  };
  const cap: CSSProperties = {
    position: 'absolute', left: 12, bottom: 12, zIndex: 4,
    font: '500 10px/1 var(--num)', letterSpacing: '0.08em', color: 'var(--text-dim)',
    background: 'color-mix(in srgb, var(--bg) 62%, transparent)', border: '1px solid var(--line)',
    borderRadius: 6, padding: '4px 7px', backdropFilter: 'blur(4px)',
  };

  const lbSlides = photos.map((p) =>
    p.kind === 'video'
      ? { type: 'video' as const, sources: [{ src: p.lg, type: 'video/mp4' }] }
      : { src: p.lg },
  );

  return (
    <div style={{ position: 'relative', ...style }}>
      <div className="embla" ref={emblaRef} style={{ overflow: 'hidden', borderRadius: radius }}>
        <div style={{ display: 'flex' }}>
          {photos.map((p, k) => (
            <div key={p.id} style={{ flex: '0 0 100%', minWidth: 0 }}>
              {p.kind === 'video' ? (
                <div className="photo" style={{ height: h, width: '100%' }}>
                  <video
                    src={p.lg}
                    controls
                    playsInline
                    preload="metadata"
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 1 }}
                  />
                </div>
              ) : (
                <Photo src={p[size]} h={h} glyph={glyph} fit="cover" priority={k === 0} />
              )}
            </div>
          ))}
        </div>
      </div>

      <span style={cap}>{selected + 1} / {total}</span>

      <button style={fsBtn} title="На весь экран" onClick={() => setOpen(true)}>
        <span style={{ width: 18, height: 18, display: 'inline-flex' }}>{I.expand}</span>
      </button>

      {total > 1 && (
        <>
          <button style={arrow('left')} onClick={() => emblaApi?.scrollPrev()}>‹</button>
          <button style={arrow('right')} onClick={() => emblaApi?.scrollNext()}>›</button>
          {total <= 10 && (
            <div style={{ position: 'absolute', bottom: 12, left: 0, right: 0, zIndex: 4, display: 'flex', gap: 5, justifyContent: 'center', pointerEvents: 'none' }}>
              {photos.map((_, k) => (
                <span
                  key={k}
                  onClick={() => emblaApi?.scrollTo(k)}
                  style={{ width: k === selected ? 16 : 6, height: 6, borderRadius: 3, background: k === selected ? 'var(--accent)' : 'color-mix(in srgb, var(--text) 45%, transparent)', transition: 'all .2s ease', cursor: 'pointer', pointerEvents: 'auto' }}
                />
              ))}
            </div>
          )}
        </>
      )}

      <Lightbox
        open={open}
        close={() => setOpen(false)}
        index={selected}
        on={{ view: ({ index: idx }) => emblaApi?.scrollTo(idx) }}
        slides={lbSlides}
        plugins={[Zoom, Video, Counter]}
      />
    </div>
  );
}
