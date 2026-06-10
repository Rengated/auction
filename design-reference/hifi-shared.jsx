/* hifi-shared.jsx — data, icons, helpers, shared components */

// ---- format helpers -------------------------------------------------
function fmt(n) { return n.toLocaleString('ru-RU'); }
function rub(n) { return fmt(n) + ' ₽'; }
function fmtTime(sec) {
  if (sec >= 3600) { const h = Math.floor(sec / 3600); const m = Math.floor((sec % 3600) / 60); return `${h}ч ${m}м`; }
  const m = Math.floor(sec / 60); const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
function participantsOf(lot) { return Math.max(1, Math.round((lot.bids || 0) * 0.6)); }
const FEE_RATE = 0.015; // комиссия салона за выкуп
function fee(n) { return Math.round(n * FEE_RATE); }
function feePct() { return (FEE_RATE * 100).toLocaleString('ru-RU', { maximumFractionDigits: 2 }); }

// stock car photo (Unsplash CDN) with graceful fallback to placeholder
function photo(id, w) {
  return `https://images.unsplash.com/photo-${id}?w=${w || 900}&q=75&auto=format&fit=crop`;
}

// ---- status system --------------------------------------------------
const STATUS = {
  live:     { label: 'В эфире',          tone: 'live',  group: 'live' },
  ending:   { label: 'Скоро конец',      tone: 'live',  group: 'live' },
  upcoming: { label: 'Ожидает старта',   tone: 'soon',  group: 'soon' },
  sold:     { label: 'Продан',           tone: 'ok',    group: 'done' },
  finished: { label: 'Резерв не взят',   tone: 'muted', group: 'done' },
  withdrawn:{ label: 'Снят с торгов',    tone: 'muted', group: 'done' },
};

// ---- icons (stroke svg) ---------------------------------------------
const I = {
  catalog: <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
  live: <svg viewBox="0 0 24 24"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/></svg>,
  bids: <svg viewBox="0 0 24 24"><path d="M3 7h13l-1.5 9a2 2 0 0 1-2 1.7H6.5a2 2 0 0 1-2-1.7L3 7Z"/><path d="M16 10h3.5a1.5 1.5 0 0 1 0 3H16"/><path d="M7 7V5.5A2.5 2.5 0 0 1 9.5 3h0A2.5 2.5 0 0 1 12 5.5V7"/></svg>,
  user: <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M5 21c0-3.9 3.1-7 7-7s7 3.1 7 7"/></svg>,
  back: <svg viewBox="0 0 24 24"><path d="M15 5 8 12l7 7"/></svg>,
  search: <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m21 21-4-4"/></svg>,
  clock: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>,
  bookmark: <svg viewBox="0 0 24 24"><path d="M6 4h12v16l-6-4-6 4V4Z"/></svg>,
  share: <svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.5 10.5 7-4M8.5 13.5l7 4"/></svg>,
  check: <svg viewBox="0 0 24 24"><path d="m4 12 5 5L20 6"/></svg>,
  road: <svg viewBox="0 0 24 24"><path d="M6 3 4 21M18 3l2 18M12 4v3M12 11v3M12 18v2"/></svg>,
  fuel: <svg viewBox="0 0 24 24"><path d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h14"/><path d="M15 9h2.5a2 2 0 0 1 2 2v6a1.5 1.5 0 0 0 3 0V9l-3-3"/></svg>,
  engine: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2"/><path d="M12 4v2M12 18v2M4 12h2M18 12h2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M17.7 6.3l-1.4 1.4M7.7 16.3l-1.4 1.4"/></svg>,
  plus: <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>,
  phone: <svg viewBox="0 0 24 24"><rect x="6" y="2.5" width="12" height="19" rx="3"/><path d="M10.5 18.5h3"/></svg>,
  camera: <svg viewBox="0 0 24 24"><path d="M4 8h3l1.5-2.5h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13" r="3.2"/></svg>,
  edit: <svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="M14 6l4 4"/></svg>,
  eye: <svg viewBox="0 0 24 24"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>,
  shield: <svg viewBox="0 0 24 24"><path d="M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></svg>,
  doc: <svg viewBox="0 0 24 24"><path d="M6 2h8l4 4v16H6V2Z"/><path d="M14 2v4h4"/><path d="M9 13h6M9 17h6M9 9h2"/></svg>,
  cross: <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>,
  alert: <svg viewBox="0 0 24 24"><path d="M12 3 2 20h20L12 3Z"/><path d="M12 10v4M12 17v.5"/></svg>,
};

// ---- Hermes Trade brand marks ---------------------------------------
function HermesMark({ size = 48, color = '#cdd3da' }) {
  const h = Math.round(size * 0.75);
  return (
    <svg width={size} height={h} viewBox="0 0 200 150" fill={color} style={{ display: 'block' }} aria-label="Hermes Trade">
      <g>
        <path d="M100 56 Q 142 54 176 66 Q 140 50 100 52 Z"/>
        <path d="M100 50 Q 136 47 164 55 Q 132 40 100 46 Z"/>
        <path d="M100 44 Q 126 41 148 47 Q 122 32 100 40 Z"/>
      </g>
      <g transform="matrix(-1 0 0 1 200 0)">
        <path d="M100 56 Q 142 54 176 66 Q 140 50 100 52 Z"/>
        <path d="M100 50 Q 136 47 164 55 Q 132 40 100 46 Z"/>
        <path d="M100 44 Q 126 41 148 47 Q 122 32 100 40 Z"/>
      </g>
      <rect x="97" y="44" width="6" height="84" rx="3"/>
      <circle cx="100" cy="36" r="8"/>
      <circle cx="100" cy="128" r="4"/>
    </svg>
  );
}

function HermesH({ size = 40, color = '#cdd3da' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" style={{ display: 'block' }} aria-label="Hermes Trade">
      <circle cx="60" cy="60" r="52" fill="none" stroke={color} strokeWidth="3" opacity="0.55" />
      <rect x="40" y="36" width="6" height="48" fill={color} />
      <rect x="74" y="36" width="6" height="48" fill={color} />
      <path d="M46 64 L74 52" stroke={color} strokeWidth="6" strokeLinecap="round" fill="none" />
    </svg>
  );
}

// horizontal lockup: H-mark + wordmark
function HermesLogo({ markSize = 30, fontSize = 17, color = 'var(--text)', accent = '#aeb6bf', sub = true }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 11 }}>
      <HermesH size={markSize} color={accent} />
      <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <span style={{ fontFamily: "'Marcellus', serif", letterSpacing: '0.18em', textTransform: 'uppercase', fontSize, color }}>Hermes</span>
        {sub && <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", letterSpacing: '0.42em', textTransform: 'uppercase', fontSize: Math.round(fontSize * 0.42), color: accent, marginTop: 5 }}>Trade</span>}
      </span>
    </span>
  );
}

