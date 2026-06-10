/* hifi-web-auth.jsx — desktop Yandex ID login gate */

const YAW_RED = '#fc3f1d';

function WebYaGlyph({ size = 22 }) {
  return (
    <span style={{ width: size, height: size, borderRadius: '50%', background: YAW_RED, color: '#fff', display: 'inline-grid', placeItems: 'center', font: `700 ${Math.round(size * 0.62)}px/1 'Hanken Grotesk', sans-serif`, flex: 'none' }}>Я</span>
  );
}

function WebAuth({ onDone }) {
  const [step, setStep] = React.useState('welcome');

  return (
    <div className="web-auth-grid" style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1.1fr 0.9fr' }}>
      {/* left: brand hero with image */}
      <div className="web-auth-hero" style={{ position: 'relative', overflow: 'hidden', borderRight: '1px solid var(--line)' }}>
        <img src={photo('1503376780353-7e6692767b70', 1400)} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(12,13,16,.30), rgba(12,13,16,.82))' }}></div>
        <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '48px 52px' }}>
          <div className="eyebrow-w" style={{ color: 'var(--gold)' }}>аукцион автомобилей</div>
          <div style={{ font: '800 40px/1.05 var(--ui)', letterSpacing: '-0.03em', color: '#fff', marginTop: 16 }}>Покупайте авто<br/>на живых торгах</div>
          <div style={{ color: 'rgba(255,255,255,.82)', fontSize: 15, marginTop: 16, maxWidth: 440, lineHeight: 1.6 }}>
            Проверенные лоты, прозрачные ставки без депозита. Выиграли — менеджер свяжется и оформит сделку.
          </div>
          <div style={{ display: 'flex', gap: 18, marginTop: 28 }}>
            {[['без', 'депозита'], ['live', 'торги']].map(([a, b]) => (
              <div key={b}><div className="num" style={{ font: '700 22px/1 var(--num)', color: '#fff' }}>{a}</div><div style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', marginTop: 6 }}>{b}</div></div>
            ))}
          </div>
        </div>
      </div>

      {/* right: auth card */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          {step === 'welcome' ? (
            <React.Fragment>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <HermesLogo markSize={34} fontSize={19} color="var(--text)" accent="#9aa2ac" />
              </div>
              <h1 style={{ font: '800 28px/1.1 var(--ui)', letterSpacing: '-0.02em', margin: '18px 0 0' }}>Вход в аккаунт</h1>
              <p style={{ color: 'var(--text-dim)', fontSize: 14, marginTop: 12, lineHeight: 1.55 }}>Авторизуйтесь через Яндекс ID, чтобы делать ставки и следить за лотами.</p>
              <button className="wbtn" style={{ width: '100%', justifyContent: 'center', padding: '15px', marginTop: 26, background: YAW_RED, color: '#fff', fontWeight: 700, fontSize: 15 }} onClick={() => setStep('yandex')}>
                <WebYaGlyph size={20} /> Войти через Яндекс ID
              </button>
              <div style={{ textAlign: 'center', marginTop: 16, color: 'var(--text-faint)', fontSize: 12, lineHeight: 1.5 }}>
                Вход и регистрация через Яндекс ID.<br/>Нажимая, вы соглашаетесь с условиями сервиса.
              </div>
            </React.Fragment>
          ) : (
            <React.Fragment>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <WebYaGlyph size={28} />
                <span style={{ font: '700 19px/1 var(--ui)' }}>Яндекс <span style={{ color: 'var(--text-dim)', fontWeight: 500 }}>ID</span></span>
              </div>
              <div className="card" style={{ marginTop: 22, padding: 18, display: 'flex', alignItems: 'center', gap: 13 }}>
                <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'var(--surface-2)', border: '1px solid var(--line)', display: 'grid', placeItems: 'center', font: '700 17px/1 var(--num)', color: 'var(--accent)', flex: 'none' }}>А</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ font: '700 15px/1.2 var(--ui)' }}>Александр Соколов</div>
                  <div className="num" style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 5 }}>a.sokolov@yandex.ru</div>
                </div>
              </div>
              <div style={{ marginTop: 20, color: 'var(--text-dim)', fontSize: 13.5, lineHeight: 1.55 }}>
                Приложение <b style={{ color: 'var(--text)' }}>«Hermes Trade»</b> получит доступ к:
              </div>
              <div style={{ marginTop: 13, display: 'flex', flexDirection: 'column', gap: 11 }}>
                {['Имя и фамилия из профиля', 'Адрес электронной почты', 'Номер телефона для связи по сделке'].map(x => (
                  <div key={x} style={{ display: 'flex', gap: 11, alignItems: 'center', fontSize: 13.5, color: 'var(--text)' }}>
                    <span style={{ width: 17, height: 17, color: 'var(--ok)', flex: 'none' }}>{I.check}</span>{x}
                  </div>
                ))}
              </div>
              <button className="wbtn" style={{ width: '100%', justifyContent: 'center', padding: '15px', marginTop: 24, background: YAW_RED, color: '#fff', fontWeight: 700, fontSize: 15 }} onClick={onDone}>Разрешить и войти</button>
              <button className="wbtn ghost" style={{ width: '100%', justifyContent: 'center', marginTop: 10 }} onClick={() => setStep('welcome')}>Отмена</button>
            </React.Fragment>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { WebAuth, WebYaGlyph });
