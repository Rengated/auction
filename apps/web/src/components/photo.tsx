import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
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

/** Карусель фото лота: стрелки, точки-индикаторы. */
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
  const total = Math.max(1, photos.length);
  const slides = total;
  // Полноэкранный просмотр: нативный Fullscreen API там, где он есть (десктоп),
  // иначе — собственный fixed-оверлей. iOS Safari (iPhone) не поддерживает
  // requestFullscreen у элементов, поэтому без фолбэка кнопка там не работала.
  const rootRef = useRef<HTMLDivElement>(null);
  const [nativeFs, setNativeFs] = useState(false);
  const [overlayFs, setOverlayFs] = useState(false);
  const isFs = nativeFs || overlayFs;
  useEffect(() => {
    const onChange = () => setNativeFs(document.fullscreenElement === rootRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);
  // Оверлей-фолбэк: блокируем прокрутку фона и закрываем по Esc.
  useEffect(() => {
    if (!overlayFs) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOverlayFs(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [overlayFs]);
  const toggleFs = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const el = rootRef.current;
    const nativeOk = Boolean(el?.requestFullscreen) && Boolean(document.fullscreenEnabled);
    if (nativeOk) {
      if (document.fullscreenElement) void document.exitFullscreen();
      else void el!.requestFullscreen();
    } else {
      setOverlayFs((v) => !v);
    }
  };
  // Управляемый режим (index задан) или внутреннее состояние.
  const [inner, setInner] = useState(0);
  const i = index ?? inner;
  const setI = (updater: number | ((p: number) => number)) => {
    const nextVal = typeof updater === 'function' ? (updater as (p: number) => number)(i) : updater;
    if (index === undefined) setInner(nextVal);
    onIndex?.(nextVal);
  };
  const go = (d: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setI((p) => (p + d + slides) % slides);
  };
  // Свайп по горизонтали (порог 40px): пальцем на мобильном и мышью на десктопе.
  const dragX = useRef<number | null>(null);
  const commitSwipe = (dx: number) => {
    if (slides <= 1) return;
    if (Math.abs(dx) > 40) setI((p) => (p + (dx < 0 ? 1 : -1) + slides) % slides);
  };
  const onTouchStart = (e: React.TouchEvent) => {
    dragX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (dragX.current === null) return;
    const dx = e.changedTouches[0].clientX - dragX.current;
    dragX.current = null;
    commitSwipe(dx);
  };
  // Мышь (pointer): тянем по горизонтали. Тач-события идут отдельной парой выше.
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    dragX.current = e.clientX;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' || dragX.current === null) return;
    const dx = e.clientX - dragX.current;
    dragX.current = null;
    commitSwipe(dx);
  };
  const arrow = (side: 'left' | 'right'): CSSProperties => ({
    position: 'absolute', top: '50%', [side]: 12, transform: 'translateY(-50%)', zIndex: 4,
    width: 38, height: 38, borderRadius: '50%', border: '1px solid var(--line)',
    background: 'color-mix(in srgb, var(--bg) 55%, transparent)', backdropFilter: 'blur(6px)',
    color: 'var(--text)', font: '300 22px/1 var(--ui)', cursor: 'pointer', display: 'grid', placeItems: 'center',
  });
  const cur = photos[i];
  const isVideo = cur?.kind === 'video';
  // В полноэкранном режиме показываем целиком (contain), вне — как было (cover).
  const fsBtn: CSSProperties = {
    position: 'absolute', bottom: 11, right: 11, zIndex: 6,
    width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--line)',
    background: 'color-mix(in srgb, var(--bg) 55%, transparent)', backdropFilter: 'blur(6px)',
    color: 'var(--text)', cursor: 'pointer', display: 'grid', placeItems: 'center', padding: 9,
  };
  return (
    <div
      ref={rootRef}
      style={{
        position: 'relative', touchAction: 'pan-y', cursor: slides > 1 ? 'grab' : undefined,
        ...(isFs ? { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' } : {}),
        ...style,
        // iOS-фолбэк: сам становимся полноэкранным оверлеем (нативного fullscreen нет).
        ...(overlayFs ? { position: 'fixed', inset: 0, width: '100vw', height: '100dvh', zIndex: 9999 } : {}),
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      {isVideo ? (
        <div className="photo" style={{ height: isFs ? '100%' : h, borderRadius: isFs ? 0 : radius, width: '100%' }}>
          <video
            key={cur.id}
            src={cur.lg}
            controls
            playsInline
            preload="metadata"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: isFs ? 'contain' : 'cover', zIndex: 1 }}
          />
          <span className="cap" style={{ zIndex: 2 }}>{i + 1} / {total}</span>
        </div>
      ) : isFs ? (
        <img
          src={cur ? cur.lg : undefined}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
        />
      ) : (
        <Photo src={cur ? cur[size] : null} h={h} glyph={cur ? glyph : `ФОТО ${i + 1}`} fit="cover" priority cap={`${i + 1} / ${total}`} style={{ borderRadius: radius }} />
      )}
      <button style={fsBtn} title={isFs ? 'Свернуть' : 'На весь экран'} onClick={toggleFs}>
        <span style={{ width: 18, height: 18, display: 'inline-flex' }}>{isFs ? I.minimize : I.expand}</span>
      </button>
      {slides > 1 && (
        <>
          <button style={arrow('left')} onClick={(e) => go(-1, e)}>‹</button>
          <button style={arrow('right')} onClick={(e) => go(1, e)}>›</button>
          {slides > 10 ? (
            <div className="num" style={{ position: 'absolute', bottom: 12, left: 0, right: 0, zIndex: 4, textAlign: 'center', font: '600 11px/1 var(--num)', color: 'var(--text)', textShadow: '0 1px 3px rgba(0,0,0,0.6)', pointerEvents: 'none' }}>
              {i + 1} / {total}
            </div>
          ) : (
            <div style={{ position: 'absolute', bottom: 12, left: 0, right: 0, zIndex: 4, display: 'flex', gap: 5, justifyContent: 'center' }}>
              {Array.from({ length: slides }).map((_, k) => (
                <span
                  key={k}
                  onClick={(e) => { e.stopPropagation(); setI(k); }}
                  style={{ width: k === i ? 16 : 6, height: 6, borderRadius: 3, background: k === i ? 'var(--accent)' : 'color-mix(in srgb, var(--text) 45%, transparent)', transition: 'all .2s ease', cursor: 'pointer' }}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
