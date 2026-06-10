/* hifi-lot.jsx — lot detail (Обзор / Характеристики / Описание) + adaptive bid panel */

const MIN_STEP = 20000;

function ReserveLine({ lot }) {
  if (lot.status === 'sold') return <span style={{ color: 'var(--win)', fontWeight: 600 }}>✓ продан · резерв {fmt(lot.reserve)} ₽</span>;
  const met = lot.reserveMet;
  return (
    <span style={{ color: 'var(--text-faint)', fontWeight: 600 }}>
      резерв {fmt(lot.reserve)} ₽ · <span style={{ color: met ? 'var(--ok)' : 'var(--text-dim)' }}>{met ? 'достигнут' : 'не достигнут'}</span>
    </span>
  );
}

function BidPanel({ lot, now }) {
  const minNext = lot.bid + MIN_STEP;
  const [value, setValue] = React.useState(minNext);
  const [done, setDone] = React.useState(false);
  const quick = [20000, 50000, 100000];
  const left = Math.max(0, lot.endsIn - now);
  const tooLow = value < minNext;

  // finished / sold — no bidding
  if (lot.status === 'sold' || lot.status === 'finished' || lot.status === 'withdrawn') {
    return (
      <div className="bidbar">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 11 }}>
          <div>
            <div className="eyebrow">{lot.status === 'sold' ? 'итоговая цена' : 'макс. ставка'}</div>
            <div className="num" style={{ fontSize: 19, fontWeight: 700, marginTop: 4, color: lot.status === 'sold' ? 'var(--win)' : 'var(--text)' }}>{rub(lot.bid)}</div>
          </div>
          <div className="num" style={{ fontSize: 12, textAlign: 'right' }}><ReserveLine lot={lot} /><div style={{ color: 'var(--text-faint)', marginTop: 5 }}>{lot.bids} ставок</div></div>
        </div>
        <button className="btn block" style={{ background: 'var(--surface-2)', color: 'var(--text-dim)', cursor: 'default' }} disabled>
          Торги завершены
        </button>
      </div>
    );
  }

  // upcoming — remind, no bidding yet
  if (lot.status === 'upcoming') {
    const startsLeft = Math.max(0, (lot.startsIn || 0) - now);
    return (
      <div className="bidbar">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 11 }}>
          <div>
            <div className="eyebrow">стартовая цена</div>
            <div className="num" style={{ fontSize: 19, fontWeight: 700, marginTop: 4 }}>{rub(lot.bid)}</div>
          </div>
          <div className="num" style={{ fontSize: 12, textAlign: 'right', color: 'var(--text-dim)' }}>старт через<div style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 15, marginTop: 4 }}>{fmtTime(startsLeft)}</div></div>
        </div>
        <button className="btn accent block" onClick={() => setDone(true)}>
          {done ? <span style={{ display: 'inline-flex', gap: 7, alignItems: 'center' }}><span style={{ width: 16, height: 16 }}>{I.check}</span> Напомним о старте</span> : 'Напомнить о старте'}
        </button>
      </div>
    );
  }

  // live / ending — full bidding
  const confirm = () => {
    if (tooLow) { setValue(minNext); return; }
    setDone(true);
    setTimeout(() => setDone(false), 2600);
  };
  const contactsFilled = (() => { try { return localStorage.getItem('cc_contacts') === '1'; } catch (e) { return false; } })();
  return (
    <div className="bidbar">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
          <span className="eyebrow">текущая</span>
          <span className="num" style={{ fontWeight: 700, fontSize: 16, whiteSpace: 'nowrap' }}>{rub(lot.bid)}</span>
        </div>
        <div className="num" style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 12, color: 'var(--text-dim)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 13, height: 13 }}>{I.bids}</span>{lot.bids}</span>
          <span style={{ color: left <= 300 ? 'var(--live)' : 'var(--text-dim)', display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 13, height: 13 }}>{I.clock}</span>{fmtTime(left)}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 7, marginBottom: 9 }}>
        {quick.map(q => (
          <button key={q} className="chip" style={{ flex: 1, textAlign: 'center', justifyContent: 'center' }}
            onClick={() => setValue(v => Math.max(minNext, v) + q)}>+{q / 1000}к</button>
        ))}
      </div>

      <BidInput value={value} step={MIN_STEP} onChange={setValue} />

      <div className="num" style={{ fontSize: 11, color: tooLow ? 'var(--live)' : 'var(--text-faint)', margin: '8px 2px 9px', display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <span>{tooLow ? `минимум ${rub(minNext)}` : `шаг ${fmt(MIN_STEP)} ₽`}</span>
        <ReserveLine lot={lot} />
      </div>

      <div style={{ background: 'var(--surface-2)', border: '1px solid var(--line-soft)', borderRadius: 9, padding: '9px 12px', marginBottom: 11 }}>
        <div className="num" style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12, color: 'var(--text-dim)' }}>
          <span>комиссия · {feePct()}%</span><span style={{ whiteSpace: 'nowrap' }}>{rub(fee(value))}</span>
        </div>
        <div className="num" style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13, fontWeight: 700, marginTop: 7, paddingTop: 7, borderTop: '1px dashed var(--line)' }}>
          <span>итого при выигрыше</span><span style={{ whiteSpace: 'nowrap' }}>{rub(value + fee(value))}</span>
        </div>
      </div>

      <button className={`btn block ${done ? '' : 'accent'}`} onClick={contactsFilled ? confirm : (() => { window.dispatchEvent(new CustomEvent('cc-need-contacts')); })}
        style={done ? { background: 'color-mix(in srgb, var(--win) 16%, transparent)', color: 'var(--win)', boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--win) 45%, transparent)' } : {}}>
        {done
          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><span style={{ width: 17, height: 17 }}>{I.check}</span> Ставка принята · вы лидируете</span>
          : contactsFilled
            ? <span style={{ whiteSpace: 'nowrap' }}>Поставить {rub(value)}</span>
            : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><span style={{ width: 16, height: 16 }}>{I.shield}</span> Заполните контакты для ставки</span>}
      </button>
    </div>
  );
}

