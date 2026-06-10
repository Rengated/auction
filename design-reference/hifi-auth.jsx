/* hifi-auth.jsx — registration / login via Yandex ID */

const YA_RED = '#fc3f1d';

function YandexGlyph({ size = 20 }) {
  return (
    <span style={{ width: size, height: size, borderRadius: '50%', background: YA_RED, color: '#fff', display: 'inline-grid', placeItems: 'center', font: `700 ${Math.round(size * 0.62)}px/1 'Hanken Grotesk', sans-serif`, flex: 'none' }}>Я</span>
  );
}

function AuthFlow({ onDone }) {
  const [step, setStep] = React.useState('welcome');

  if (step === 'welcome') {
    return (
      <div className="screen screen-enter">
        <StatusBar />
        <div className="body" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* hero image fills available space, text overlaid */}
          <div style={{ flex: 1, minHeight: 0, position: 'relative', margin: '8px 16px 0', borderRadius: 16, overflow: 'hidden' }}>
            <img src={photo('1503376780353-7e6692767b70', 1200)} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(12,13,16,.25) 0%, rgba(12,13,16,.55) 55%, rgba(12,13,16,.88) 100%)' }}></div>
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 22 }}>
              <div style={{ marginBottom: 4 }}>{window.HermesLogo ? <HermesLogo markSize={30} fontSize={17} color="#fff" accent="#dfe4e9" /> : null}</div>
              <div style={{ font: '800 27px/1.08 var(--ui)', letterSpacing: '-0.02em', color: '#fff', marginTop: 14 }}>Покупайте авто<br/>на живых торгах</div>
              <div style={{ display: 'flex', gap: 16, marginTop: 18 }}>
                {[['без', 'депозита'], ['live', 'торги']].map(([a, b]) => (
                  <div key={b}><div className="num" style={{ font: '700 18px/1 var(--num)', color: '#fff' }}>{a}</div><div style={{ fontSize: 10.5, color: 'rgba(255,255,255,.65)', marginTop: 5 }}>{b}</div></div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div style={{ flex: 'none', padding: '18px 22px calc(20px + env(safe-area-inset-bottom))' }}>
          <div style={{ font: '700 17px/1 var(--ui)', marginBottom: 10 }}>Вход в аккаунт</div>
          <button className="btn block" style={{ padding: '15px', background: YA_RED, color: '#fff', fontWeight: 700, whiteSpace: 'nowrap' }} onClick={() => setStep('yandex')}>
            <YandexGlyph size={20} /> Войти через Яндекс ID
          </button>
          <div style={{ textAlign: 'center', marginTop: 12, color: 'var(--text-faint)', fontSize: 11.5, lineHeight: 1.45 }}>
            Вход и регистрация через Яндекс ID.<br/>Нажимая, вы соглашаетесь с условиями сервиса.
          </div>
        </div>
      </div>
    );
  }

  // yandex consent (OAuth mock)
  return (
    <div className="screen screen-enter">
      <StatusBar />
      <div style={{ flex: 'none', padding: '4px 16px 0' }}>
        <button className="iconbtn" onClick={() => setStep('welcome')}>{I.back}</button>
      </div>
      <div className="body" style={{ padding: '14px 22px 0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <YandexGlyph size={28} />
          <span style={{ font: '700 19px/1 var(--ui)' }}>Яндекс <span style={{ color: 'var(--text-dim)', fontWeight: 500 }}>ID</span></span>
        </div>

        <div className="card" style={{ marginTop: 22, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--surface-2)', border: '1px solid var(--line)', display: 'grid', placeItems: 'center', font: '700 18px/1 var(--num)', color: 'var(--accent)' }}>А</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: '700 15px/1.2 var(--ui)' }}>Александр Соколов</div>
              <div className="num" style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 5 }}>a.sokolov@yandex.ru</div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 22, color: 'var(--text-dim)', fontSize: 13.5, lineHeight: 1.55 }}>
          Приложение <b style={{ color: 'var(--text)' }}>«Автоаукцион»</b> получит доступ к:
        </div>
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {['Имя и фамилия из профиля', 'Адрес электронной почты', 'Номер телефона для связи по сделке'].map(x => (
            <div key={x} style={{ display: 'flex', gap: 11, alignItems: 'center', fontSize: 13.5, color: 'var(--text)' }}>
              <span style={{ width: 17, height: 17, color: 'var(--ok)', flex: 'none' }}>{I.check}</span>{x}
            </div>
          ))}
        </div>
      </div>
      <div style={{ flex: 'none', padding: '12px 22px calc(20px + env(safe-area-inset-bottom))' }}>
        <button className="btn block" style={{ padding: '15px', background: YA_RED, color: '#fff', fontWeight: 700 }} onClick={onDone}>Разрешить и войти</button>
        <button className="btn block" style={{ background: 'transparent', marginTop: 10, color: 'var(--text-dim)' }} onClick={() => setStep('welcome')}>Отмена</button>
      </div>
    </div>
  );
}

Object.assign(window, { AuthFlow, YandexGlyph });