// ---- Autoteka report (shared, light/dark via vars) ------------------
function AutotekaReport({ lot, compact }) {
  const a = lot.autoteka;
  if (!a || !a.attached) {
    return (
      <div className="card" style={{ padding: '14px 15px', display: 'flex', alignItems: 'center', gap: 11 }}>
        <span style={{ width: 18, height: 18, color: 'var(--text-faint)', flex: 'none' }}>{I.doc}</span>
        <span style={{ fontSize: 13, color: 'var(--text-faint)' }}>Отчёт Автотеки готовится — появится до старта торгов</span>
      </div>
    );
  }
  const rows = [
    ['Владельцев по ПТС', String(a.owners), a.owners <= 2],
    ['ДТП в истории', a.accidents === 0 ? 'не найдено' : `${a.accidents}`, a.accidents === 0],
    ['Пробег', a.mileageOk ? 'без скруток' : 'есть расхождения', a.mileageOk],
    ['Ограничения ГИБДД', a.restrictions ? 'есть' : 'нет', !a.restrictions],
    ['Залог', a.pledge ? 'в залоге' : 'не в залоге', !a.pledge],
    ['Работа в такси', a.taxi ? 'да' : 'нет', !a.taxi],
  ];
  const flags = rows.filter(r => !r[2]).length;
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '13px 15px', display: 'flex', alignItems: 'center', gap: 11, borderBottom: '1px solid var(--line-soft)' }}>
        <span style={{ width: 30, height: 30, borderRadius: 8, background: '#d6f0e0', color: '#1f8a52', display: 'grid', placeItems: 'center', flex: 'none', fontWeight: 800, fontSize: 13, fontFamily: 'var(--num)' }}>А</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700 }}>Отчёт Автотеки</div>
          <div className="num" style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 3 }}>VIN {lot.vin || '—'} · от {a.date}</div>
        </div>
        <span className="num" style={{ fontSize: 11, fontWeight: 700, color: flags === 0 ? 'var(--ok)' : 'var(--live)', flex: 'none' }}>{flags === 0 ? '✓ чисто' : `${flags} замеч.`}</span>
      </div>
      <div style={{ padding: '4px 15px' }}>
        {rows.map(([k, v, ok]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--line-soft)' }}>
            <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>{k}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: ok ? 'var(--text)' : 'var(--live)' }}>
              <span style={{ width: 14, height: 14, color: ok ? 'var(--ok)' : 'var(--live)' }}>{ok ? I.check : I.alert}</span>{v}
            </span>
          </div>
        ))}
      </div>
      <div style={{ padding: '12px 15px', display: 'flex', gap: 10, alignItems: 'center', background: 'var(--surface-2)', borderTop: '1px solid var(--line-soft)' }}>
        <span style={{ width: 16, height: 16, color: 'var(--text-faint)', flex: 'none' }}>{I.doc}</span>
        <span style={{ fontSize: 12, color: 'var(--text-dim)', flex: 1 }}>Полный PDF-отчёт</span>
        <span className="num" style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>Открыть →</span>
      </div>
    </div>
  );
}

