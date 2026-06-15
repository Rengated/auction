import { useEffect } from 'react';
import { useUiStore } from '../lib/ui-store';
import { useIsMobile } from '../lib/layout';
import { goYandex } from '../lib/auth';
import { YandexGlyph, YA_RED, HermesH } from './brand';
import { I, Ic } from './icons';

/**
 * Приглашение войти поверх контента (не редирект): боттом-шит на мобильном,
 * центрированная модалка на вебе. Гость остаётся на странице (закрывается крестиком).
 */
export function AuthPromptModal() {
  const { open, reason } = useUiStore((s) => s.authPrompt);
  const close = useUiStore((s) => s.closeAuthPrompt);
  const isMobile = useIsMobile();

  // Esc закрывает; блокируем скролл фона пока открыто
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  if (!open) return null;

  const perks = [
    ['🔨', 'Ставки в реальном времени без депозита'],
    ['🔔', 'Уведомления о перебитии и старте лотов'],
    ['🤝', 'Менеджер сопровождает сделку после победы'],
  ] as const;

  const card = (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        width: '100%',
        maxWidth: isMobile ? '100%' : 420,
        borderRadius: isMobile ? '20px 20px 0 0' : 18,
        padding: isMobile ? '8px 22px calc(24px + env(safe-area-inset-bottom))' : '28px 28px 26px',
        boxShadow: '0 -8px 40px rgba(0,0,0,.4)',
        animation: isMobile ? 'sheetUp .26s cubic-bezier(.2,.8,.2,1)' : 'modalIn .2s ease',
      }}
    >
      {isMobile && (
        <div style={{ width: 38, height: 4, borderRadius: 3, background: 'var(--line2, var(--line))', margin: '0 auto 18px' }} />
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, color: 'var(--text)', fontWeight: 700 }}>
          <HermesH size={22} color="var(--accent)" /> Hermes Trade
        </span>
        <button
          onClick={close}
          aria-label="Закрыть"
          style={{ width: 32, height: 32, borderRadius: 9, border: '1px solid var(--line)', background: 'var(--surface-2, transparent)', color: 'var(--text-dim)', cursor: 'pointer', display: 'grid', placeItems: 'center', padding: 7 }}
        >
          <Ic d={I.close} s={16} />
        </button>
      </div>

      <h2 style={{ font: '800 22px/1.18 var(--ui)', letterSpacing: '-0.02em', margin: 0 }}>
        Войдите, чтобы {reason}
      </h2>
      <p style={{ color: 'var(--text-dim)', fontSize: 13.5, lineHeight: 1.5, margin: '10px 0 18px' }}>
        Просмотр лотов открыт всем. Для участия в торгах нужен быстрый вход через Яндекс ID.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginBottom: 22 }}>
        {perks.map(([icon, text]) => (
          <div key={text} style={{ display: 'flex', gap: 11, alignItems: 'center' }}>
            <span style={{ fontSize: 17, flex: 'none', width: 22, textAlign: 'center' }}>{icon}</span>
            <span style={{ fontSize: 13.5, color: 'var(--text)' }}>{text}</span>
          </div>
        ))}
      </div>

      <button
        className="btn block"
        style={{ padding: '15px', background: YA_RED, color: '#fff', fontWeight: 700, justifyContent: 'center' }}
        onClick={goYandex}
      >
        <YandexGlyph size={20} /> Войти через Яндекс ID
      </button>
    </div>
  );

  return (
    <div
      onClick={close}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(8,9,12,.62)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        padding: isMobile ? 0 : 24,
        animation: 'fadeIn .18s ease',
      }}
    >
      {card}
    </div>
  );
}
