import { API_ORIGIN } from './api';

const RETURN_KEY = 'hermes-return';

/**
 * Уход на Яндекс OAuth с сохранением текущего пути — чтобы после входа
 * вернуть гостя на ту же страницу (лот), а не на главную.
 */
export function goYandex(): void {
  const path = location.pathname + location.search;
  // /auth и корень не сохраняем (иначе зацикливание / лишний редирект)
  if (path !== '/' && !path.startsWith('/auth')) {
    localStorage.setItem(RETURN_KEY, path);
  } else {
    localStorage.removeItem(RETURN_KEY);
  }
  window.location.href = `${API_ORIGIN}/auth/yandex?target=web`;
}

/** Сохранённый путь возврата после входа (и сразу очищает). */
export function takeReturnPath(): string | null {
  const path = localStorage.getItem(RETURN_KEY);
  if (path) localStorage.removeItem(RETURN_KEY);
  return path;
}
