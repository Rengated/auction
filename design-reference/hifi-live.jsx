/* hifi-live.jsx — live auction room */

function BidFeed({ lot }) {
  const rows = [
    ['Вы', lot.bid, 'сейчас', true],
    ['Участник 77', lot.bid - 20000, '12 сек', false],
    ['kuznetsov', lot.bid - 60000, '48 сек', false],
    ['Участник 12', lot.bid - 80000, '1 мин', false],
    ['avto_msk', lot.bid - 140000, '2 мин', false],
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {rows.map(([u, p, t, me], i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 0', borderBottom: i < rows.length - 1 ? '1px solid var(--line-soft)' : 0, opacity: 1 - i * 0.12 }}>
          <span style={{ width: 32, height: 32, borderRadius: '50%', background: me ? 'var(--accent-glow)' : 'var(--surface-2)', border: '1px solid var(--line)', display: 'grid', placeItems: 'center', font: '600 12px/1 var(--num)', color: me ? 'var(--accent)' : 'var(--text-dim)', flex: 'none' }}>
            {me ? 'Я' : u[0].toUpperCase()}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: me ? 700 : 500, color: me ? 'var(--accent)' : 'var(--text)' }}>{u}</div>
            <div className="num" style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>{t} назад</div>
          </div>
          <span className="num" style={{ fontSize: 15, fontWeight: 600 }}>{rub(p)}</span>
        </div>
      ))}
    </div>
  );
}

function ScreenLive({ lot, now, onBack }) {
  const left = Math.max(0, lot.endsIn - now);
  const urgent = left <= 120;
  return (
    <div className="screen screen-enter">
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '50px 18px 0' }}>
        <button className="iconbtn" onClick={onBack}>{I.back}</button>
        <span className="live"><span className="dot"></span>ЖИВЫЕ ТОРГИ</span>
        <button className="iconbtn">{I.share}</button>
      </div>

      <div className="body">
        <Photo src={lot.img} cap={`${lot.photos} фото`} h={196} glyph={lot.make.toUpperCase()} fit="cover" />

        <div style={{ padding: '16px 18px 0' }}>
          <div className="title-lg">{lot.make} {lot.model}</div>
          <div className="num" style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 6 }}>лот #{String(lot.id).padStart(3, '0')} · {lot.year} · {fmt(lot.mileage)} км</div>

          {/* hero: timer + current bid */}
          <div className="card" style={{ marginTop: 14, padding: 0, display: 'flex', overflow: 'hidden', borderColor: urgent ? 'color-mix(in srgb, var(--live) 40%, var(--line))' : 'var(--line-soft)' }}>
            <div style={{ flex: 1, padding: '15px 16px', borderRight: '1px solid var(--line-soft)' }}>
              <div className="eyebrow">текущая ставка</div>
              <div className="num" style={{ fontSize: 22, fontWeight: 700, marginTop: 7, letterSpacing: '-0.02em' }}>{fmt(lot.bid)}<span style={{ fontSize: 14, color: 'var(--text-dim)' }}> ₽</span></div>
              <div className="num" style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 6 }}>{lot.bids} ставок · {lot.watchers} следят</div>
            </div>
            <div style={{ width: 118, flex: 'none', padding: '15px 14px', textAlign: 'center', background: urgent ? 'color-mix(in srgb, var(--live) 8%, transparent)' : 'var(--surface-2)' }}>
              <div className="eyebrow">до конца</div>
              <div className="num" style={{ fontSize: 25, fontWeight: 700, marginTop: 7, color: urgent ? 'var(--live)' : 'var(--text)' }}>{fmtTime(left)}</div>
              <div className="num" style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 6 }}>{urgent ? 'ставки горят' : 'мин : сек'}</div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '22px 0 4px' }}>
            <span className="eyebrow">лента ставок</span>
            <span className="num" style={{ fontSize: 11, color: 'var(--text-faint)' }}>обновляется в реальном времени</span>
          </div>
        </div>

        <div style={{ padding: '0 18px 24px' }}>
          <BidFeed lot={lot} />
        </div>
      </div>

      <BidPanel lot={lot} now={now} />
    </div>
  );
}

Object.assign(window, { ScreenLive, BidFeed });
