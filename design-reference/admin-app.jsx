/* admin-app.jsx — shell, dashboard, lots table, deals */

const AI = {
  dash: <svg viewBox="0 0 24 24"><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="5" rx="2"/><rect x="13" y="11" width="8" height="10" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/></svg>,
  lots: <svg viewBox="0 0 24 24"><path d="M3 7l9-4 9 4-9 4-9-4Z"/><path d="M3 7v6l9 4 9-4V7"/><path d="M12 11v10"/></svg>,
  gavel: <svg viewBox="0 0 24 24"><path d="m14 6 4 4M9 11l4 4"/><path d="M3 21h8"/><path d="m6.5 13.5 4 4M12 8l5-5 4 4-5 5"/></svg>,
  deals: <svg viewBox="0 0 24 24"><path d="M4 7h16v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7Z"/><path d="M4 7l2-3h12l2 3"/><path d="m9 13 2 2 4-4"/></svg>,
  gear: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/></svg>,
  plus: <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>,
  back: <svg viewBox="0 0 24 24"><path d="M15 5 8 12l7 7"/></svg>,
  edit: <svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="M14 6l4 4"/></svg>,
  eye: <svg viewBox="0 0 24 24"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>,
  trash: <svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>,
  camera: <svg viewBox="0 0 24 24"><path d="M4 8h3l1.5-2.5h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13" r="3.2"/></svg>,
  stop: <svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>,
  plusclock: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 2"/></svg>,
  relist: <svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v5h-5"/></svg>,
  users: <svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.4"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 4.5a3.4 3.4 0 0 1 0 7M18 20c0-3.3-1-5-2.5-6"/></svg>,
  phone: <svg viewBox="0 0 24 24"><path d="M5 4h4l2 5-3 2a12 12 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/></svg>,
  mail: <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>,
  msg: <svg viewBox="0 0 24 24"><path d="M21 12a8 8 0 0 1-8 8H7l-4 3v-7a8 8 0 0 1 5-11 8 8 0 0 1 13 7Z"/></svg>,
  ban: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="m6 6 12 12"/></svg>,
  pin: <svg viewBox="0 0 24 24"><path d="M12 21s-7-5.7-7-11a7 7 0 0 1 14 0c0 5.3-7 11-7 11Z"/><circle cx="12" cy="10" r="2.5"/></svg>,
  doc: <svg viewBox="0 0 24 24"><path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M14 3v4h4M8 13h8M8 17h5"/></svg>,
  check: <svg viewBox="0 0 24 24"><path d="m4 12 5 5L20 6"/></svg>,
  bolt: <svg viewBox="0 0 24 24"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/></svg>,
  truck: <svg viewBox="0 0 24 24"><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/></svg>,
};

