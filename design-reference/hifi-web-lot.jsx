/* hifi-web-lot.jsx — desktop lot page, bid box, live feed, app shell */

const WMIN = 20000;

function WebBidBox({ lot, now }) {
  const minNext = lot.bid + WMIN;
  const [value, setValue] = React.useState(minNext);
  const [done, setDone] = React.useState(false);
  const left = Math.max(0, lot.endsIn - now);
  const startsLeft = Math.max(0, (lot.startsIn || 0) - now);
  const tooLow = value < minNext;
  const r = rsv(lot);
  const group = STATUS[lot.status].group;

  const StatLine = () => (
    <div className="statline">
      <div><div className="eyebrow-w">ставок</div><div className="num" style={{ fontSize: 18, fontWeight: 700, marginTop: 6 }}>{lot.bids}</div></div>
      <div><div className="eyebrow-w">участников</div><div className="num" style={{ fontSize: 18, fontWeight: 700, marginTop: 6 }}>{participantsOf(lot)}</div></div>
      <div><div className="eyebrow-w">{group === 'soon' ? 'старт через' : group === 'done' ? 'завершены' : 'до конца'}</div>
        <div className="num" style={{ fontSize: 18, fontWeight: 700, marginTop: 6, color: (group === 'live' && left <= 300) ? 'var(--live)' : 'var(--text)' }}>
          {group === 'soon' ? fmtTime(startsLeft) : group === 'done' ? lot.endLabel : fmtTime(left)}</div></div>
    </div>
  );

  return (
    <div className="bidbox">
      <div className="eyebrow-w">{lot.status === 'sold' ? 'итоговая цена' : lot.status === 'upcoming' ? 'стартовая цена' : 'текущая ставка'}</div>
      <div className="num" style={{ fontSize: 32, fontWeight: 700, marginTop: 8, letterSpacing: '-0.02em', color: lot.status === 'sold' ? 'var(--win)' : 'var(--text)' }}>{rub(lot.bid)}</div>
      <div className="num" style={{ fontSize: 12.5, fontWeight: 600, marginTop: 8 }}>{r.t}</div>

      <StatLine />

      {group === 'live' && (
        <React.Fragment>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            {[20000, 50000, 100000].map(q => (
              <button key={q} className="wchip" style={{ flex: 1, justifyContent: 'center', textAlign: 'center' }}
                onClick={() => setValue(v => Math.max(minNext, v) + q)}>+{q / 1000}к</button>
            ))}
          </div>
          <BidInput value={value} step={WMIN} onChange={setValue} />
          <div className="num" style={{ fontSize: 12, color: tooLow ? 'var(--live)' : 'var(--text-faint)', margin: '10px 2px 12px' }}>
            {tooLow ? `минимум ${rub(minNext)}` : `мин. шаг ${fmt(WMIN)} ₽ · следующая ${rub(minNext)}`}
          </div>
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--line-soft)', borderRadius: 10, padding: '11px 14px', marginBottom: 14 }}>
            <div className="num" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13, color: 'var(--text-dim)' }}>
              <span>ваша ставка</span><span style={{ whiteSpace: 'nowrap' }}>{rub(value)}</span>
            </div>
            <div className="num" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13, color: 'var(--text-dim)', marginTop: 8 }}>
              <span>комиссия · {feePct()}%</span><span style={{ whiteSpace: 'nowrap' }}>{rub(fee(value))}</span>
            </div>
            <div className="num" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 15, fontWeight: 700, marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--line)' }}>
              <span>итого при выигрыше</span><span style={{ whiteSpace: 'nowrap' }}>{rub(value + fee(value))}</span>
            </div>
          </div>
          <button className={`wbtn ${done ? '' : 'accent'}`} style={{ width: '100%', justifyContent: 'center', padding: '15px',
              ...(done ? { background: 'color-mix(in srgb, var(--win) 16%, transparent)', color: 'var(--win)' } : {}) }}
            onClick={() => { if (tooLow) { setValue(minNext); return; } setDone(true); setTimeout(() => setDone(false), 2600); }}>
            {done ? <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><Ic d={I.check} /> Ставка принята · вы лидируете</span> : `Поставить ${rub(value)}`}
          </button>
        </React.Fragment>
      )}

      {group === 'soon' && (
        <button className="wbtn accent" style={{ width: '100%', justifyContent: 'center', padding: '15px' }} onClick={() => setDone(true)}>
          {done ? <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><Ic d={I.check} /> Напомним о старте</span> : 'Напомнить о старте'}
        </button>
      )}

      {group === 'done' && (
        <button className="wbtn" style={{ width: '100%', justifyContent: 'center', padding: '15px', color: 'var(--text-dim)', cursor: 'default' }} disabled>
          Торги завершены
        </button>
      )}
    </div>
  );
}