function StatusBar() {
  return (
    <div className="statusbar">
      <span>9:41</span>
      <span className="sb-icons"><i style={{ width: 17 }}></i></span>
    </div>
  );
}

// status badge (text label, themed by tone)
function StatusBadge({ status, now, lot, onPhoto }) {
  const m = STATUS[status];
  if (!m) return null;
  if (m.tone === 'live') {
    const left = lot ? Math.max(0, lot.endsIn - now) : 0;
    const lbl = (lot && left <= 300) ? 'СКОРО КОНЕЦ' : 'В ЭФИРЕ';
    return <span className="live"><span className="dot"></span>{lbl}</span>;
  }
  const styles = {
    soon:  { color: 'var(--text)', bd: 'var(--line)', bg: 'color-mix(in srgb, var(--bg) 60%, transparent)' },
    ok:    { color: 'var(--win-ink)', bd: 'transparent', bg: 'var(--win)' },
    muted: { color: 'var(--text-dim)', bd: 'var(--line)', bg: 'color-mix(in srgb, var(--bg) 60%, transparent)' },
  }[m.tone];
  return (
    <span className="num" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10.5, fontWeight: 700,
      letterSpacing: '0.04em', textTransform: 'uppercase', color: styles.color, background: styles.bg,
      border: `1px solid ${styles.bd}`, padding: '5px 9px', borderRadius: 7, backdropFilter: 'blur(4px)' }}>
      {m.tone === 'ok' && <span style={{ width: 12, height: 12 }}>{I.check}</span>}
      {m.label}
    </span>
  );
}

// ---- photo with real stock render + fallback placeholder ------------
function Photo({ src, cap, h = 220, style = {}, glyph = 'ФОТО', fit = 'cover', children }) {
  const [ok, setOk] = React.useState(true);
  return (
    <div className="photo" style={{ height: h, ...style }}>
      <span className="glyph">{glyph}</span>
      {src && ok && (
        <img src={src} alt="" onError={() => setOk(false)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: fit, zIndex: 1 }} />
      )}
      <div style={{ position: 'absolute', inset: 0, zIndex: 2 }}>
        {cap && <span className="cap">{cap}</span>}
        {children}
      </div>
    </div>
  );
}

