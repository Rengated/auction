import type { ApiErrorBody } from '@hermes/shared';

export const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ?? 'http://localhost:3000';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ApiErrorBody,
  ) {
    super(body.message);
  }

  get code(): string {
    return this.body.code;
  }
}

let refreshing: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  refreshing ??= fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => setTimeout(() => (refreshing = null), 0));
  return refreshing;
}

export async function api<T>(path: string, init?: RequestInit & { retry?: boolean }): Promise<T> {
  const isForm = init?.body instanceof FormData;
  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: isForm ? init?.headers : { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (res.status === 401 && init?.retry !== false) {
    if (await tryRefresh()) return api<T>(path, { ...init, retry: false });
  }
  if (!res.ok) {
    let body: ApiErrorBody;
    try {
      body = await res.json();
    } catch {
      body = { code: 'UNKNOWN', message: res.statusText };
    }
    throw new ApiError(res.status, body);
  }
  return res.json();
}

export const get = <T>(path: string) => api<T>(path);
export const post = <T>(path: string, data?: unknown) =>
  api<T>(path, { method: 'POST', body: data !== undefined ? JSON.stringify(data) : undefined });
export const patch = <T>(path: string, data: unknown) =>
  api<T>(path, { method: 'PATCH', body: JSON.stringify(data) });
export const putJson = <T>(path: string, data: unknown) =>
  api<T>(path, { method: 'PUT', body: JSON.stringify(data) });
export const del = <T>(path: string) => api<T>(path, { method: 'DELETE' });
export const postForm = <T>(path: string, form: FormData) => api<T>(path, { method: 'POST', body: form });
