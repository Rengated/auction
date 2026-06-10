/* hifi-catalog.jsx — catalog feed (shared lot card) */

function LotCard({ lot, now, onOpen }) {
  return (
    <button className="card" onClick={() => onOpen(lot)}
      style={{ display: 'block', width: '100%', textAlign: 'left', padding: 0, cursor: 'pointer' }}>
      <LotCardBody lot={lot} now={now} />
    </button>
  );
}

function ScreenCatalog({ now, onOpen, filter, setFilter }) {
  const filters = ['Все', 'В эфире', 'Скоро старт', 'Завершён', 'Избранное'];
  const list = LOTS.filter(l => {
    if (!l.published) return false;
    if (filter === 'В эфире') return STATUS[l.status].group === 'live';
    if (filter === 'Скоро старт') return STATUS[l.status].group === 'soon';
    if (filter === 'Завершён') return STATUS[l.status].group === 'done';
    if (filter === 'Избранное') return l.fav;
    return true;
  });
  const liveCount = LOTS.filter(l => l.published && STATUS[l.status].group === 'live').length;
  return (
    <div className="screen screen-enter">
      <StatusBar />
      <div style={{ flex: 'none', padding: '4px 18px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 6 }}>аукцион · сегодня</div>
            <div className="title-xl">Лоты</div>
          </div>
          <span className="live"><span className="dot"></span>{liveCount} В ЭФИРЕ</span>
        </div>
        <div style={{ display: 'flex', gap: 9, marginTop: 14 }}>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 9, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, padding: '11px 13px' }}>
            <span style={{ width: 17, height: 17, flex: 'none', color: 'var(--text-faint)' }}>{I.search}</span>
            <span style={{ color: 'var(--text-faint)', fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Поиск по объявлениям — марка, модель…</span>
          </div>
        </div>
      </div>
      <div className="body">
        <div style={{ padding: '0 18px 12px' }}><RecentBidsTicker /></div>
        <div style={{ display: 'flex', gap: 8, padding: '0 18px 2px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {filters.map(f => (
            <button key={f} className={`chip ${filter === f ? 'on' : ''}`} onClick={() => setFilter(f)}>{f}</button>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '13px 18px 96px' }}>
          {list.length === 0
            ? <div style={{ textAlign: 'center', color: 'var(--text-faint)', padding: '54px 0', fontSize: 14 }}>Нет лотов в этой категории</div>
            : list.map(lot => <LotCard key={lot.id} lot={lot} now={now} onOpen={onOpen} />)}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ScreenCatalog, LotCard });
