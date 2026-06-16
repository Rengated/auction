import { create } from 'zustand';
import type { CatalogFilter } from './queries';

export type Theme = 'dark' | 'light';

const THEME_KEY = 'hermes-theme';
const ONBOARDING_KEY = 'hermes-onboarding-done';

const initialTheme = (): Theme =>
  (localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark');

const onboardingDone = (): boolean => localStorage.getItem(ONBOARDING_KEY) === '1';

/** Глобальное UI-состояние: фильтр каталога, поиск, тема, модалка приглашения войти. */
interface UiState {
  filter: CatalogFilter;
  q: string;
  theme: Theme;
  /** Модалка «войдите, чтобы …»: reason — для контекстного заголовка. */
  authPrompt: { open: boolean; reason: string };
  /** Онбординг пройден (или пропущен) — больше не показываем. */
  onboardingDone: boolean;
  setFilter: (f: CatalogFilter) => void;
  setQ: (q: string) => void;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  openAuthPrompt: (reason?: string) => void;
  closeAuthPrompt: () => void;
  finishOnboarding: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  filter: 'all',
  q: '',
  theme: initialTheme(),
  authPrompt: { open: false, reason: 'участвовать в торгах' },
  onboardingDone: onboardingDone(),
  openAuthPrompt: (reason = 'участвовать в торгах') => set({ authPrompt: { open: true, reason } }),
  closeAuthPrompt: () => set((s) => ({ authPrompt: { ...s.authPrompt, open: false } })),
  finishOnboarding: () => {
    localStorage.setItem(ONBOARDING_KEY, '1');
    set({ onboardingDone: true });
  },
  setFilter: (filter) => set({ filter }),
  setQ: (q) => set({ q }),
  setTheme: (theme) => {
    localStorage.setItem(THEME_KEY, theme);
    set({ theme });
  },
  toggleTheme: () =>
    set((s) => {
      const theme = s.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem(THEME_KEY, theme);
      return { theme };
    }),
}));
