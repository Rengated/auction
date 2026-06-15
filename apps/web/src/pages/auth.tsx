/* Вход через Яндекс ID: мобильный welcome-экран (hifi-auth.jsx) и веб-сплит (hifi-web-auth.jsx). */
import { Navigate } from 'react-router-dom';
import type { MeDto } from '@hermes/shared';
import { logout, useMe } from '../lib/queries';
import { goYandex } from '../lib/auth';
import { useIsMobile } from '../lib/layout';
import { HermesLogo, YandexGlyph, YA_RED } from '../components/brand';

const HERO_IMG = 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200&q=75&auto=format&fit=crop';

/* Мобильный welcome-экран: hero-фото с градиентом, статы, кнопка Яндекса внизу. */
function MobileAuth() {
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
        <div style={{ flex: 'none', padding: '18px 22px calc(20px + env(safe-area-inset-bottom))' }}>
          <div style={{ font: '700 17px/1 var(--ui)', marginBottom: 10 }}>Вход в аккаунт</div>
          <button className="btn block" style={{ padding: '15px', background: YA_RED, color: '#fff', fontWeight: 700, whiteSpace: 'nowrap' }} onClick={goYandex}>
            <YandexGlyph size={20} /> Войти через Яндекс ID
          </button>
          <div style={{ textAlign: 'center', marginTop: 12, color: 'var(--text-faint)', fontSize: 11.5, lineHeight: 1.45 }}>
            Вход и регистрация через Яндекс ID.<br />Нажимая, вы соглашаетесь с условиями сервиса.
          </div>
        </div>
      </div>
    </div>
  );
}

/* Веб-сплит: слева центрированная форма входа, справа hero с фото и цитатой. */
function WebAuth() {
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
          <button className="wbtn" style={{ width: '100%', justifyContent: 'center', padding: '15px', marginTop: 26, background: YA_RED, color: '#fff', fontWeight: 700, fontSize: 15 }} onClick={goYandex}>
            <YandexGlyph size={20} /> Войти через Яндекс ID
          </button>
          <div style={{ textAlign: 'center', marginTop: 16, color: 'var(--text-faint)', fontSize: 12, lineHeight: 1.5 }}>
            Вход и регистрация через Яндекс ID.<br />Нажимая, вы соглашаетесь с условиями сервиса.
          </div>
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
          Доступ к Hermes Trade ограничен
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
