import { useEffect, useState } from 'react';

/** Событие beforeinstallprompt (нет в стандартных типах TS). */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
// Ловим событие как можно раньше — браузер шлёт его один раз при загрузке.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
  });
}

/** Приложение уже работает как установленное PWA (standalone)? */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/** iOS (Safari) — там нет beforeinstallprompt, нужна ручная инструкция «Поделиться → На экран». */
export function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/**
 * Установка PWA: на Android/desktop — нативный промпт, на iOS — инструкция (canPrompt=false).
 * canInstall=false и не-iOS → уже установлено или браузер не поддерживает.
 */
export function useInstallPrompt() {
  const [canPrompt, setCanPrompt] = useState(Boolean(deferred));

  useEffect(() => {
    const onPrompt = () => setCanPrompt(true);
    const onInstalled = () => { deferred = null; setCanPrompt(false); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!deferred) return 'unavailable';
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    deferred = null;
    setCanPrompt(false);
    return outcome;
  };

  return { canPrompt, promptInstall, ios: isIos(), standalone: isStandalone() };
}
