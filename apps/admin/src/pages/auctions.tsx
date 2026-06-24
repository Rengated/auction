import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { fmt, fmtTime } from '@hermes/shared';
import { AI, Ic } from '../components/icons';
import { useAdminLots, useAuctionAction, type AdminLot } from '../lib/queries';
import { leftSec, useNow } from '../lib/time';

const partsOf = (l: AdminLot) => l.participantsCount;
const cell: CSSProperties ={ font: '600 9.5px/1 var(--num)', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--faint)' };

function LiveCard({ lot }: { lot: AdminLot }) {
  const navigate = useNavigate();
  const now = useNow();
  const action = useAuctionAction(lot.id);
  const left = leftSec(lot.endsAt, now);
  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', gap: 12, padding: 14, alignItems: 'center' }}>
        <div className="ph-img" style={{ width: 76, height: 56 }}>{lot.photos[0] && <img src={lot.photos[0].card} alt="" />}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="nm" style={{ font: '700 14px/1.2 var(--ui)' }}>{lot.make} {lot.model}</div>
          <div className="num" style={{ fontSize: 11.5, color: 'var(--faint)', marginTop: 5 }}>
            #{lot.id.slice(0, 6)} · {lot.bidCount} ставок · {partsOf(lot)} участн.
          </div>
        </div>
        <span className="sb live"><span className="dot"></span>{left <= 120 ? 'ФИНАЛ' : 'ЭФИР'}</span>
      </div>
      <div style={{ display: 'flex', borderTop: '1px solid var(--line)' }}>
        <div style={{ flex: 1, padding: '11px 14px', borderRight: '1px solid var(--line)' }}>
          <div className="l" style={cell}>Ставка</div>
          <div className="num" style={{ fontWeight: 700, marginTop: 6 }}>{fmt(lot.currentPrice)} ₽</div>
        </div>
        <div style={{ flex: 1, padding: '11px 14px', borderRight: '1px solid var(--line)' }}>
          <div className="l" style={cell}>Резерв</div>
          <div className="num" style={{ fontWeight: 700, marginTop: 6, color: lot.reserveMet ? 'var(--ok)' : 'var(--dim)' }}>
            {lot.reserveMet ? '✓' : `${fmt(lot.reservePrice)} ₽`}
          </div>
        </div>
        <div style={{ flex: 1, padding: '11px 14px' }}>
          <div className="l" style={cell}>Финал</div>
          <div className="num" style={{ fontWeight: 700, marginTop: 6, color: left <= 120 ? 'var(--live)' : 'var(--ink)' }}>{fmtTime(left)}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid var(--line)', background: 'var(--panel2)' }}>
        <button
          className="btn sm"
          style={{ flex: 1, justifyContent: 'center' }}
          disabled={action.isPending}
          onClick={() => action.mutate({ action: 'extend', seconds: 60 })}
        >
          <Ic d={AI.plusclock} s={14} /> +60 сек
        </button>
        <button className="btn sm acc" style={{ flex: 1, justifyContent: 'center' }} onClick={() => navigate(`/auctions/${lot.id}`)}>
          Открыть торг
        </button>
      </div>
    </div>
  );
}

function UpcomingRow({ lot }: { lot: AdminLot }) {
  const action = useAuctionAction(lot.id);
  return (
    <tr className="row">
      <td>
        <div className="lotcell">
          <div className="ph-img">{lot.photos[0] && <img src={lot.photos[0].card} alt="" />}</div>
          <div>
            <div className="nm">{lot.make} {lot.model}</div>
            <div className="meta">#{lot.id.slice(0, 6)}</div>
          </div>
        </div>
      </td>
      <td data-label="Старт" className="num" style={{ color: 'var(--gold)', fontWeight: 600 }}>{new Date(lot.startsAt).toLocaleString('ru-RU')}</td>
      <td data-label="Окончание" className="num" style={{ color: 'var(--dim)' }}>{new Date(lot.endsAt).toLocaleString('ru-RU')}</td>
      <td data-label="Стартовая" className="num" style={{ color: 'var(--dim)' }}>{fmt(lot.startPrice)} ₽</td>
      <td data-label="Резерв" className="num">{fmt(lot.reservePrice)} ₽</td>
      <td>
        <div className="row-actions">
          <button className="btn sm" disabled={action.isPending} onClick={() => action.mutate({ action: 'start-now' })}>
            Запустить сейчас
          </button>
        </div>
      </td>
    </tr>
  );
}

export function AuctionsPage() {
  const navigate = useNavigate();
  const { data: livePage } = useAdminLots('live');
  const { data: soonPage } = useAdminLots('soon');
  const live = livePage?.items ?? [];
  const upcoming = soonPage?.items ?? [];
  return (
    <div className="content fade">
      {/* live auctions as control cards */}
      <div className="pcard" style={{ marginBottom: 20 }}>
        <div className="ph">
          <div><h3>Идут прямо сейчас · {live.length}</h3><div className="sub">панель быстрого контроля торгов</div></div>
          <button className="btn acc sm" onClick={() => navigate('/lots/new')}><Ic d={AI.plus} s={16} /> Добавить лот</button>
        </div>
        {live.length === 0 ? (
          <div className="empty" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--faint)' }}>Сейчас нет живых торгов</div>
        ) : (
          <div style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {live.map((l) => <LiveCard key={l.id} lot={l} />)}
          </div>
        )}
      </div>

      {/* upcoming queue */}
      <div className="pcard">
        <div className="ph"><div><h3>Очередь стартов · {upcoming.length}</h3><div className="sub">запланированные торги</div></div></div>
        <table className="tb">
          <thead><tr><th>Лот</th><th>Старт</th><th>Окончание</th><th>Стартовая</th><th>Резерв</th><th></th></tr></thead>
          <tbody>
            {upcoming.length === 0 ? (
              <tr><td className="empty" colSpan={6}>Запланированных торгов нет</td></tr>
            ) : (
              upcoming.map((l) => <UpcomingRow key={l.id} lot={l} />)
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
