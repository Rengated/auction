/* hifi-web.jsx — desktop web app (catalog + lot page) */

function rsv(lot) {
  if (lot.status === 'sold') return { t: `✓ продан · резерв ${fmt(lot.reserve)} ₽`, c: 'var(--win)' };
  return { t: <span style={{ color: 'var(--text-faint)' }}>резерв {fmt(lot.reserve)} ₽ · <span style={{ color: lot.reserveMet ? 'var(--ok)' : 'var(--text-dim)' }}>{lot.reserveMet ? 'взят' : 'не взят'}</span></span> };
}
function pmeta(lot, now) {
  const left = Math.max(0, lot.endsIn - now);
  const startsLeft = Math.max(0, (lot.startsIn || 0) - now);
  if (lot.status === 'live' || lot.status === 'ending') return { pL: 'макс. ставка', p: lot.bid, tL: 'до конца', tV: fmtTime(left), urgent: left <= 300 };
  if (lot.status === 'upcoming') return { pL: 'стартовая цена', p: lot.bid, tL: 'старт', tV: `через ${fmtTime(startsLeft)}` };
  if (lot.status === 'sold') return { pL: 'продан за', p: lot.bid, sold: true, tL: 'завершён', tV: lot.endLabel };
  return { pL: 'макс. ставка', p: lot.bid, tL: 'завершён', tV: lot.endLabel };
}

function Ic({ d, s = 17 }) { return <span style={{ width: s, height: s, display: 'inline-flex' }}>{d}</span>; }

/* ---------- top bar ---------- */
function TopBar({ onProfile }) {
  return (
    <div className="topbar">
      <div className="wrap">
        <div className="row">
          <button onClick={onProfile} title="На главную" style={{ background: 'none', border: 0, cursor: 'pointer', flex: 'none', padding: 0 }}><HermesLogo markSize={30} fontSize={16} color="var(--text)" accent="#9aa2ac" /></button>
          <div className="topsearch" style={{ maxWidth: 'none' }}>{I.search}<span>Поиск по объявлениям — марка, модель, номер лота…</span></div>
          <button className="avatar" onClick={onProfile} title="Профиль" style={{ cursor: 'pointer' }}>А</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- web lot card (shared body) ---------- */
function WebLotCard({ lot, now, onOpen }) {
  return (
    <button className="wcard" onClick={() => onOpen(lot)}>
      <LotCardBody lot={lot} now={now} />
    </button>
  );
}

/* ---------- catalog view ---------- */
function CatalogView({ now, nav, setNav, onOpen }) {
  const chips = [['all', 'Все'], ['В эфире', 'В эфире'], ['Скоро старт', 'Скоро старт'], ['Завершён', 'Завершён'], ['Избранное', 'Избранное']];
  const list = LOTS.filter(l => {
    if (!l.published) return false;
    if (nav === 'all') return true;
    if (nav === 'Избранное') return l.fav;
    if (nav === 'В эфире') return STATUS[l.status].group === 'live';
    if (nav === 'Скоро старт') return STATUS[l.status].group === 'soon';
    if (nav === 'Завершён') return STATUS[l.status].group === 'done';
    return true;
  });
  const liveCount = LOTS.filter(l => l.published && STATUS[l.status].group === 'live').length;
  return (
    <div className="wrap viewfade">
      <div className="page-head">
        <div>
          <div className="eyebrow-w">аукцион автомобилей · сегодня</div>
          <h1>Каталог лотов</h1>
        </div>
        <span className="live" style={{ fontSize: 13 }}><span className="dot"></span>{liveCount} в эфире сейчас</span>
      </div>
      <div style={{ marginBottom: 18 }}><RecentBidsTicker /></div>
      <div style={{ display: 'flex', gap: 9, paddingBottom: 24, flexWrap: 'wrap' }}>
        {chips.map(([k, l]) => <button key={k} className={`wchip ${nav === k ? 'on' : ''}`} onClick={() => setNav(k)}>{l}</button>)}
      </div>
      {list.length === 0
        ? <div style={{ textAlign: 'center', color: 'var(--text-faint)', padding: '80px 0' }}>Нет лотов в этой категории</div>
        : <div className="grid">{list.map(lot => <WebLotCard key={lot.id} lot={lot} now={now} onOpen={onOpen} />)}</div>}
    </div>
  );
}

Object.assign(window, { rsv, pmeta, Ic, TopBar, WebLotCard, CatalogView });
