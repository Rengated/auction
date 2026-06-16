import { useEffect, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import './styles/admin.css';
import { logout, queryClient, useAdminLots, useLogin, useMe } from './lib/queries';
import { getSocket } from './lib/ws';
import { AI, HermesH } from './components/icons';
import { ToastProvider } from './components/toast';
import { DashboardPage } from './pages/dashboard';
import { LotsPage } from './pages/lots';
import { LotFormPage } from './pages/lot-form';
import { AuctionsPage } from './pages/auctions';
import { AuctionControlPage } from './pages/auction-control';
import { DealsPage } from './pages/deals';
import { DealDetailPage } from './pages/deal-detail';
import { UsersPage } from './pages/users';
import { StaffPage } from './pages/staff';
import { SettingsPage } from './pages/settings';

function Login({ denied }: { denied?: boolean }) {
  return (
    <div className="login-stage">
      <div className="login-card">
        <div className="logo" style={{ padding: 0, marginBottom: 18 }}>
          <HermesH size={34} />
          <div>
            <div className="nm">Hermes Trade</div>
            <div className="sub">админ-панель</div>
          </div>
        </div>
        {denied ? (
          <>
            <div style={{ font: '700 16px/1.3 var(--ui)', marginBottom: 8 }}>Нет доступа</div>
            <div style={{ font: '500 13.5px/1.5 var(--ui)', color: 'var(--dim)', marginBottom: 18 }}>
              Ваш аккаунт не имеет роли менеджера. Обратитесь к администратору салона.
            </div>
            <button className="btn ghost" style={{ width: '100%', justifyContent: 'center' }} onClick={() => logout().then(() => location.reload())}>
              Сменить аккаунт
            </button>
          </>
        ) : (
          <LoginForm />
        )}
      </div>
    </div>
  );
}

function LoginForm() {
  const login = useLogin();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login.isPending) return;
    setError('');
    login.mutate(
      { username: username.trim(), password },
      {
        onSuccess: () => location.reload(),
        onError: (err) => setError(err.message || 'Не удалось войти'),
      },
    );
  };

  return (
    <form onSubmit={submit}>
      <div style={{ font: '700 16px/1.3 var(--ui)', marginBottom: 8 }}>Вход для сотрудников</div>
      <div style={{ font: '500 13.5px/1.5 var(--ui)', color: 'var(--dim)', marginBottom: 18 }}>
        Войдите по логину и паролю, выданным администратором.
      </div>
      <div style={{ marginBottom: 14 }}>
        <label className="fld-l">Логин</label>
        <input
          className="in"
          autoFocus
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>
      <div style={{ marginBottom: 18 }}>
        <label className="fld-l">Пароль</label>
        <input
          className="in"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && (
        <div style={{ font: '500 13px/1.4 var(--ui)', color: 'var(--live)', marginBottom: 14 }}>{error}</div>
      )}
      <button
        type="submit"
        className="btn acc"
        disabled={login.isPending || !username.trim() || !password}
        style={{ width: '100%', justifyContent: 'center', padding: 14 }}
      >
        {login.isPending ? 'Вход…' : 'Войти'}
      </button>
    </form>
  );
}

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const location = useLocation();
  const { data: me } = useMe();
  const { data: lotsPage } = useAdminLots('all');
  const { data: livePage } = useAdminLots('live');
  const lotsN = lotsPage?.total ?? 0;
  const liveN = livePage?.total ?? 0;
  const items = [
    ['/', 'Дашборд', AI.dash, null],
    ['/lots', 'Лоты', AI.lots, lotsN || null],
    ['/auctions', 'Торги', AI.gavel, liveN || null],
    ['/deals', 'Сделки', AI.deals, null],
    ['/users', 'Пользователи', AI.users, null],
    // Персонал — администратору и директору
    ...(me?.role === 'admin' || me?.role === 'director' ? ([['/staff', 'Персонал', AI.users, null]] as const) : []),
    ['/settings', 'Параметры', AI.gear, null],
  ] as const;
  const active = (p: string) => (p === '/' ? location.pathname === '/' : location.pathname.startsWith(p));
  return (
    <>
      <div className={`side-overlay ${open ? 'on' : ''}`} onClick={onClose} />
      <div className={`side ${open ? 'open' : ''}`}>
      <div className="logo">
        <HermesH size={34} />
        <div>
          <div className="nm">Hermes Trade</div>
          <div className="sub">админ-панель</div>
        </div>
      </div>
      <div className="side-sec">Управление</div>
      {items.map(([path, label, icon, badge]) => (
        <Link key={path} to={path} style={{ textDecoration: 'none' }} onClick={onClose}>
          <button className={`navbtn ${active(path) ? 'on' : ''}`}>
            <span className="ic">{icon}</span>
            {label}
            {badge ? (
              <span className="badge" style={path === '/auctions' ? {} : { background: 'var(--panel3)', color: 'var(--dim)' }}>
                {badge}
              </span>
            ) : null}
          </button>
        </Link>
      ))}
      <div className="side-foot">
        <div className="av">{(me?.displayName?.[0] ?? 'М').toUpperCase()}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="who">{me?.displayName ?? '—'}</div>
          <div className="role">{me?.role === 'director' ? 'директор' : me?.role === 'admin' ? 'администратор' : 'менеджер торгов'}</div>
        </div>
        <button className="iconbtn2" title="Выйти" onClick={() => logout().then(() => window.location.reload())}>
          <svg viewBox="0 0 24 24" style={{ width: 16, height: 16 }} stroke="currentColor" fill="none" strokeWidth={1.8}>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
        </button>
      </div>
      </div>
    </>
  );
}

