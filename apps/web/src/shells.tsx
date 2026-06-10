import type { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMe } from './lib/queries';
import { I } from './components/icons';
import { HermesH, HermesLogo } from './components/brand';

/** Мобильная оболочка: контент + нижняя навигация из дизайна. */
export function MobileShell({ children, nav = true }: { children: ReactNode; nav?: boolean }) {
  const location = useLocation();
  const navigate = useNavigate();
  const items = [
    ['/', 'Лоты', I.catalog],
    ['/my-bids', 'Ставки', I.bids],
    ['/profile', 'Профиль', I.user],
  ] as const;
  const active = (path: string) =>
    path === '/' ? location.pathname === '/' || location.pathname === '/live' : location.pathname.startsWith(path);
  return (
    <div className="mshell">
      {children}
      {nav && (
        <div className="nav">
          {items.map(([path, label, icon]) => (
            <button key={path} className={`tab ${active(path) ? 'on' : ''}`} onClick={() => navigate(path)}>
              <span className="ic">{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Веб-оболочка: топбар (бренд, нав-ссылки, поиск, аватар) + футер. */
export function WebShell({ children, onSearch }: { children: ReactNode; onSearch?: (q: string) => void }) {
  const { data: me } = useMe();
  const location = useLocation();
  const navigate = useNavigate();
  const links = [
    ['/', 'Каталог'],
    ['/live', 'Живые торги'],
    ['/my-bids', 'Мои ставки'],
    ['/sell', 'Продать авто'],
  ] as const;
  return (
    <div className="web">
      <div className="topbar">
        <div className="wrap">
          <div className="row">
            <Link to="/" style={{ textDecoration: 'none', flex: 'none' }}>
              <HermesLogo markSize={30} fontSize={16} color="var(--text)" accent="#9aa2ac" />
            </Link>
            <nav className="nav-links">
              {links.map(([path, label]) => (
                <Link key={path} to={path} className={location.pathname === path ? 'on' : ''}>
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
