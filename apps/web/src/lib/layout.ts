import { useSyncExternalStore } from 'react';

const QUERY = '(max-width: 960px)';

function subscribe(cb: () => void): () => void {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener('change', cb);
  return () => mql.removeEventListener('change', cb);
}

/** Брейкпоинт раскладки: ≤960px — мобильная (дизайн 392×832), шире — веб. */
export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches);
}
