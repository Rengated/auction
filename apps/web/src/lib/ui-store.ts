import { create } from 'zustand';
import type { CatalogFilter } from './queries';

export type Theme = 'dark' | 'light';

const THEME_KEY = 'hermes-theme';

const initialTheme = (): Theme =>
  (localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark');

/** Глобальное UI-состояние: фильтр каталога, поиск, тема, модалка приглашения войти. */
interface UiState {
  filter: CatalogFilter;
  q: string;
  theme: Theme;
  /** Модалка «войдите, чтобы …»: reason — для контекстного заголовка. */
  authPrompt: { open: boolean; reason: string };
  setFilter: (f: CatalogFilter) => void;
  setQ: (q: string) => void;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  openAuthPrompt: (reason?: string) => void;
  closeAuthPrompt: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  filter: 'all',
  q: '',
  theme: initialTheme(),
  authPrompt: { open: false, reason: 'участвовать в торгах' },
  openAuthPrompt: (reason = 'участвовать в торгах') => set({ authPrompt: { open: true, reason } }),
  closeAuthPrompt: () => set((s) => ({ authPrompt: { ...s.authPrompt, open: false } })),
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