function ScreenLot({ lot, now, onBack }) {
  const [tab, setTab] = React.useState('Обзор');
  const tabs = ['Обзор', 'Характеристики', 'Описание'];
  const live = STATUS[lot.status].group === 'live';
  const specRows = [
    ['Двигатель', `${lot.engine} · ${lot.power} л.с.`], ['Топливо', lot.fuel],
    ['Коробка', lot.transmission], ['Привод', lot.drive], ['Кузов', lot.body],
    ['Пробег', `${fmt(lot.mileage)} км`], ['Год выпуска', String(lot.year)], ['Цвет', lot.color],
  ];

  return (
    <div className="screen screen-enter">
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 5, display: 'flex', justifyContent: 'space-between', padding: '48px 16px 0' }}>
        <button className="iconbtn" onClick={onBack}>{I.back}</button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="iconbtn">{I.share}</button>
          <button className="iconbtn" style={{ color: lot.fav ? 'var(--accent)' : 'var(--text)' }}>{I.bookmark}</button>
        </div>
      </div>

      <div className="body">
        <div style={{ position: 'relative' }}>
          <Carousel src={lot.img} count={lot.photos} h={264} glyph={lot.make.toUpperCase()} />
          <div style={{ position: 'absolute', bottom: 11, right: 11, zIndex: 5 }}><StatusBadge status={lot.status} now={now} lot={lot} /></div>
        </div>

        <div style={{ padding: '16px 18px 0' }}>
          <div className="eyebrow">лот #{String(lot.id).padStart(3, '0')}</div>
          <div className="title-xl" style={{ marginTop: 7 }}>{lot.make} {lot.model}</div>
          <div className="num" style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 7 }}>{lot.year} · {fmt(lot.mileage)} км · {lot.body}</div>

          <div style={{ display: 'flex', gap: 16, marginTop: 15 }}>
            <div>
              <div className="eyebrow">{lot.status === 'sold' ? 'продан за' : lot.status === 'upcoming' ? 'стартовая цена' : 'текущая ставка'}</div>
              <div className="num" style={{ fontSize: 22, fontWeight: 700, marginTop: 4, color: lot.status === 'sold' ? 'var(--win)' : 'var(--text)' }}>{rub(lot.bid)}</div>
              <div className="num" style={{ fontSize: 11, marginTop: 5 }}><ReserveLine lot={lot} /></div>
            </div>
            <div style={{ borderLeft: '1px solid var(--line)', paddingLeft: 16 }}>
              <div className="eyebrow">ставок · участников</div>
              <div className="num" style={{ fontSize: 16, fontWeight: 600, marginTop: 6 }}>{lot.bids} · {participantsOf(lot)}</div>
              <div className="num" style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 6 }}>оконч. {lot.endLabel}</div>
            </div>
          </div>
        </div>

        <div style={{ padding: '18px 18px 0' }}>
          <div className="seg">
            {tabs.map(t => <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>)}
          </div>
        </div>

        <div style={{ padding: '16px 18px 24px' }}>
          {tab === 'Обзор' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
                <SpecTile icon={I.road} k="пробег" v={`${fmt(lot.mileage)} км`} />
                <SpecTile icon={I.engine} k="двигатель" v={`${lot.engine} · ${lot.power} л.с.`} />
                <SpecTile icon={I.fuel} k="топливо" v={lot.fuel} />
                <SpecTile icon={I.catalog} k="привод" v={lot.drive.replace('Полный ', 'Полный')} />
              </div>
              <AutotekaReport lot={lot} />
              <div className="card" style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>Окно торгов</span>
                <span className="num" style={{ fontSize: 12.5, fontWeight: 600 }}>{lot.startLabel} → {lot.endLabel}</span>
              </div>
            </div>
          )}
          {tab === 'Характеристики' && (
            <div className="card" style={{ padding: '2px 15px' }}>
              {specRows.map(([k, v]) => (
                <div key={k} className="spec-row"><span className="k">{k}</span><span className="v num">{v}</span></div>
              ))}
            </div>
          )}
          {tab === 'Описание' && (
            <div>
              <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: 14, lineHeight: 1.62, textWrap: 'pretty' }}>{lot.desc}</p>
              <div className="card" style={{ marginTop: 14, padding: '13px 15px' }}>
                <div className="eyebrow" style={{ marginBottom: 10 }}>комплектация</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {lot.options.map(o => <span key={o} className="chip" style={{ cursor: 'default' }}>{o}</span>)}
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '0 18px 26px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div className="eyebrow">ставки по лоту · {lot.bids} · {participantsOf(lot)} участн.</div>
            {live && <span className="live" style={{ fontSize: 11 }}><span className="dot"></span>обновляется</span>}
          </div>
          <BidList lot={lot} max={8} scroll={true} />
        </div>
      </div>

      <BidPanel lot={lot} now={now} />
    </div>
  );
}

Object.assign(window, { ScreenLot, BidPanel, MIN_STEP });
