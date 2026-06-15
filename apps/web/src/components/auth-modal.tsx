import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUiStore } from '../lib/ui-store';
import { useIsMobile } from '../lib/layout';
import { rememberReturn } from '../lib/auth';
import { HermesH } from './brand';
import { I, Ic } from './icons';

/**
 * Приглашение войти поверх контента (не редирект на действие): боттом-шит на
 * мобильном, центрированная модалка на вебе. Кнопка ведёт на /auth, где согласие
 * с политикой и вход через Яндекс. Гость остаётся на странице (закрывается крестиком).
 */
export function AuthPromptModal() {
  const { open, reason } = useUiStore((s) => s.authPrompt);
  const close = useUiStore((s) => s.closeAuthPrompt);
  const navigate = useNavigate();
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

  const goAuth = () => {
    rememberReturn(); // вернуть на текущую страницу после входа
    close();
    navigate('/auth');
  };

  const card = (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        width: '100%',
        maxWidth: isMobile ? '100%' : 400,
        borderRadius: isMobile ? '20px 20px 0 0' : 18,
        padding: isMobile ? '8px 22px calc(24px + env(safe-area-inset-bottom))' : '26px 28px 24px',
        boxShadow: '0 -8px 40px rgba(0,0,0,.4)',
        animation: isMobile ? 'sheetUp .26s cubic-bezier(.2,.8,.2,1)' : 'modalIn .2s ease',
      }}
    >
      {isMobile && (
        <div style={{ width: 38, height: 4, borderRadius: 3, background: 'var(--line2, var(--line))', margin: '0 auto 18px' }} />
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
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
      <p style={{ color: 'var(--text-dim)', fontSize: 13.5, lineHeight: 1.5, margin: '10px 0 20px' }}>
        Просмотр лотов открыт всем. Для участия в торгах нужен быстрый вход через Яндекс ID.
      </p>

      <button
        className="btn block accent"
        style={{ padding: '15px', fontWeight: 700, justifyContent: 'center' }}
        onClick={goAuth}
      >
        Войти в аккаунт
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