// ---- photo carousel -------------------------------------------------
function Carousel({ src, count = 6, h = 300, glyph = 'ФОТО', radius = 0, style = {} }) {
  const total = Math.max(1, count);
  const slides = Math.min(total, 8); // swipeable frames (1 real + placeholders)
  const [i, setI] = React.useState(0);
  const go = (d, e) => { if (e) e.stopPropagation(); setI(p => (p + d + slides) % slides); };
  const arrow = (side) => ({
    position: 'absolute', top: '50%', [side]: 12, transform: 'translateY(-50%)', zIndex: 4,
    width: 38, height: 38, borderRadius: '50%', border: '1px solid var(--line)',
    background: 'color-mix(in srgb, var(--bg) 55%, transparent)', backdropFilter: 'blur(6px)',
    color: 'var(--text)', font: '300 22px/1 var(--ui)', cursor: 'pointer', display: 'grid', placeItems: 'center',
  });
  return (
    <div style={{ position: 'relative', ...style }}>
      <Photo src={i === 0 ? src : null} h={h} glyph={i === 0 ? glyph : `ФОТО ${i + 1}`} fit="cover"
        cap={`${i + 1} / ${total}`} style={{ borderRadius: radius }} />
      {slides > 1 && (
        <React.Fragment>
          <button style={arrow('left')} onClick={(e) => go(-1, e)}>‹</button>
          <button style={arrow('right')} onClick={(e) => go(1, e)}>›</button>
          <div style={{ position: 'absolute', bottom: 12, left: 0, right: 0, zIndex: 4, display: 'flex', gap: 5, justifyContent: 'center' }}>
            {Array.from({ length: slides }).map((_, k) => (
              <span key={k} style={{ width: k === i ? 16 : 6, height: 6, borderRadius: 3, background: k === i ? 'var(--accent)' : 'color-mix(in srgb, var(--text) 45%, transparent)', transition: 'all .2s ease' }} />
            ))}
          </div>
        </React.Fragment>
      )}
    </div>
  );
}

// ---- scrolling bid list (lot + live merged) -------------------------
function BidList({ lot, max = 8, scroll = false }) {
  const names = ['Вы', 'Участник 77', 'kuznetsov', 'Участник 12', 'avto_msk', 'd.orlov', 'Участник 09', 'm.71', 'sergey_v', 'Участник 33'];
  const times = ['сейчас', '12 сек', '48 сек', '1 мин', '2 мин', '4 мин', '7 мин', '11 мин', '16 мин', '22 мин'];
  const live = STATUS[lot.status] && (STATUS[lot.status].group === 'live');
  const rows = names.slice(0, Math.min(max, lot.bids || max)).map((u, idx) => ({
    u, p: lot.bid - idx * 20000, t: times[idx], me: idx === 0 && live,
  }));
  if (rows.length === 0) return <div className="card" style={{ padding: '22px 16px', textAlign: 'center', color: 'var(--text-faint)', fontSize: 13 }}>Ставок пока нет — будьте первым</div>;
  return (
    <div className="card" style={{ padding: '2px 16px', ...(scroll ? { maxHeight: 256, overflowY: 'auto' } : {}) }}>
      {rows.map((r, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 0', borderBottom: i < rows.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
          <span style={{ width: 30, height: 30, borderRadius: '50%', flex: 'none', background: r.me ? 'var(--accent-glow)' : 'var(--surface-2)', border: '1px solid var(--line)', display: 'grid', placeItems: 'center', font: '700 12px/1 var(--num)', color: r.me ? 'var(--accent)' : 'var(--text-dim)' }}>{r.me ? 'Я' : r.u[0].toUpperCase()}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: r.me ? 700 : 500, color: r.me ? 'var(--accent)' : 'var(--text)' }}>{r.u}</div>
            <div className="num" style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>{r.t}{r.t === 'сейчас' ? '' : ' назад'}</div>
          </div>
          <span className="num" style={{ fontSize: 15, fontWeight: 600 }}>{rub(r.p)}</span>
        </div>
      ))}
    </div>
  );
}

// ---- live bids ticker (homepage) -----------------------------------
function RecentBidsTicker() {
  const liveLots = LOTS.filter(l => l.published && STATUS[l.status] && STATUS[l.status].group === 'live');
  const pool = ['Участник 77', 'kuznetsov', 'avto_msk', 'd.orlov', 'm.71', 'sergey_v', 'Участник 12', 'i.popov'];
  const items = [];
  liveLots.forEach((l, li) => {
    for (let k = 0; k < 3; k++) {
      items.push({ who: pool[(li * 3 + k) % pool.length], car: `${l.make} ${l.model.split(' ')[0]}`, amt: l.bid - k * 20000 });
    }
  });
  if (items.length === 0) return null;
  const Row = ({ it, i }) => (
    <div className="tick-item">
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', flex: 'none' }} />
      <span className="who">{it.who}</span>
      <span className="car">{it.car}</span>
      <span className="amt">{rub(it.amt)}</span>
    </div>
  );
  return (
    <div className="ticker">
      <div className="ticker-label"><span className="dot" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--live)', display: 'inline-block' }}></span>ставки</div>
      <div className="ticker-view">
        <div className="ticker-track">
          {items.map((it, i) => <Row key={'a' + i} it={it} i={i} />)}
          {items.map((it, i) => <Row key={'b' + i} it={it} i={i} />)}
        </div>
      </div>
    </div>
  );
}

