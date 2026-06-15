import { useEffect, useRef } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import './styles/tokens.css';
import { queryClient, useMe } from './lib/queries';
import { getSocket } from './lib/ws';
import { takeReturnPath } from './lib/auth';
import { useIsMobile } from './lib/layout';
import { useUiStore } from './lib/ui-store';
import { MobileShell, WebShell } from './shells';
import { AuthPromptModal } from './components/auth-modal';
import { AuthPage, BlockedScreen } from './pages/auth';
import { CatalogPage } from './pages/catalog';
import { LivePage } from './pages/live';
import { LotPage } from './pages/lot';
import { MyBidsPage } from './pages/my-bids';
import { ProfilePage } from './pages/profile';

/** Цвет браузерного хрома под тему (--bg из tokens.css). */
const THEME_COLOR = { dark: '#101216', light: '#f7f7f5' } as const;

function Shell({ children, mobileNav = true }: { children: React.ReactNode; mobileNav?: boolean }) {
  const isMobile = useIsMobile();
  const setQ = useUiStore((s) => s.setQ);
  return isMobile ? (
    <MobileShell nav={mobileNav}>{children}</MobileShell>
  ) : (
    <WebShell onSearch={setQ}>{children}</WebShell>
  );
}

const loadingScreen = (
  <div style={{ display: 'grid', placeItems: 'center', height: '100dvh', color: 'var(--text-faint)' }}>Hermes Trade…</div>
);

/** Приватный гейт: требует входа (гость → экран входа) + блокировка. */
function Gate({ children }: { children: React.ReactNode }) {
  const { data: me, isLoading } = useMe();
  if (isLoading) return loadingScreen;
  if (!me) return <AuthPage />;
  if (me.blockedUntil && new Date(me.blockedUntil) > new Date()) return <BlockedScreen me={me} />;
  return <>{children}</>;
}

/** Гостевой гейт: пускает всех (каталог/лот). Заблокированного (вошедшего) — на экран блокировки. */
function GuestGate({ children }: { children: React.ReactNode }) {
  const { data: me, isLoading } = useMe();
  if (isLoading) return loadingScreen;
  if (me?.blockedUntil && new Date(me.blockedUntil) > new Date()) return <BlockedScreen me={me} />;
  return <>{children}</>;
}

const page = (el: React.ReactNode, mobileNav = true) => (
  <Gate>
    <Shell mobileNav={mobileNav}>{el}</Shell>
  </Gate>
);

const guestPage = (el: React.ReactNode, mobileNav = true) => (
  <GuestGate>
    <Shell mobileNav={mobileNav}>{el}</Shell>
  </GuestGate>
);

/** После входа возвращает гостя на ту же страницу (Яндекс вернул на корень). */
function ReturnRedirect() {
  const { data: me } = useMe();
  const location = useLocation();
  const navigate = useNavigate();
  const done = useRef(false);
  useEffect(() => {
    if (done.current || !me || location.pathname !== '/') return;
    const ret = takeReturnPath();
    if (ret && ret !== '/') {
      done.current = true;
      navigate(ret, { replace: true });
    }
  }, [me, location.pathname, navigate]);
  return null;
}

function Router() {
  const theme = useUiStore((s) => s.theme);
  useEffect(() => {
    getSocket();
  }, []);
  // Тема: атрибут на <html> (tokens.css: тёмная в :root, светлая в [data-theme='light']) + цвет хрома
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
  }, [theme]);
  return (
    <BrowserRouter>
      <ReturnRedirect />
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/" element={guestPage(<CatalogPage />)} />
        <Route path="/live" element={guestPage(<LivePage />)} />
        <Route path="/lots/:id" element={guestPage(<LotPage />, false)} />
        <Route path="/my-bids" element={page(<MyBidsPage />)} />
        <Route path="/profile" element={page(<ProfilePage />)} />
        <Route path="/profile/:page" element={page(<ProfilePage />, false)} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <AuthPromptModal />
    </BrowserRouter>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
    </QueryClientProvider>
  );
}
