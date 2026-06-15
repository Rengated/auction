import { API_ORIGIN } from './api';

const RETURN_KEY = 'hermes-return';

/**
 * Запомнить текущий путь для возврата после входа — вызывается перед переходом
 * на /auth (из модалки), чтобы после авторизации вернуть гостя на ту же страницу.
 */
export function rememberReturn(): void {
  const path = location.pathname + location.search;
  if (path !== '/' && !path.startsWith('/auth')) {
    localStorage.setItem(RETURN_KEY, path);
  } else {
    localStorage.removeItem(RETURN_KEY);
  }
}

/** Уход на Яндекс OAuth (со страницы /auth). Return-path уже сохранён rememberReturn(). */
export function goYandex(): void {
  window.location.href = `${API_ORIGIN}/auth/yandex?target=web`;
}

/** Сохранённый путь возврата после входа (и сразу очищает). */
export function takeReturnPath(): string | null {
  const path = localStorage.getItem(RETURN_KEY);
  if (path) localStorage.removeItem(RETURN_KEY);
  return path;
}