// ---- bid input with stepper -----------------------------------------
function BidInput({ value, step, onChange }) {
  const set = (v) => onChange(Math.max(0, v));
  return (
    <div className="bid-input">
      <button className="step" onClick={() => set(value - step)}>−</button>
      <div className="field">
        <input className="num" inputMode="numeric" value={fmt(value)}
          onChange={(e) => { const n = parseInt(e.target.value.replace(/\D/g, ''), 10); set(isNaN(n) ? 0 : n); }} />
        <div className="hint">ваша ставка, ₽</div>
      </div>
      <button className="step" onClick={() => set(value + step)}>+</button>
    </div>
  );
}

// spec tile with icon
function SpecTile({ icon, k, v }) {
  return (
    <div className="card" style={{ padding: '11px 13px', display: 'flex', flexDirection: 'column', gap: 7 }}>
      <span style={{ width: 17, height: 17, color: 'var(--text-faint)' }}>{icon}</span>
      <div>
        <div className="num" style={{ fontSize: 14, fontWeight: 600 }}>{v}</div>
        <div className="eyebrow" style={{ marginTop: 3 }}>{k}</div>
      </div>
    </div>
  );
}

// ---- shared lot card content (identical on web & mobile) ------------
function cardPriceMeta(lot, now) {
  const left = Math.max(0, lot.endsIn - now);
  const startsLeft = Math.max(0, (lot.startsIn || 0) - now);
  if (lot.status === 'live' || lot.status === 'ending') return { pL: 'макс. ставка', p: lot.bid, tL: 'до конца', tV: fmtTime(left), urgent: left <= 300 };
  if (lot.status === 'upcoming') return { pL: 'стартовая цена', p: lot.bid, tL: 'старт', tV: `через ${fmtTime(startsLeft)}` };
  if (lot.status === 'sold') return { pL: 'продан за', p: lot.bid, sold: true, tL: 'завершён', tV: lot.endLabel };
  return { pL: 'макс. ставка', p: lot.bid, tL: 'завершён', tV: lot.endLabel };
}
function ReserveInline({ lot }) {
  if (lot.status === 'sold') return <span className="num" style={{ fontSize: 11, fontWeight: 600, color: 'var(--win)' }}>✓ продан · резерв {fmt(lot.reserve)} ₽</span>;
  return <span className="num" style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-faint)' }}>резерв {fmt(lot.reserve)} ₽ · <span style={{ color: lot.reserveMet ? 'var(--ok)' : 'var(--text-dim)' }}>{lot.reserveMet ? 'взят' : 'не взят'}</span></span>;
}
function LotCardBody({ lot, now }) {
  const m = cardPriceMeta(lot, now);
  return (
    <React.Fragment>
      <Photo src={lot.img} cap={`${lot.photos} фото`} h={182} glyph={lot.make.toUpperCase()} fit="cover">
        <div style={{ position: 'absolute', top: 12, left: 12, right: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <StatusBadge status={lot.status} now={now} lot={lot} />
          <span style={{ width: 31, height: 31, borderRadius: 8, background: 'color-mix(in srgb, var(--bg) 55%, transparent)', border: '1px solid var(--line)', display: 'grid', placeItems: 'center', color: lot.fav ? 'var(--accent)' : 'var(--text-dim)', backdropFilter: 'blur(4px)' }}>
            <span style={{ width: 16, height: 16, display: 'block' }}>{I.bookmark}</span>
          </span>
        </div>
      </Photo>
      <div style={{ padding: '14px 16px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
          <span style={{ font: '700 17px/1.2 var(--ui)', letterSpacing: '-0.01em' }}>{lot.make} {lot.model}</span>
          <span className="num" style={{ fontSize: 12, color: 'var(--text-faint)', flex: 'none' }}>{lot.year}</span>
        </div>
        <div className="num" style={{ display: 'flex', flexWrap: 'wrap', gap: '0 9px', color: 'var(--text-dim)', fontSize: 12.5, marginTop: 8 }}>
          <span>{fmt(lot.mileage)} км</span><span style={{ color: 'var(--line)' }}>·</span>
          <span>{lot.engine}</span><span style={{ color: 'var(--line)' }}>·</span><span>{lot.fuel}</span>
        </div>
        <hr style={{ height: 1, background: 'var(--line-soft)', border: 0, margin: '14px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 5 }}>{m.pL}</div>
            <div className="num" style={{ fontSize: 20, fontWeight: 700, color: m.sold ? 'var(--win)' : 'var(--text)' }}>{rub(m.p)}</div>
            <div style={{ marginTop: 6 }}><ReserveInline lot={lot} /></div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="eyebrow" style={{ marginBottom: 5 }}>{m.tL}</div>
            <span className="num" style={{ fontSize: 14, fontWeight: 600, color: m.urgent ? 'var(--live)' : 'var(--text)', whiteSpace: 'nowrap' }}>{m.tV}</span>
            {lot.bids > 0 && <div className="num" style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 6 }}>{lot.bids} ставок</div>}
          </div>
        </div>
        <div className="num" style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 13, paddingTop: 11, borderTop: '1px dashed var(--line-soft)', fontSize: 11, color: 'var(--text-faint)' }}>
          <span>старт&nbsp;<span style={{ color: 'var(--text-dim)' }}>{lot.startLabel}</span></span>
          <span>оконч.&nbsp;<span style={{ color: 'var(--text-dim)' }}>{lot.endLabel}</span></span>
        </div>
      </div>
    </React.Fragment>
  );
}

// ---- data -----------------------------------------------------------
const LOTS = [
  {
    id: 1, make: 'Mercedes-Benz', family: 'E-Class', model: 'E 300 4MATIC', year: 2022,
    status: 'ending', fav: false, published: true, img: photo('1503376780353-7e6692767b70'),
    bid: 3820000, reserve: 3500000, reserveMet: true, startsIn: 0, endsIn: 252,
    startLabel: 'сегодня, 14:00', endLabel: 'сегодня, 21:00',
    mileage: 42000, engine: '2.0 турбо', power: 258, fuel: 'Бензин', transmission: 'Автомат · 9 ст.',
    drive: 'Полный 4MATIC', body: 'Седан', color: 'Обсидиан чёрный', bids: 27, watchers: 184, photos: 18,
    desc: 'Один владелец, обслуживание у официального дилера. Полный пакет документов, сервисная книжка. Комплектация AMG-Line: панорама, Burmester, адаптивная подвеска. Без участия в ДТП по данным проверки.',
    options: ['Панорама', 'Кожа Nappa', 'Burmester', 'Адаптивный круиз', 'Камеры 360°', 'Подогрев и вентиляция'],
    autoteka: { attached: true, date: '03.06.2026', owners: 1, accidents: 0, restrictions: false, pledge: false, mileageOk: true, taxi: false, summary: 'Чистая история: один владелец, ДТП не зафиксированы, ограничений и залога нет.' },
  },
  {
    id: 2, make: 'BMW', family: 'X3', model: 'X3 xDrive30i', year: 2021,
    status: 'live', fav: true, published: true, img: photo('1555215695-3004980ad54e'),
    bid: 3140000, reserve: 3400000, reserveMet: false, startsIn: 0, endsIn: 1640,
    startLabel: 'сегодня, 15:30', endLabel: 'сегодня, 22:10',
    mileage: 58000, engine: '2.0 турбо', power: 252, fuel: 'Бензин', transmission: 'Автомат · 8 ст.',
    drive: 'Полный xDrive', body: 'SUV', color: 'Альпийский белый', bids: 19, watchers: 122, photos: 22,
    desc: 'Активный круиз, проекция, Harman/Kardon. Зимний пакет. Резина два комплекта. Лёгкие косметические сколы на переднем бампере — отражено в отчёте.',
    options: ['Проекция', 'Harman/Kardon', 'Зимний пакет', 'Электропривод двери', 'Подогрев руля'],
    autoteka: { attached: true, date: '04.06.2026', owners: 2, accidents: 1, restrictions: false, pledge: false, mileageOk: true, taxi: false, summary: 'Одно ДТП (незначительное, передний бампер), пробег подтверждён, ограничений нет.' },
  },
  {
    id: 3, make: 'Audi', family: 'A6', model: 'A6 45 TFSI quattro', year: 2021,
    status: 'upcoming', fav: false, published: false, img: photo('1606152421802-db97b9c7a11b'),
    bid: 2450000, reserve: 2600000, reserveMet: false, startsIn: 5400, endsIn: 12600,
    startLabel: 'сегодня, 18:00', endLabel: 'завтра, 12:00',
    mileage: 61000, engine: '2.0 TFSI', power: 245, fuel: 'Бензин', transmission: 'Робот · 7 ст.',
    drive: 'Полный quattro', body: 'Седан', color: 'Серый дайтона', bids: 0, watchers: 96, photos: 16,
    desc: 'Виртуальная панель, матричные фары, кожа Valcona. Один владелец по ПТС. Все ТО пройдены вовремя.',
    options: ['Matrix LED', 'Virtual Cockpit', 'Кожа Valcona', 'Bang & Olufsen'],
    autoteka: { attached: false },
  },
  {
    id: 4, make: 'Lexus', family: 'RX', model: 'RX 350', year: 2020,
    status: 'ending', fav: true, published: true, img: photo('1568605117036-5fe5e7bab0b7'),
    bid: 4180000, reserve: 3900000, reserveMet: true, startsIn: 0, endsIn: 95,
    startLabel: 'сегодня, 13:00', endLabel: 'сегодня, 20:30',
    mileage: 73000, engine: '3.5 V6', power: 300, fuel: 'Бензин', transmission: 'Автомат · 8 ст.',
    drive: 'Полный', body: 'SUV', color: 'Серебро', bids: 31, watchers: 210, photos: 20,
    desc: 'Mark Levinson, вентиляция сидений, head-up. Максимальная комплектация Executive. Идеальное состояние салона.',
    options: ['Mark Levinson', 'Head-up', 'Вентиляция сидений', 'Люк'],
    autoteka: { attached: true, date: '01.06.2026', owners: 2, accidents: 0, restrictions: false, pledge: false, mileageOk: true, taxi: false, summary: 'Без ДТП, два владельца, пробег и документы в порядке.' },
  },
  {
    id: 5, make: 'Porsche', family: '911', model: '911 Carrera', year: 2019,
    status: 'sold', fav: false, published: true, img: photo('1605559424843-9e4c228bf1c2'),
    bid: 6250000, reserve: 5800000, reserveMet: true, startsIn: 0, endsIn: 0,
    startLabel: 'вчера, 12:00', endLabel: 'вчера, 19:00',
    mileage: 38000, engine: '3.0 турбо', power: 385, fuel: 'Бензин', transmission: 'PDK · 8 ст.',
    drive: 'Задний', body: 'Купе', color: 'Гоночный жёлтый', bids: 41, watchers: 356, photos: 24,
    desc: 'Sport Chrono, спортивный выхлоп, керамика. Полная история обслуживания Porsche. Продан выше резерва.',
    options: ['Sport Chrono', 'Керамика', 'Спорт-выхлоп', 'Ковши'],
    autoteka: { attached: true, date: '30.05.2026', owners: 1, accidents: 0, restrictions: false, pledge: false, mileageOk: true, taxi: false, summary: 'Идеальная история, один владелец, полное сервисное сопровождение Porsche.' },
  },
  {
    id: 6, make: 'Toyota', family: 'Camry', model: 'Camry 2.5', year: 2021,
    status: 'finished', fav: false, published: true, img: photo('1494976388531-d1058494cdd8'),
    bid: 1780000, reserve: 2100000, reserveMet: false, startsIn: 0, endsIn: 0,
    startLabel: '2 июня, 11:00', endLabel: '2 июня, 18:00',
    mileage: 88000, engine: '2.5', power: 200, fuel: 'Бензин', transmission: 'Автомат · 8 ст.',
    drive: 'Передний', body: 'Седан', color: 'Чёрный', bids: 12, watchers: 74, photos: 14,
    desc: 'Один владелец, такси не работала. Резерв не достигнут — лот можно перевыставить.',
    options: ['Кожа', 'Камера', 'Климат'],
    autoteka: { attached: true, date: '01.06.2026', owners: 3, accidents: 2, restrictions: true, pledge: false, mileageOk: false, taxi: true, summary: 'Три владельца, два ДТП, есть ограничение ГИБДД, расхождение по пробегу. Использовалась в такси.' },
  },
];

Object.assign(window, { fmt, rub, fmtTime, participantsOf, FEE_RATE, fee, feePct, photo, STATUS, I, StatusBar, StatusBadge, HermesMark, HermesH, HermesLogo, Photo, Carousel, BidList, RecentBidsTicker, BidInput, SpecTile, LotCardBody, AutotekaReport, LOTS });