const TITLES: Array<[string, string, string]> = [
  ['/lots/new', 'Лоты', 'Новый лот'],
  ['/lots', 'Управление', 'Лоты'],
  ['/auctions', 'Управление', 'Торги'],
  ['/deals', 'Управление', 'Сделки'],
  ['/users', 'Управление', 'Пользователи'],
  ['/staff', 'Управление', 'Персонал'],
  ['/settings', 'Управление', 'Параметры аукциона'],
  ['/', 'Hermes Trade', 'Дашборд'],
];

function Topbar({ onBurger }: { onBurger: () => void }) {
  const location = useLocation();
  const [, crumb, title] = TITLES.find(([p]) => (p === '/' ? location.pathname === '/' : location.pathname.startsWith(p))) ?? TITLES.at(-1)!;
  const date = new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
  return (
    <div className="topbar">
      <button className="burger" aria-label="Меню" onClick={onBurger}>
        <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={2}><path d="M4 6h16M4 12h16M4 18h16" /></svg>
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="crumb">{crumb}</div>
        <h1>{title}</h1>
      </div>
      <span className="num topbar-date" style={{ fontSize: 13, color: 'var(--faint)', textTransform: 'capitalize' }}>{date}</span>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  useEffect(() => {
    getSocket();
  }, []);
  // Закрывать drawer при переходе на другую страницу
  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);
  return (
    <div className="admin">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      <div className="main">
        <Topbar onBurger={() => setNavOpen(true)} />
        {children}
      </div>
    </div>
  );
}

function Gate({ children }: { children: React.ReactNode }) {
  const { data: me, isLoading } = useMe();
  if (isLoading) return <div className="login-stage" style={{ color: 'var(--faint)' }}>Hermes Trade…</div>;
  if (!me) return <Login />;
  if (me.role === 'buyer') return <Login denied />;
  return <Shell>{children}</Shell>;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
      <BrowserRouter>
        <Gate>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/lots" element={<LotsPage />} />
            <Route path="/lots/new" element={<LotFormPage />} />
            <Route path="/lots/:id/edit" element={<LotFormPage />} />
            <Route path="/lots/:id/relist" element={<LotFormPage relist />} />
            <Route path="/auctions" element={<AuctionsPage />} />
            <Route path="/auctions/:id" element={<AuctionControlPage />} />
            <Route path="/deals" element={<DealsPage />} />
            <Route path="/deals/:id" element={<DealDetailPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/staff" element={<StaffPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Gate>
      </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}