function WebFeed({ lot }) {
  const rows = [['Вы', lot.bid, 'сейчас', true], ['Участник 77', lot.bid - 20000, '12 сек', false],
    ['kuznetsov', lot.bid - 60000, '48 сек', false], ['Участник 12', lot.bid - 80000, '1 мин', false]];
  return (
    <div className="card" style={{ padding: '6px 18px', marginTop: 16 }}>
      {rows.map(([u, p, t, me], i) => (
        <div key={i} className="feed-row" style={{ opacity: 1 - i * 0.12 }}>
          <span style={{ width: 32, height: 32, borderRadius: '50%', background: me ? 'var(--accent-glow)' : 'var(--surface-2)', border: '1px solid var(--line)', display: 'grid', placeItems: 'center', font: '700 12px/1 var(--num)', color: me ? 'var(--accent)' : 'var(--text-dim)' }}>{me ? 'Я' : u[0]}</span>
          <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: me ? 700 : 500, color: me ? 'var(--accent)' : 'var(--text)' }}>{u}</div><div className="num" style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>{t} назад</div></div>
          <span className="num" style={{ fontSize: 15, fontWeight: 600 }}>{rub(p)}</span>
        </div>
      ))}
    </div>
  );
}

function LotView({ lot, now, onBack }) {
  const [tab, setTab] = React.useState('Обзор');
  const tabs = ['Обзор', 'Характеристики', 'Описание'];
  const live = STATUS[lot.status].group === 'live';
  const specRows = [['Двигатель', `${lot.engine} · ${lot.power} л.с.`], ['Топливо', lot.fuel], ['Коробка', lot.transmission],
    ['Привод', lot.drive], ['Кузов', lot.body], ['Пробег', `${fmt(lot.mileage)} км`], ['Год', String(lot.year)], ['Цвет', lot.color]];
  return (
    <div className="wrap viewfade">
      <div style={{ padding: '22px 0 0' }}>
        <button className="wbtn ghost" onClick={onBack}><span style={{ width: 16, height: 16 }}>{I.back}</span> Назад к каталогу</button>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20, padding: '18px 0 22px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="eyebrow-w">лот #{String(lot.id).padStart(3, '0')} · {lot.year}</div>
          <h1 style={{ font: '800 30px/1.12 var(--ui)', letterSpacing: '-0.025em', margin: '12px 0 0' }}>{lot.make} {lot.model}</h1>
          <div className="num" style={{ color: 'var(--text-dim)', fontSize: 14, marginTop: 12 }}>{fmt(lot.mileage)} км · {lot.body} · {lot.color}</div>
        </div>
        <StatusBadge status={lot.status} now={now} lot={lot} />
      </div>

      <div className="lot-grid">
        <div>
          <div className="gallery-main"><Carousel src={lot.img} count={lot.photos} h={420} glyph={lot.make.toUpperCase()} /></div>
          <div className="thumbs">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className={`thumb ${i === 1 ? 'on' : ''}`}><Photo h={70} glyph={String(i)} /></div>)}
          </div>

          <div style={{ marginTop: 26 }}>
            <div className="wseg">{tabs.map(t => <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>)}</div>
            <div style={{ marginTop: 18 }}>
              {tab === 'Обзор' && (
                <div>
                  <div className="specgrid">
                    <SpecTile icon={I.road} k="пробег" v={`${fmt(lot.mileage)} км`} />
                    <SpecTile icon={I.engine} k="двигатель" v={`${lot.engine} · ${lot.power} л.с.`} />
                    <SpecTile icon={I.fuel} k="топливо" v={lot.fuel} />
                    <SpecTile icon={I.catalog} k="привод" v={lot.drive} />
                    <SpecTile icon={I.clock} k="коробка" v={lot.transmission} />
                    <SpecTile icon={I.shield} k="проверка" v="пройдена" />
                  </div>
                  <div style={{ marginTop: 14 }}><AutotekaReport lot={lot} /></div>
                </div>
              )}
              {tab === 'Характеристики' && (
                <div className="card" style={{ padding: '2px 18px' }}>
                  {specRows.map(([k, v]) => <div key={k} className="spec-row"><span className="k">{k}</span><span className="v num">{v}</span></div>)}
                </div>
              )}
              {tab === 'Описание' && (
                <div>
                  <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: 15, lineHeight: 1.65, textWrap: 'pretty' }}>{lot.desc}</p>
                  <div className="card" style={{ marginTop: 16, padding: '16px 18px' }}>
                    <div className="eyebrow-w" style={{ marginBottom: 12 }}>комплектация</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{lot.options.map(o => <span key={o} className="wchip" style={{ cursor: 'default' }}>{o}</span>)}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ marginTop: 26 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div className="eyebrow-w" style={{ margin: 0 }}>ставки по лоту · {lot.bids} · {participantsOf(lot)} участников</div>
              {live && <span className="live" style={{ fontSize: 12 }}><span className="dot"></span>обновляется</span>}
            </div>
            <BidList lot={lot} max={8} scroll={true} />
          </div>
        </div>

        <WebBidBox lot={lot} now={now} />
      </div>
    </div>
  );
}

