import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './styles/tokens.css';
import { queryClient, useMe } from './lib/queries';
import { getSocket } from './lib/ws';
import { useIsMobile } from './lib/layout';
import { useUiStore } from './lib/ui-store';
import { MobileShell, WebShell } from './shells';
import { AuthPage } from './pages/auth';
import { CatalogPage } from './pages/catalog';
import { LivePage } from './pages/live';
import { LotPage } from './pages/lot';
import { MyBidsPage } from './pages/my-bids';
import { ProfilePage } from './pages/profile';
import { SellPage } from './pages/sell';

function Shell({ children, mobileNav = true }: { children: React.ReactNode; mobileNav?: boolean }) {
  const isMobile = useIsMobile();
  const setQ = useUiStore((s) => s.setQ);
  return isMobile ? (
    <MobileShell nav={mobileNav}>{children}</MobileShell>
  ) : (
    <WebShell onSearch={setQ}>{children}</WebShell>
  );
}

function Gate({ children }: { children: React.ReactNode }) {
  const { data: me, isLoading } = useMe();
  if (isLoading) {
    return <div style={{ display: 'grid', placeItems: 'center', height: '100dvh', color: 'var(--text-faint)' }}>Hermes Trade…</div>;
  }
  if (!me) return <AuthPage />;
  return <>{children}</>;
}

const page = (el: React.ReactNode, mobileNav = true) => (
  <Gate>
    <Shell mobileNav={mobileNav}>{el}</Shell>
  </Gate>
);

function Router() {
  useEffect(() => {
    getSocket();
  }, []);
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/" element={page(<CatalogPage />)} />
        <Route path="/live" element={page(<LivePage />)} />
        <Route path="/lots/:id" element={page(<LotPage />, false)} />
        <Route path="/my-bids" element={page(<MyBidsPage />)} />
        <Route path="/profile" element={page(<ProfilePage />)} />
        <Route path="/profile/:page" element={page(<ProfilePage />, false)} />
        <Route path="/sell" element={page(<SellPage />, false)} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
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
