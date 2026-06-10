/* hifi-mybids.jsx — my bids / tracking */

const MY_STATUS = {
  1: { tab: 'Активные', status: 'lead', label: 'вы лидируете', mine: 3820000 },
  4: { tab: 'Активные', status: 'out', label: 'вашу перебили', mine: 4100000 },
  2: { tab: 'Избранное', status: 'watch', label: 'в избранном', mine: null },
  3: { tab: 'Выигранные', status: 'win', label: 'выигран', mine: 2450000 },
};

function MyBidRow({ lot, info, now, onOpen }) {
  const left = Math.max(0, lot.endsIn - now);
  return (
    <button className="card" onClick={() => onOpen(lot)}
      style={{ display: 'flex', width: '100%', gap: 13, padding: 12, textAlign: 'left', cursor: 'pointer', alignItems: 'center', background: 'var(--surface)', border: '1px solid var(--line-soft)', borderColor: info.status === 'out' ? 'rgba(229,83,61,0.35)' : 'var(--line-soft)' }}>
      <Photo src={lot.img} h={66} glyph={lot.make[0]} fit="cover" style={{ width: 88, flex: 'none', borderRadius: 9 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span style={{ font: '600 15px/1.2 var(--ui)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lot.make} {lot.model}</span>
          <span className={`tag ${info.status}`} style={{ flex: 'none' }}>{info.label}</span>
        </div>
        <div className="num" style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 7, whiteSpace: 'nowrap' }}>
          {info.mine ? `ваша · ${rub(info.mine)}` : `ставка · ${rub(lot.bid)}`}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 9 }}>
          <span className="num" style={{ fontSize: 12, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>текущая {rub(lot.bid)}</span>
          {info.status === 'win'
            ? <span className="num" style={{ fontSize: 11, color: 'var(--win)' }}>завершён</span>
            : <span className="num" style={{ fontSize: 11, color: left <= 300 && lot.live ? 'var(--live)' : 'var(--text-faint)' }}>⏱ {fmtTime(left)}</span>}
        </div>
      </div>
    </button>
  );
}

function ScreenMyBids({ now, onOpen, myTab, setMyTab }) {
  const tabs = ['Активные', 'Выигранные', 'Избранное'];
  const rows = LOTS.map(l => ({ lot: l, info: MY_STATUS[l.id] })).filter(r => r.info && r.info.tab === myTab);
  return (
    <div className="screen screen-enter">
      <StatusBar />
      <div style={{ flex: 'none', padding: '6px 20px 14px' }}>
        <div className="eyebrow" style={{ marginBottom: 7 }}>портфель торгов</div>
        <div className="title-xl">Мои ставки</div>
        <div style={{ display: 'flex', gap: 9, marginTop: 16 }}>
          {tabs.map(t => <button key={t} className={`chip ${myTab === t ? 'on' : ''}`} onClick={() => setMyTab(t)}>{t}</button>)}
        </div>
      </div>
      <div className="body">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 20px 96px' }}>
          {rows.length === 0
            ? <div style={{ textAlign: 'center', color: 'var(--text-faint)', padding: '60px 0', fontSize: 14 }}>Здесь пока пусто</div>
            : rows.map(r => <MyBidRow key={r.lot.id} lot={r.lot} info={r.info} now={now} onOpen={onOpen} />)}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ScreenMyBids });
