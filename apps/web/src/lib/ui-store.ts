import { create } from 'zustand';
import type { CatalogFilter } from './queries';

export type Theme = 'dark' | 'light';

const THEME_KEY = 'hermes-theme';

const initialTheme = (): Theme =>
  (localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark');

/** Глобальное UI-состояние: фильтр каталога, поисковый запрос (топбар ↔ каталог) и тема. */
interface UiState {
  filter: CatalogFilter;
  q: string;
  theme: Theme;
  setFilter: (f: CatalogFilter) => void;
  setQ: (q: string) => void;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  filter: 'all',
  q: '',
  theme: initialTheme(),
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
