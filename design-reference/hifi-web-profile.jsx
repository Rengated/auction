/* hifi-web-profile.jsx — desktop profile (sidebar + content) */

function WebProfile({ onBack, onLogout }) {
  const [sec, setSec] = React.useState('personal');
  const menu = [
    ['personal', 'Личные данные', I.user],
    ['notif', 'Уведомления', I.bids],
    ['won', 'Выигранные лоты', I.check],
    ['manager', 'Связь с менеджером', I.shield],
  ];
  return (
    <div className="wrap viewfade">
      <div style={{ padding: '22px 0 0' }}>
        <button className="wbtn ghost" onClick={onBack}><span style={{ width: 16, height: 16 }}>{I.back}</span> К каталогу</button>
      </div>
      <div className="page-head" style={{ paddingBottom: 26 }}>
        <div>
          <div className="eyebrow-w">аккаунт</div>
          <h1>Профиль</h1>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 28, alignItems: 'start', paddingBottom: 64 }}>
        {/* sidebar */}
        <div style={{ position: 'sticky', top: 90 }}>
          <div className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--surface-2)', border: '1px solid var(--line)', display: 'grid', placeItems: 'center', font: '700 20px/1 var(--num)', color: 'var(--accent)', flex: 'none' }}>А</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ font: '700 16px/1 var(--ui)' }}>Александр</div>
              <div className="num" style={{ fontSize: 11.5, color: 'var(--ok)', marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 12, height: 12 }}>{I.check}</span> верифицирован</div>
            </div>
          </div>
          <div className="card" style={{ padding: 6 }}>
            {menu.map(([k, l, ic]) => (
              <button key={k} onClick={() => setSec(k)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 11, padding: '12px 13px', border: 0, borderRadius: 9, cursor: 'pointer', textAlign: 'left',
                  background: sec === k ? 'color-mix(in srgb, var(--accent) 13%, transparent)' : 'transparent',
                  color: sec === k ? 'var(--accent)' : 'var(--text)', font: '600 14px/1 var(--ui)' }}>
                <span style={{ width: 18, height: 18, flex: 'none' }}>{ic}</span>{l}
              </button>
            ))}
          </div>
          <button className="wbtn" onClick={onLogout} style={{ width: '100%', justifyContent: 'center', marginTop: 14, background: 'transparent', border: '1px solid var(--line)', color: 'var(--text-dim)' }}>Выйти из аккаунта</button>
        </div>

        {/* content */}
        <div>
          {sec === 'personal' && <ProfilePersonal />}
          {sec === 'notif' && <ProfileNotif />}
          {sec === 'won' && <ProfileWon />}
          {sec === 'manager' && <ProfileManager />}
        </div>
      </div>
    </div>
  );
}

function PanelHead({ title, sub }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <h2 style={{ font: '800 22px/1 var(--ui)', letterSpacing: '-0.02em', margin: 0 }}>{title}</h2>
      {sub && <div className="num" style={{ fontSize: 13, color: 'var(--text-faint)', marginTop: 8 }}>{sub}</div>}
    </div>
  );
}

function ProfilePersonal() {
  const filled = (() => { try { return localStorage.getItem('cc_contacts') === '1'; } catch (e) { return false; } })();
  const rows = [
    ['Имя', filled ? 'Александр Соколов' : '— не указано', filled],
    ['Телефон', '+7 900 000-00-00', true],
    ['Email', filled ? 'a.sokolov@mail.ru' : '— не указано', filled],
    ['Город', filled ? 'Москва' : '— не указано', filled],
  ];
  const save = () => { try { localStorage.setItem('cc_contacts', '1'); } catch (e) {} location.reload(); };
  return (
    <div>
      <PanelHead title="Личные данные" sub="Нужны для участия в торгах и связи менеджера после победы" />
      {!filled && (
        <div className="card" style={{ padding: '14px 18px', maxWidth: 560, marginBottom: 14, display: 'flex', gap: 11, alignItems: 'flex-start', borderColor: 'color-mix(in srgb, var(--accent) 38%, var(--line))' }}>
          <span style={{ width: 18, height: 18, color: 'var(--accent)', flex: 'none', marginTop: 1 }}>{I.shield}</span>
          <span style={{ fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.5 }}>Заполните контактные данные, чтобы делать ставки. Их увидит только менеджер для связи по сделке.</span>
        </div>
      )}
      <div className="card" style={{ padding: '4px 20px', maxWidth: 560 }}>
        {rows.map(([k, v, ok]) => (
          <div key={k} className="spec-row"><span className="k">{k}</span><span className="v num" style={{ whiteSpace: 'nowrap', color: ok ? 'var(--text)' : 'var(--text-faint)' }}>{v}</span></div>
        ))}
      </div>
      <button className="wbtn accent" style={{ marginTop: 16 }} onClick={save}>{filled ? 'Сохранить' : 'Заполнить и сохранить'}</button>
    </div>
  );
}

