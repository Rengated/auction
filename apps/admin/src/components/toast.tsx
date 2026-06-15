import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

type ToastKind = 'ok' | 'error';
interface ToastItem {
  id: number;
  kind: ToastKind;
  msg: string;
}

interface ToastApi {
  ok: (msg: string) => void;
  error: (msg: string) => void;
}

const ToastCtx = createContext<ToastApi | null>(null);

/** Глобальные тосты админки. Оборачивает приложение; useToast() даёт ok()/error(). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const push = useCallback((kind: ToastKind, msg: string) => {
    const id = ++seq.current;
    setItems((cur) => [...cur, { id, kind, msg }]);
    // Ошибки висят дольше — их важно успеть прочитать.
    const ttl = kind === 'error' ? 5000 : 2000;
    setTimeout(() => setItems((cur) => cur.filter((t) => t.id !== id)), ttl);
  }, []);

  const api: ToastApi = {
    ok: (msg) => push('ok', msg),
    error: (msg) => push('error', msg),
  };

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="toast-stack">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.kind === 'error' ? 'toast-err' : ''}`} onClick={() => setItems((cur) => cur.filter((x) => x.id !== t.id))}>
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast вне ToastProvider');
  return ctx;
}
