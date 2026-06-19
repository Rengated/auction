import { useEffect, useState, type ReactNode } from 'react';
import { useUiStore } from '../lib/ui-store';
import { useIsMobile } from '../lib/layout';
import { useConfig } from '../lib/queries';
import { enablePush, getPushState, type PushState } from '../lib/push';
import { useInstallPrompt } from '../lib/install-prompt';
import { HermesH } from './brand';
import { I, Ic } from './icons';

/**
 * Онбординг при первом входе: 3–4 слайда — как ставить ставки, включить пуши,
 * вынести PWA на экран. Показывается один раз (флаг в localStorage),
 * можно пропустить. Действия (пуш/установка) выполняются прямо из слайдов.
 */

type SlideKind = 'bids' | 'push' | 'install';

interface Slide {
  kind: SlideKind;
  icon: ReactNode;
  title: string;
  text: string;
}

const SLIDES: Slide[] = [
  {
    kind: 'bids',
    icon: I.bids,
    title: 'Как делать ставки',
    text: 'Откройте лот в эфире, выберите сумму степпером «−/+» или быстрыми кнопками и нажмите «Поставить». Если вашу ставку перебьют — придёт уведомление.',
  },
  {
    kind: 'push',
    icon: I.bell,
    title: 'Включите уведомления',
    text: 'Чтобы не пропустить, когда вашу ставку перебили, лот скоро закроется или вы выиграли — даже при закрытом приложении.',
  },
  {
    kind: 'install',
    icon: I.share,
    title: 'Вынесите на экран телефона',
    text: 'Установите приложение на главный экран — открывается как обычное, на весь экран, без адресной строки.',
  },
];

export function Onboarding() {
  const isMobile = useIsMobile();
  const finish = useUiStore((s) => s.finishOnboarding);
  const { data: cfg } = useConfig();
  const { canPrompt, promptInstall, ios, standalone } = useInstallPrompt();
  const [i, setI] = useState(0);
  const [pushState, setPushState] = useState<PushState>('off');
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    getPushState().then(setPushState);
  }, []);

  // Esc/закрытие = пропустить; блокируем скролл фона
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && finish();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [finish]);

  const last = i === SLIDES.length - 1;
  const slide = SLIDES[i];
  const next = () => (last ? finish() : setI((n) => n + 1));

  const enablePushNow = async () => {
    if (!cfg?.vapidPublicKey || pushBusy) return;
    setPushBusy(true);
    try {
      setPushState(await enablePush(cfg.vapidPublicKey));
    } finally {
      setPushBusy(false);
    }
  };

  const installNow = async () => {
    await promptInstall();
  };

  // Контекстная кнопка-действие для текущего слайда (поверх «Далее»).
  const action = (() => {
    if (slide.kind === 'push') {
      if (pushState === 'unsupported' || !cfg?.vapidPublicKey) return null;
      if (pushState === 'on') return { label: 'Уведомления включены ✓', done: true, onClick: () => {} };
      if (pushState === 'denied') return { label: 'Разрешите в настройках браузера', done: false, onClick: () => {}, disabled: true };
      return { label: pushBusy ? 'Включаем…' : 'Включить уведомления', done: false, onClick: enablePushNow, disabled: pushBusy };
    }
    if (slide.kind === 'install') {
      if (standalone) return { label: 'Уже на экране ✓', done: true, onClick: () => {} };
      if (canPrompt) return { label: 'Добавить на экран', done: false, onClick: installNow };
      return null; // iOS — инструкция в тексте; иначе действие недоступно
    }
    return null;
  })();

  const card = (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        width: '100%',
        maxWidth: isMobile ? '100%' : 420,
        borderRadius: isMobile ? '20px 20px 0 0' : 18,
        padding: isMobile ? '8px 22px calc(22px + env(safe-area-inset-bottom))' : '24px 28px 22px',
        boxShadow: '0 -8px 40px rgba(0,0,0,.4)',
        animation: isMobile ? 'sheetUp .26s cubic-bezier(.2,.8,.2,1)' : 'modalIn .2s ease',
      }}
    >
      {isMobile && (
        <div style={{ width: 38, height: 4, borderRadius: 3, background: 'var(--line2, var(--line))', margin: '0 auto 16px' }} />
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, color: 'var(--text)', fontWeight: 700 }}>
          <HermesH size={20} color="var(--accent)" /> Auction Germes
        </span>
        <button
          onClick={finish}
          aria-label="Пропустить"
          style={{ border: 'none', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
        >
          Пропустить
        </button>
      </div>

      <div style={{ display: 'grid', placeItems: 'center', marginBottom: 18 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 18,
            background: 'color-mix(in srgb, var(--accent) 14%, transparent)',
            color: 'var(--accent)',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <Ic d={slide.icon} s={30} />
        </div>
      </div>

      <h2 style={{ font: '800 21px/1.2 var(--ui)', letterSpacing: '-0.02em', margin: 0, textAlign: 'center' }}>
        {slide.title}
      </h2>
      <p style={{ color: 'var(--text-dim)', fontSize: 13.5, lineHeight: 1.55, margin: '10px 0 18px', textAlign: 'center' }}>
        {slide.text}
        {slide.kind === 'install' && ios && !standalone && (
          <>
            <br />
            <br />
            На iPhone: нажмите «Поделиться» в Safari, затем «На экран „Домой“».
          </>
        )}
      </p>

      {/* индикатор шагов */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 18 }}>
        {SLIDES.map((_, n) => (
          <span
            key={n}
            style={{
              width: n === i ? 18 : 6,
              height: 6,
              borderRadius: 3,
              background: n === i ? 'var(--accent)' : 'var(--line)',
              transition: 'width .2s',
            }}
          />
        ))}
      </div>

      {action && (
        <button
          className={`btn block ${action.done ? '' : 'accent'}`}
          disabled={action.disabled || action.done}
          onClick={action.onClick}
          style={{ padding: '13px', fontWeight: 700, justifyContent: 'center', marginBottom: 9, ...(action.done ? { color: 'var(--win, var(--accent))' } : {}) }}
        >
          {action.label}
        </button>
      )}
      <button
        className={`btn block ${action ? '' : 'accent'}`}
        style={{ padding: '13px', fontWeight: 700, justifyContent: 'center' }}
        onClick={next}
      >
        {last ? 'Начать' : 'Далее'}
      </button>
    </div>
  );

  return (
    <div
      onClick={finish}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
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