function ProfileNotif() {
  const items = [
    ['Вашу ставку перебили', 'BMW X3 xDrive30i · теперь 3 160 000 ₽', '5 мин', 'var(--live)'],
    ['Лот скоро закроется', 'Lexus RX 350 · осталось 2 минуты', '12 мин', 'var(--live)'],
    ['Торги завершены', 'Toyota Camry · резерв не достигнут', '1 ч', 'var(--text-faint)'],
    ['Старт торгов', 'Audi A6 quattro · сегодня в 18:00', '2 ч', 'var(--accent)'],
    ['Вы выиграли лот', 'Porsche 911 · менеджер свяжется', 'вчера', 'var(--ok)'],
  ];
  return (
    <div>
      <PanelHead title="Уведомления" sub="События по вашим ставкам и лотам" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 640 }}>
        {items.map((it, i) => (
          <div key={i} className="card" style={{ padding: '15px 18px', display: 'flex', gap: 13, alignItems: 'flex-start' }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: it[3], marginTop: 5, flex: 'none' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 600 }}>{it[0]}</div>
              <div className="num" style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 5 }}>{it[1]}</div>
            </div>
            <span className="num" style={{ fontSize: 11.5, color: 'var(--text-faint)', flex: 'none' }}>{it[2]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfileWon() {
  const won = [['Porsche 911 Carrera', 6250000, 'Договор готов', 'var(--ok)'], ['Kia K5 GT-Line', 2150000, 'Сделка закрыта', 'var(--text-faint)']];
  return (
    <div>
      <PanelHead title="Выигранные лоты" sub="Документы и статусы сделок" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 640 }}>
        {won.map((w, i) => (
          <div key={i} className="card" style={{ padding: 14, display: 'flex', gap: 15, alignItems: 'center' }}>
            <Photo h={70} glyph={w[0][0]} style={{ width: 100, flex: 'none', borderRadius: 9 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{w[0]}</div>
              <div className="num" style={{ fontSize: 14, color: 'var(--text-dim)', marginTop: 5 }}>{rub(w[1])}</div>
              <div className="num" style={{ fontSize: 12, marginTop: 7, color: w[3], fontWeight: 600 }}>{w[2]}</div>
            </div>
            <button className="wbtn ghost" style={{ padding: '10px 14px' }}>Документы</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfileManager() {
  return (
    <div>
      <PanelHead title="Связь с менеджером" sub="Сопровождение сделки после победы" />
      <div style={{ maxWidth: 560 }}>
        <div className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 15 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--surface-2)', border: '1px solid var(--line)', display: 'grid', placeItems: 'center', font: '700 20px/1 var(--num)', color: 'var(--accent)', flex: 'none' }}>М</div>
          <div>
            <div style={{ font: '700 17px/1.2 var(--ui)' }}>Михаил, ваш менеджер</div>
            <div className="num" style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 6 }}>на связи 9:00–21:00 МСК</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 14 }}>
          <a href="tel:+74950000000" className="wbtn" style={{ textDecoration: 'none', justifyContent: 'space-between', background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--text)' }}><span>☎ Позвонить</span><span className="num" style={{ color: 'var(--text-dim)' }}>+7 495 000-00-00</span></a>
          <a href="https://t.me/hermes_trade" className="wbtn" style={{ textDecoration: 'none', justifyContent: 'space-between', background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--text)' }}><span>Telegram</span><span className="num" style={{ color: 'var(--text-dim)' }}>@hermes_trade</span></a>
          <a href="https://wa.me/79162401108" className="wbtn" style={{ textDecoration: 'none', justifyContent: 'space-between', background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--text)' }}><span>WhatsApp</span><span className="num" style={{ color: 'var(--text-dim)' }}>+7 916 240-11-08</span></a>
          <a href="#" className="wbtn" style={{ textDecoration: 'none', justifyContent: 'space-between', background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--text)' }}><span>MAX</span><span className="num" style={{ color: 'var(--text-dim)' }}>@hermes_trade</span></a>
          <a href="mailto:m.gurov@hermes-trade.ru" className="wbtn" style={{ textDecoration: 'none', justifyContent: 'space-between', background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--text)' }}><span>✉ Почта</span><span className="num" style={{ color: 'var(--text-dim)' }}>m.gurov@hermes-trade.ru</span></a>
        </div>
        <div className="card" style={{ marginTop: 16, padding: '16px 18px' }}>
          <div className="eyebrow-w" style={{ marginBottom: 12 }}>чем помогает</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {['Оформление сделки и комиссии после победы', 'Осмотр и проверка автомобиля', 'Доставка в ваш город', 'Вопросы по лотам и ставкам'].map(x => (
              <div key={x} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 13.5, color: 'var(--text-dim)' }}>
                <span style={{ width: 15, height: 15, color: 'var(--ok)', flex: 'none' }}>{I.check}</span>{x}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { WebProfile });