// shared deals data
const DEALS = [
  { id: 1, car: 'Porsche 911 Carrera', lotNo: 5, amt: 6250000, status: 'contract', who: 'Александр Соколов', phone: '+7 916 240-11-08', email: 'a.sokolov@mail.ru', city: 'Москва', won: 'вчера, 19:00', img: 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=900&q=75&auto=format&fit=crop' },
  { id: 2, car: 'Mercedes-Benz E 300', lotNo: 1, amt: 3820000, status: 'pending', who: 'Игорь Петров', phone: '+7 903 555-72-19', email: 'igor.p@gmail.com', city: 'Казань', won: 'сегодня, 13:40', img: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=900&q=75&auto=format&fit=crop' },
  { id: 3, car: 'Kia K5 GT-Line', lotNo: 7, amt: 2150000, status: 'closed', who: 'Дмитрий Орлов', phone: '+7 911 002-44-31', email: 'd.orlov@yandex.ru', city: 'Самара', won: '2 июня, 18:00', img: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=900&q=75&auto=format&fit=crop' },
];
const DEAL_STATUS = { pending: ['Ждёт менеджера', 'up'], contract: ['Оформление договора', 'live'], closed: ['Сделка закрыта', 'sold'] };

// shared users data
const USERS = [
  { id: 1, name: 'Александр Соколов', phone: '+7 916 240-11-08', email: 'a.sokolov@mail.ru', city: 'Москва', role: 'buyer', verified: true, bids: 41, wins: 2, joined: '12.03.2026', block: null },
  { id: 2, name: 'Игорь Петров', phone: '+7 903 555-72-19', email: 'igor.p@gmail.com', city: 'Казань', role: 'buyer', verified: true, bids: 27, wins: 1, joined: '04.04.2026', block: null },
  { id: 3, name: 'Дмитрий Орлов', phone: '+7 911 002-44-31', email: 'd.orlov@yandex.ru', city: 'Самара', role: 'buyer', verified: false, bids: 8, wins: 1, joined: '20.05.2026', block: { until: '20.07.2026', reason: 'Неоплата выигранного лота' } },
  { id: 4, name: 'Михаил Гуров', phone: '+7 495 000-00-00', email: 'm.gurov@auction.ru', city: 'Москва', role: 'manager', verified: true, bids: 0, wins: 0, joined: '01.01.2026', block: null },
  { id: 5, name: 'Елена Волкова', phone: '+7 922 717-30-55', email: 'e.volkova@mail.ru', city: 'Екатеринбург', role: 'buyer', verified: true, bids: 14, wins: 0, joined: '28.04.2026', block: { until: null, reason: 'Накрутка ставок' } },
];
const ROLE_LABEL = { buyer: 'Покупатель', manager: 'Менеджер', admin: 'Админ' };
function blockLabel(b) { return !b ? null : (b.until ? `до ${b.until}` : 'навсегда'); }

const SB = { live: 'В ЭФИРЕ', ending: 'В ЭФИРЕ', upcoming: 'ОЖИДАЕТ', sold: 'ПРОДАН', finished: 'НЕ ВЗЯТ РЕЗЕРВ', withdrawn: 'СНЯТ' };
const SBC = { live: 'live', ending: 'live', upcoming: 'up', sold: 'sold', finished: 'fin', withdrawn: 'fin' };

function StatusBadge({ s }) {
  return <span className={`sb ${SBC[s]}`}>{(SBC[s] === 'live') && <span className="dot"></span>}{SB[s]}</span>;
}

function Sidebar({ page, setPage }) {
  const liveN = LOTS.filter(l => STATUS[l.status].group === 'live').length;
  const items = [
    ['dash', 'Дашборд', AI.dash, null],
    ['lots', 'Лоты', AI.lots, LOTS.length],
    ['auctions', 'Торги', AI.gavel, liveN],
    ['deals', 'Сделки', AI.deals, null],
    ['users', 'Пользователи', AI.users, null],
    ['settings', 'Параметры', AI.gear, null],
  ];
  return (
    <div className="side">
      <div className="logo">
        <HermesH size={34} color="#c0a98a" />
        <div><div className="nm">Hermes Trade</div><div className="sub">админ-панель</div></div>
      </div>
      <div className="side-sec">Управление</div>
      {items.map(([k, l, ic, badge]) => (
        <button key={k} className={`navbtn ${page === k ? 'on' : ''}`} onClick={() => setPage(k)}>
          <span className="ic">{ic}</span>{l}
          {badge ? <span className="badge" style={k === 'auctions' ? {} : { background: 'var(--panel3)', color: 'var(--dim)' }}>{badge}</span> : null}
        </button>
      ))}
      <div className="side-foot">
        <div className="av">М</div>
        <div><div className="who">Михаил</div><div className="role">менеджер торгов</div></div>
      </div>
    </div>
  );
}

function Dashboard({ onAdd, openLot, openDeal }) {
  const live = LOTS.filter(l => STATUS[l.status].group === 'live');
  const up = LOTS.filter(l => l.status === 'upcoming');
  const totalBids = LOTS.reduce((s, l) => s + l.bids, 0);
  const sold = LOTS.filter(l => l.status === 'sold');
  const commission = sold.reduce((s, l) => s + Math.round(l.bid * 0.015), 0);
  const week = [42, 58, 35, 71, 64, 88, totalBids];
  const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const wmax = Math.max(...week);
  const activity = [
    ['Новая ставка', 'Lexus RX 350 · 4 180 000 ₽', 'сейчас', 'var(--live)'],
    ['Лот продан', 'Porsche 911 · 6 250 000 ₽', '14 мин', 'var(--ok)'],
    ['Новый пользователь', 'Елена Волкова · Екатеринбург', '32 мин', 'var(--accent)'],
    ['Резерв достигнут', 'Mercedes E 300', '1 ч', 'var(--gold)'],
    ['Старт торгов', 'BMW X3 xDrive30i', '2 ч', 'var(--dim)'],
  ];
  return (
    <div className="content fade">
      <div className="stats">
        <div className="stat"><div className="l">В эфире сейчас</div><div className="v" style={{ color: 'var(--live)' }}>{live.length}</div><div className="d live">● идут торги</div></div>
        <div className="stat"><div className="l">Стартуют сегодня</div><div className="v">{up.length}</div><div className="d">ожидают запуска</div></div>
        <div className="stat"><div className="l">Ставок за день</div><div className="v">{totalBids}</div><div className="d up">↑ активность высокая</div></div>
        <div className="stat"><div className="l">Комиссия (продано)</div><div className="v">{fmt(commission)} ₽</div><div className="d">1.5% · {sold.length} сделок</div></div>
      </div>

      <div className="section-gap"></div>

      {/* week chart + schedule */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20, alignItems: 'stretch' }}>
        <div className="pcard">
          <div className="ph"><div><h3>Активность за неделю</h3><div className="sub">ставок в день</div></div><span className="num" style={{ fontSize: 12, color: 'var(--ok)', fontWeight: 600 }}>↑ 23% к прошлой</span></div>
          <div style={{ padding: '24px 20px', display: 'flex', alignItems: 'flex-end', gap: 14, height: 180 }}>
            {week.map((n, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, height: '100%', justifyContent: 'flex-end' }}>
                <span className="num" style={{ fontSize: 11, color: 'var(--dim)', fontWeight: 600 }}>{n}</span>
                <div style={{ width: '100%', height: `${(n / wmax) * 100}%`, background: i === week.length - 1 ? 'var(--accent)' : 'var(--accent-soft)', borderRadius: '6px 6px 0 0', minHeight: 4 }}></div>
                <span className="num" style={{ fontSize: 10.5, color: 'var(--faint)' }}>{days[i]}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="pcard">
          <div className="ph"><div><h3>Расписание стартов</h3><div className="sub">ближайшие торги</div></div></div>
          <div style={{ padding: '8px 20px 14px' }}>
            {up.concat(live.slice(0, 2)).map((l, i) => (
              <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: i < up.length + 1 ? '1px solid var(--line)' : 0 }}>
                <span className="num" style={{ width: 52, fontSize: 13, fontWeight: 700, color: l.status === 'upcoming' ? 'var(--gold)' : 'var(--live)', flex: 'none' }}>{l.startLabel.split(', ')[1] || '—'}</span>
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ font: '600 13px/1.2 var(--ui)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.make} {l.model}</div><div className="num" style={{ fontSize: 11, color: 'var(--faint)', marginTop: 4 }}>старт {fmt(l.reserve - 300000)} ₽</div></div>
                <StatusBadge s={l.status} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="section-gap"></div>

      {/* live table + activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 20, alignItems: 'start' }}>
        <div className="pcard">
          <div className="ph">
            <div><h3>Идут прямо сейчас</h3><div className="sub">требуют контроля</div></div>
            <button className="btn acc sm" onClick={onAdd}><span style={{ width: 16, height: 16 }}>{AI.plus}</span> Добавить лот</button>
          </div>
          <table className="tb">
            <thead><tr><th>Лот</th><th>Ставка</th><th>Ставок</th><th>До конца</th><th></th></tr></thead>
            <tbody>
              {live.map(l => (
                <tr className="row" key={l.id}>
                  <td><div className="lotcell"><div className="ph-img"><img src={l.img} alt="" /></div><div><div className="nm">{l.make} {l.model}</div><div className="meta">#{String(l.id).padStart(3, '0')}</div></div></div></td>
                  <td className="num" style={{ fontWeight: 600 }}>{fmt(l.bid)} ₽</td>
                  <td className="num">{l.bids}</td>
                  <td className="num" style={{ color: 'var(--live)' }}>{fmtTime(Math.max(0, l.endsIn - 40))}</td>
                  <td><div className="row-actions"><button className="btn sm" onClick={() => openLot(l)}>Торг</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pcard">
          <div className="ph"><div><h3>Лента событий</h3><div className="sub">в реальном времени</div></div></div>
          <div style={{ padding: '6px 20px 14px' }}>
            {activity.map((a, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: i < activity.length - 1 ? '1px solid var(--line)' : 0 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: a[3], marginTop: 5, flex: 'none' }}></span>
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ font: '600 13px/1.2 var(--ui)' }}>{a[0]}</div><div className="num" style={{ fontSize: 11.5, color: 'var(--dim)', marginTop: 4 }}>{a[1]}</div></div>
                <span className="num" style={{ fontSize: 11, color: 'var(--faint)', flex: 'none' }}>{a[2]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LotsTable({ onAdd, onEdit, openLot, onRelist }) {
  const [f, setF] = React.useState('all');
  const tabs = [['all', 'Все'], ['live', 'В эфире'], ['soon', 'Ожидают'], ['done', 'Завершены'], ['draft', 'Черновики']];
  const list = LOTS.filter(l => f === 'all' ? true : f === 'draft' ? !l.published : STATUS[l.status].group === f);
  return (
    <div className="content fade">
      <div className="pcard">
        <div className="ph">
          <div style={{ display: 'flex', gap: 7 }}>
            {tabs.map(([k, l]) => (
              <button key={k} className="btn sm" onClick={() => setF(k)} style={f === k ? { background: 'var(--accent-soft)', color: 'var(--accent)' } : { background: 'transparent', border: '1px solid var(--line2)' }}>{l}{k === 'draft' && LOTS.filter(x => !x.published).length ? ` · ${LOTS.filter(x => !x.published).length}` : ''}</button>
            ))}
          </div>
          <button className="btn acc sm" onClick={onAdd}><span style={{ width: 16, height: 16 }}>{AI.plus}</span> Добавить лот</button>
        </div>
        <table className="tb">
          <thead><tr><th>Лот</th><th>Публикация</th><th>Статус</th><th>Стартовая</th><th>Текущая</th><th>Резерв</th><th></th></tr></thead>
          <tbody>
            {list.map(l => (
              <tr className="row" key={l.id} style={!l.published ? { background: 'color-mix(in srgb, var(--gold) 7%, transparent)' } : null}>
                <td><div className="lotcell"><div className="ph-img"><img src={l.img} alt="" /></div><div><div className="nm">{l.make} {l.model}</div><div className="meta">#{String(l.id).padStart(3, '0')} · {fmt(l.mileage)} км</div></div></div></td>
                <td>{l.published
                  ? <span className="sb sold"><span className="dot"></span> опубликован</span>
                  : <span className="sb" style={{ background: 'var(--gold-soft)', color: 'var(--gold)' }}>черновик</span>}</td>
                <td><StatusBadge s={l.status} /></td>
                <td className="num" style={{ color: 'var(--dim)' }}>{fmt(l.start_price || l.reserve - 200000)} ₽</td>
                <td className="num" style={{ fontWeight: 600 }}>{fmt(l.bid)} ₽</td>
                <td className="num">{fmt(l.reserve)} ₽</td>
                <td><div className="row-actions">
                  {STATUS[l.status].group === 'live' && <button className="iconbtn2" title="Контроль торга" onClick={() => openLot(l)}>{AI.gavel}</button>}
                  {(l.status === 'finished' || l.status === 'withdrawn') && <button className="iconbtn2" title="Перевыставить лот" onClick={() => onRelist(l)} style={{ color: 'var(--accent)', borderColor: 'color-mix(in srgb, var(--accent) 40%, var(--line2))' }}>{AI.relist}</button>}
                  <button className="iconbtn2" title="Редактировать" onClick={() => onEdit(l)}>{AI.edit}</button>
                  <button className="iconbtn2" title="Снять">{AI.trash}</button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Deals({ onOpen }) {
  return (
    <div className="content fade">
      <div className="pcard">
        <div className="ph"><div><h3>Сделки после победы</h3><div className="sub">сопровождение выигранных лотов · контакты победителя</div></div></div>
        <table className="tb">
          <thead><tr><th>Автомобиль</th><th>Победитель</th><th>Цена</th><th>Комиссия 1.5%</th><th>К оплате</th><th>Статус</th><th></th></tr></thead>
          <tbody>
            {DEALS.map((d) => {
              const fee = Math.round(d.amt * 0.015);
              return (
                <tr className="row" key={d.id}>
                  <td><div className="lotcell"><div className="ph-img"><img src={d.img} alt="" /></div><div><div className="nm">{d.car}</div><div className="meta">лот #{String(d.lotNo).padStart(3, '0')}</div></div></div></td>
                  <td><div style={{ fontWeight: 600 }}>{d.who}</div><div className="num" style={{ fontSize: 11.5, color: 'var(--faint)', marginTop: 4 }}>{d.phone}</div></td>
                  <td className="num" style={{ fontWeight: 600 }}>{fmt(d.amt)} ₽</td>
                  <td className="num" style={{ color: 'var(--gold)' }}>{fmt(fee)} ₽</td>
                  <td className="num" style={{ fontWeight: 600 }}>{fmt(d.amt + fee)} ₽</td>
                  <td><span className={`sb ${DEAL_STATUS[d.status][1]}`}>{DEAL_STATUS[d.status][0]}</span></td>
                  <td><div className="row-actions"><button className="btn sm" onClick={() => onOpen(d)}>Открыть</button></div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UsersTable({ onAdd, onOpen }) {
  const [f, setF] = React.useState('all');
  const tabs = [['all', 'Все'], ['buyer', 'Покупатели'], ['manager', 'Команда'], ['blocked', 'Заблокированные']];
  const list = USERS.filter(u => f === 'all' ? true : f === 'blocked' ? !!u.block : f === 'manager' ? (u.role !== 'buyer') : u.role === 'buyer');
  return (
    <div className="content fade">
      <div className="pcard">
        <div className="ph">
          <div style={{ display: 'flex', gap: 7 }}>
            {tabs.map(([k, l]) => {
              const n = k === 'blocked' ? USERS.filter(u => u.block).length : 0;
              return <button key={k} className="btn sm" onClick={() => setF(k)} style={f === k ? { background: 'var(--accent-soft)', color: 'var(--accent)' } : { background: 'transparent', border: '1px solid var(--line2)' }}>{l}{k === 'blocked' && n ? ` · ${n}` : ''}</button>;
            })}
          </div>
          <button className="btn acc sm" onClick={onAdd}><span style={{ width: 16, height: 16 }}>{AI.plus}</span> Добавить пользователя</button>
        </div>
        <table className="tb">
          <thead><tr><th>Пользователь</th><th>Телефон</th><th>Город</th><th>Роль</th><th>Статус</th><th>Ставок / побед</th><th></th></tr></thead>
          <tbody>
            {list.map(u => (
              <tr className="row" key={u.id} style={u.block ? { background: 'color-mix(in srgb, var(--live) 5%, transparent)' } : null}>
                <td><div className="lotcell"><div style={{ width: 36, height: 36, borderRadius: '50%', background: u.block ? 'var(--live-soft)' : 'var(--panel3)', display: 'grid', placeItems: 'center', font: '700 14px/1 var(--num)', color: u.block ? 'var(--live)' : 'var(--accent)', flex: 'none' }}>{u.name[0]}</div><div><div className="nm">{u.name}</div><div className="meta">{u.email}</div></div></div></td>
                <td className="num" style={{ color: 'var(--dim)' }}>{u.phone}</td>
                <td style={{ color: 'var(--dim)' }}>{u.city}</td>
                <td><span className="sb" style={{ background: u.role === 'buyer' ? 'var(--panel3)' : 'var(--accent-soft)', color: u.role === 'buyer' ? 'var(--dim)' : 'var(--accent)' }}>{ROLE_LABEL[u.role]}</span></td>
                <td>{u.block
                  ? <span className="sb" style={{ background: 'var(--live-soft)', color: 'var(--live)' }}><span style={{ width: 12, height: 12 }}>{AI.ban}</span> {blockLabel(u.block)}</span>
                  : (u.verified ? <span className="sb sold">✓ вериф.</span> : <span className="sb fin">не пройдена</span>)}</td>
                <td className="num">{u.bids} / {u.wins}</td>
                <td><div className="row-actions">
                  <button className="iconbtn2" title={u.block ? 'Разблокировать' : 'Заблокировать'} onClick={() => onOpen(u)} style={u.block ? { color: 'var(--live)', borderColor: 'color-mix(in srgb, var(--live) 40%, var(--line2))' } : null}>{AI.ban}</button>
                  <button className="iconbtn2" title="Карточка" onClick={() => onOpen(u)}>{AI.eye}</button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AuctionsBoard({ openLot, onAdd }) {
  const live = LOTS.filter(l => STATUS[l.status].group === 'live');
  const up = LOTS.filter(l => l.status === 'upcoming');
  return (
    <div className="content fade">
      {/* live auctions as control cards */}
      <div className="pcard" style={{ marginBottom: 20 }}>
        <div className="ph">
          <div><h3>Идут прямо сейчас · {live.length}</h3><div className="sub">панель быстрого контроля торгов</div></div>
          <button className="btn acc sm" onClick={onAdd}><span style={{ width: 16, height: 16 }}>{AI.plus}</span> Добавить лот</button>
        </div>
        <div style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {live.map(l => {
            const left = Math.max(0, l.endsIn - 40);
            return (
              <div key={l.id} style={{ border: '1px solid var(--line)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', gap: 12, padding: 14, alignItems: 'center' }}>
                  <div className="ph-img" style={{ width: 76, height: 56 }}><img src={l.img} alt="" /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="nm" style={{ font: '700 14px/1.2 var(--ui)' }}>{l.make} {l.model}</div>
                    <div className="num" style={{ fontSize: 11.5, color: 'var(--faint)', marginTop: 5 }}>#{String(l.id).padStart(3, '0')} · {l.bids} ставок · {Math.round(l.bids * 0.6)} участн.</div>
                  </div>
                  <span className="sb live"><span className="dot"></span>{left <= 120 ? 'ФИНАЛ' : 'ЭФИР'}</span>
                </div>
                <div style={{ display: 'flex', borderTop: '1px solid var(--line)' }}>
                  <div style={{ flex: 1, padding: '11px 14px', borderRight: '1px solid var(--line)' }}><div className="l" style={{ font: '600 9.5px/1 var(--num)', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--faint)' }}>Ставка</div><div className="num" style={{ fontWeight: 700, marginTop: 6 }}>{fmt(l.bid)} ₽</div></div>
                  <div style={{ flex: 1, padding: '11px 14px', borderRight: '1px solid var(--line)' }}><div className="l" style={{ font: '600 9.5px/1 var(--num)', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--faint)' }}>Резерв</div><div className="num" style={{ fontWeight: 700, marginTop: 6, color: l.reserveMet ? 'var(--ok)' : 'var(--dim)' }}>{l.reserveMet ? '✓' : fmt(l.reserve) + ' ₽'}</div></div>
                  <div style={{ flex: 1, padding: '11px 14px' }}><div className="l" style={{ font: '600 9.5px/1 var(--num)', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--faint)' }}>Финал</div><div className="num" style={{ fontWeight: 700, marginTop: 6, color: left <= 120 ? 'var(--live)' : 'var(--ink)' }}>{fmtTime(left)}</div></div>
                </div>
                <div style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid var(--line)', background: 'var(--panel2)' }}>
                  <button className="btn sm" style={{ flex: 1, justifyContent: 'center' }}><span style={{ width: 14, height: 14 }}>{AI.plusclock}</span> +60 сек</button>
                  <button className="btn sm acc" style={{ flex: 1, justifyContent: 'center' }} onClick={() => openLot(l)}>Открыть торг</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* upcoming queue */}
      <div className="pcard">
        <div className="ph"><div><h3>Очередь стартов · {up.length}</h3><div className="sub">запланированные торги</div></div></div>
        <table className="tb">
          <thead><tr><th>Лот</th><th>Старт</th><th>Окончание</th><th>Стартовая</th><th>Резерв</th><th></th></tr></thead>
          <tbody>
            {up.map(l => (
              <tr className="row" key={l.id}>
                <td><div className="lotcell"><div className="ph-img"><img src={l.img} alt="" /></div><div><div className="nm">{l.make} {l.model}</div><div className="meta">#{String(l.id).padStart(3, '0')}</div></div></div></td>
                <td className="num" style={{ color: 'var(--gold)', fontWeight: 600 }}>{l.startLabel}</td>
                <td className="num" style={{ color: 'var(--dim)' }}>{l.endLabel}</td>
                <td className="num" style={{ color: 'var(--dim)' }}>{fmt(l.reserve - 300000)} ₽</td>
                <td className="num">{fmt(l.reserve)} ₽</td>
                <td><div className="row-actions"><button className="btn sm">Запустить сейчас</button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

Object.assign(window, { AI, DEALS, DEAL_STATUS, USERS, ROLE_LABEL, StatusBadge, Sidebar, Dashboard, LotsTable, Deals, UsersTable, AuctionsBoard });
