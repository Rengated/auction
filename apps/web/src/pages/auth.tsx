/* Вход через Яндекс ID: мобильный welcome-экран (hifi-auth.jsx) и веб-сплит (hifi-web-auth.jsx). */
import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import type { MeDto } from '@hermes/shared';
import { logout, useMe } from '../lib/queries';
import { goYandex } from '../lib/auth';
import { useIsMobile } from '../lib/layout';
import { HermesLogo, YandexGlyph, YA_RED } from '../components/brand';

const HERO_IMG = '/auth-hero.jpg';

/** Чекбокс согласия с политикой/правилами — без него вход недоступен. */
function ConsentBlock({ agreed, onChange }: { agreed: boolean; onChange: (v: boolean) => void }) {
  const linkStyle = { color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 } as const;
  return (
    <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', margin: '4px 0 14px' }}>
      <input
        type="checkbox"
        checked={agreed}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: 18, height: 18, marginTop: 1, accentColor: 'var(--accent)', flex: 'none', cursor: 'pointer' }}
      />
      <span style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-dim)' }}>
        Я соглашаюсь с{' '}
        <Link to="/legal/privacy" style={linkStyle}>политикой конфиденциальности</Link>{' '}и{' '}
        <Link to="/legal/terms" style={linkStyle}>правилами сервиса</Link>
      </span>
    </label>
  );
}

/* Мобильный welcome-экран: hero-фото с градиентом, статы, кнопка Яндекса внизу. */
function MobileAuth() {
  const [agreed, setAgreed] = useState(false);
  return (
    <div className="mshell">
      <div className="screen screen-enter">
        <div className="body" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* hero занимает всё доступное место, текст поверх */}
          <div style={{ flex: 1, minHeight: 0, position: 'relative', margin: '16px 16px 0', borderRadius: 16, overflow: 'hidden' }}>
            <img src={HERO_IMG} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(12,13,16,.25) 0%, rgba(12,13,16,.55) 55%, rgba(12,13,16,.88) 100%)' }}></div>
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 22 }}>
              <div style={{ marginBottom: 4 }}><HermesLogo markSize={30} fontSize={17} color="#fff" accent="#dfe4e9" /></div>
              <div style={{ font: '800 27px/1.08 var(--ui)', letterSpacing: '-0.02em', color: '#fff', marginTop: 14 }}>Покупайте авто<br />на живых торгах</div>
              <div style={{ display: 'flex', gap: 16, marginTop: 18 }}>
                {([['без', 'депозита'], ['live', 'торги']] as const).map(([a, b]) => (
                  <div key={b}>
                    <div className="num" style={{ font: '700 18px/1 var(--num)', color: '#fff' }}>{a}</div>
                    <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,.65)', marginTop: 5 }}>{b}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div style={{ flex: 'none', padding: '16px 22px calc(20px + env(safe-area-inset-bottom))' }}>
          <div style={{ font: '700 17px/1 var(--ui)', marginBottom: 12 }}>Вход в аккаунт</div>
          <ConsentBlock agreed={agreed} onChange={setAgreed} />
          <button
            className="btn block"
            disabled={!agreed}
            style={{ padding: '15px', background: agreed ? YA_RED : 'var(--surface-2, var(--line))', color: agreed ? '#fff' : 'var(--text-faint)', fontWeight: 700, whiteSpace: 'nowrap', cursor: agreed ? 'pointer' : 'not-allowed' }}
            onClick={() => agreed && goYandex()}
          >
            <YandexGlyph size={20} /> Войти через Яндекс ID
          </button>
        </div>
      </div>
    </div>
  );
}