function WebApp() {
  const [t, setTweak] = useTweaks(WEB_TWEAKS);
  const [authed, setAuthed] = React.useState(() => localStorage.getItem('cc_web_authed') === '1');
  const [now, setNow] = React.useState(0);
  const [nav, setNav] = React.useState('all');
  const [view, setView] = React.useState({ name: 'catalog' });

  React.useEffect(() => { const id = setInterval(() => setNow(n => n + 1), 1000); return () => clearInterval(id); }, []);

  const login = () => { localStorage.setItem('cc_web_authed', '1'); setAuthed(true); };
  const logout = () => { localStorage.removeItem('cc_web_authed'); setAuthed(false); setView({ name: 'catalog' }); setNav('all'); window.scrollTo({ top: 0 }); };

  const openLot = (lot) => { setView({ name: 'lot', lot }); window.scrollTo({ top: 0 }); };
  const toCatalog = (f) => { setNav(f); setView({ name: 'catalog' }); window.scrollTo({ top: 0 }); };
  const openProfile = () => { setView({ name: 'profile' }); window.scrollTo({ top: 0 }); };

  if (!authed) {
    return (
      <div className="web" data-theme={t.theme} style={{ '--accent': t.accent }}>
        <WebAuth onDone={login} />
      </div>
    );
  }

  return (
    <div className="web" data-theme={t.theme} style={{ '--accent': t.accent }}>
      <TopBar onProfile={openProfile} />
      {view.name === 'catalog'
        ? <CatalogView now={now} nav={nav} setNav={setNav} onOpen={openLot} />
        : view.name === 'profile'
        ? <WebProfile onBack={() => toCatalog(nav)} onLogout={logout} />
        : <LotView lot={view.lot} now={now} onBack={() => toCatalog(nav)} />}
      <div className="foot"><div className="wrap"><div className="row">
        <span style={{ color: 'var(--text-dim)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 10 }}><HermesH size={22} color="#9aa2ac" /> Hermes Trade</span>
        <span>© 2026 · все права защищены</span>
      </div></div></div>

      <TweaksPanel>
        <TweakSection label="Оформление" />
        <TweakRadio label="Тема" value={t.theme} options={['dark', 'light']} onChange={(v) => setTweak('theme', v)} />
        <TweakColor label="Акцент" value={t.accent} options={['#c9533c', '#c08a2e', '#3f6fc0', '#2f9460', '#7c5ad0']} onChange={(v) => setTweak('accent', v)} />
      </TweaksPanel>
    </div>
  );
}

Object.assign(window, { WebBidBox, WebFeed, LotView, WebApp });
