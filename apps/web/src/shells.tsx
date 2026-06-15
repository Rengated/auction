import type { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMe, useUnreadCount } from './lib/queries';
import { useUiStore } from './lib/ui-store';
import { I } from './components/icons';
import { HermesH, HermesLogo } from './components/brand';

/** Мобильная оболочка: контент + нижняя навигация из дизайна. */
export function MobileShell({ children, nav = true }: { children: ReactNode; nav?: boolean }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: me } = useMe();
  const { data: unread } = useUnreadCount();
  const openAuthPrompt = useUiStore((s) => s.openAuthPrompt);
  // Приватные табы у гостя → модалка входа с контекстным текстом
  const items = [
    ['/', 'Лоты', I.catalog, null],
    ['/my-bids', 'Ставки', I.bids, 'перейти в мои ставки'],
    ['/profile', 'Профиль', I.user, 'перейти в профиль'],
  ] as const;
  const active = (path: string) =>
    path === '/' ? location.pathname === '/' || location.pathname === '/live' : location.pathname.startsWith(path);
  const onTab = (path: string, reason: string | null) => {
    if (reason && !me) openAuthPrompt(reason);
    else navigate(path);
  };
  return (
    <div className="mshell">
      {children}
      {nav && (
        <div className="nav">
          {items.map(([path, label, icon, reason]) => (
            <button key={path} className={`tab ${active(path) ? 'on' : ''}`} onClick={() => onTab(path, reason)}>
              <span className="ic" style={{ position: 'relative' }}>
                {icon}
                {path === '/profile' && (unread?.count ?? 0) > 0 && (
                  <span style={{ position: 'absolute', top: -1, right: -3, width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)' }} />
                )}
              </span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Веб-оболочка: топбар (бренд, нав-ссылки, поиск, тема, уведомления, аватар) + футер. */
export function WebShell({ children, onSearch }: { children: ReactNode; onSearch?: (q: string) => void }) {
  const { data: me } = useMe();
  const { data: unread } = useUnreadCount();
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const openAuthPrompt = useUiStore((s) => s.openAuthPrompt);
  const location = useLocation();
  const navigate = useNavigate();
  // reason ≠ null → приватная ссылка: гость видит модалку входа вместо перехода
  const links = [
    ['/', 'Каталог', null],
    ['/live', 'Живые торги', null],
    ['/my-bids', 'Мои ставки', 'перейти в мои ставки'],
  ] as const;
  const iconBtn = {
    width: 38, height: 38, borderRadius: 10, border: '1px solid var(--line)', background: 'var(--surface)',
    color: 'var(--text-dim)', cursor: 'pointer', display: 'grid', placeItems: 'center', padding: 8, flex: 'none',
  } as const;
  const unreadCount = unread?.count ?? 0;
  return (
    <div className="web">
      <div className="topbar">
        <div className="wrap">
          <div className="row">
            <Link to="/" style={{ textDecoration: 'none', flex: 'none' }}>
              <HermesLogo markSize={30} fontSize={16} color="var(--text)" accent="#9aa2ac" />
            </Link>
            <nav className="nav-links">
              {links.map(([path, label, reason]) => (
                <Link
                  key={path}
                  to={path}
                  className={location.pathname === path ? 'on' : ''}
                  onClick={(e) => {
                    if (reason && !me) {
                      e.preventDefault();
                      openAuthPrompt(reason);
                    }
                  }}
                >
                  {label}
                </Link>
              ))}
            </nav>
            <div className="topsearch" style={{ marginLeft: 'auto' }}>
              <span style={{ width: 17, height: 17, flex: 'none' }}>{I.search}</span>
              <input
                placeholder="Поиск по объявлениям — марка, модель…"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onSearch?.((e.target as HTMLInputElement).value);
                    navigate('/');
                  }
                }}
              />
            </div>
            {me && (
              <button style={{ ...iconBtn, position: 'relative' }} title="Уведомления" onClick={() => navigate('/profile/notif')}>
                {I.bell}
                {unreadCount > 0 && (
                  <span className="num" style={{ position: 'absolute', top: -5, right: -5, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 8, background: 'var(--live)', color: '#fff', font: '700 10px/16px var(--num)', textAlign: 'center' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            )}
            <button style={iconBtn} title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'} onClick={toggleTheme}>
              {theme === 'dark' ? I.sun : I.moon}
            </button>
            <button className="avatar" title={me ? 'Профиль' : 'Войти'} onClick={() => navigate(me ? '/profile' : '/auth')}>
              {me?.avatarUrl ? <img src={me.avatarUrl} alt="" /> : (me?.displayName?.[0] ?? '·').toUpperCase()}
            </button>
          </div>
        </div>
      </div>
      <main>{children}</main>
      <div className="foot">
        <div className="wrap">
          <div className="row">
            <span style={{ color: 'var(--text-dim)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <HermesH size={22} color="#9aa2ac" /> Hermes Trade
            </span>
            <span>© 2026 · все права защищены</span>
          </div>
        </div>
      </div>
    </div>
  );
}