/* Веб-сплит: слева центрированная форма входа, справа hero с фото и цитатой. */
function WebAuth() {
  const [agreed, setAgreed] = useState(false);
  return (
    <div className="web-auth-grid viewfade">
      {/* левая колонка: форма */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <HermesLogo markSize={34} fontSize={19} color="var(--text)" accent="#9aa2ac" />
          </div>
          <h1 style={{ font: '800 28px/1.1 var(--ui)', letterSpacing: '-0.02em', margin: '18px 0 0' }}>Вход в аккаунт</h1>
          <p style={{ color: 'var(--text-dim)', fontSize: 14, marginTop: 12, lineHeight: 1.55 }}>
            Авторизуйтесь через Яндекс ID, чтобы делать ставки и следить за лотами.
          </p>
          <div style={{ marginTop: 22 }}>
            <ConsentBlock agreed={agreed} onChange={setAgreed} />
          </div>
          <button
            className="wbtn"
            disabled={!agreed}
            style={{ width: '100%', justifyContent: 'center', padding: '15px', background: agreed ? YA_RED : 'var(--surface-2, var(--line))', color: agreed ? '#fff' : 'var(--text-faint)', fontWeight: 700, fontSize: 15, cursor: agreed ? 'pointer' : 'not-allowed' }}
            onClick={() => agreed && goYandex()}
          >
            <YandexGlyph size={20} /> Войти через Яндекс ID
          </button>
        </div>
      </div>

      {/* правая колонка: бренд-hero с фото */}
      <div className="web-auth-hero" style={{ position: 'relative', overflow: 'hidden', borderLeft: '1px solid var(--line)' }}>
        <img src={HERO_IMG} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(12,13,16,.30), rgba(12,13,16,.82))' }}></div>
        <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '48px 52px' }}>
          <div className="eyebrow-w" style={{ color: '#d9b06a' }}>аукцион автомобилей</div>
          <div style={{ font: '800 40px/1.05 var(--ui)', letterSpacing: '-0.03em', color: '#fff', marginTop: 16 }}>Покупайте авто<br />на живых торгах</div>
          <div style={{ color: 'rgba(255,255,255,.82)', fontSize: 15, marginTop: 16, maxWidth: 440, lineHeight: 1.6 }}>
            Проверенные лоты, прозрачные ставки без депозита. Выиграли — менеджер свяжется и оформит сделку.
          </div>
          <div style={{ display: 'flex', gap: 18, marginTop: 28 }}>
            {([['без', 'депозита'], ['live', 'торги']] as const).map(([a, b]) => (
              <div key={b}>
                <div className="num" style={{ font: '700 22px/1 var(--num)', color: '#fff' }}>{a}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', marginTop: 6 }}>{b}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** «дд.мм.гггг чч:мм» для срока блокировки. */
const blockedUntilLabel = (iso: string): string => {
  const d = new Date(iso);
  if (d.getFullYear() >= 9999) return 'бессрочно';
  const p = (x: number) => String(x).padStart(2, '0');
  return `до ${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

/** Полноэкранная заглушка для заблокированного пользователя (вместо приложения). */
export function BlockedScreen({ me }: { me: MeDto }) {
  return (
    <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', background: 'var(--bg)', padding: 24 }}>
      <div className="card" style={{ maxWidth: 420, width: '100%', padding: '34px 30px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
          <HermesLogo markSize={34} fontSize={18} color="var(--text)" accent="#9aa2ac" />
        </div>
        <h1 style={{ font: '800 24px/1.15 var(--ui)', letterSpacing: '-0.02em', margin: 0 }}>Вы заблокированы</h1>
        <p style={{ color: 'var(--text-dim)', fontSize: 14, lineHeight: 1.55, margin: '14px 0 0' }}>
          Доступ к Auction Germes ограничен
        </p>
        {me.blockReason && (
          <p style={{ color: 'var(--text-dim)', fontSize: 13.5, lineHeight: 1.5, margin: '10px 0 0' }}>
            Причина: {me.blockReason}
          </p>
        )}
        {me.blockedUntil && (
          <div className="num" style={{ fontSize: 13, color: 'var(--text-faint)', marginTop: 12 }}>
            {blockedUntilLabel(me.blockedUntil)}
          </div>
        )}
        <button
          className="btn block"
          style={{ marginTop: 24, background: 'transparent', border: '1px solid var(--line)', color: 'var(--text-dim)' }}
          onClick={() => void logout()}
        >
          Выйти
        </button>
      </div>
    </div>
  );
}

export function AuthPage() {
  const { data: me } = useMe();
  const isMobile = useIsMobile();

  // Уже авторизован — в каталог
  if (me) return <Navigate to="/" replace />;

  return isMobile ? <MobileAuth /> : <WebAuth />;
}
