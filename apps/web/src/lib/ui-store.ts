import { create } from 'zustand';
import type { CatalogFilter } from './queries';

/** Глобальное UI-состояние: фильтр каталога и поисковый запрос (топбар ↔ каталог). */
interface UiState {
  filter: CatalogFilter;
  q: string;
  setFilter: (f: CatalogFilter) => void;
  setQ: (q: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  filter: 'all',
  q: '',
  setFilter: (filter) => set({ filter }),
  setQ: (q) => set({ q }),
}));
