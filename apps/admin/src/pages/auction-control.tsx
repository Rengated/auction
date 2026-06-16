import { useEffect, useState, type CSSProperties } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fmt, fmtTime } from '@hermes/shared';
import { AI, Ic, Sb } from '../components/icons';
import { useAdminFeed, useAdminLot, useAuctionAction, useParticipants, useSettings } from '../lib/queries';
import { leftSec, useNow } from '../lib/time';
import { useLotRoom } from '../lib/ws';

const lbl: CSSProperties = { font: '600 11px/1 var(--num)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--faint)' };

function rel(iso: string, now: number): string {
  const s = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (s < 5) return 'сейчас';
  if (s < 60) return `${s} сек`;
  if (s < 3600) return `${Math.floor(s / 60)} мин`;
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

export function AuctionControlPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const now = useNow();
  useLotRoom(id);
  const { data: lot } = useAdminLot(id);
  const { data: feed = [] } = useAdminFeed(id);
  const { data: parts = [] } = useParticipants(id);
  const { data: settings } = useSettings();
  const action = useAuctionAction(id ?? '');

  const [stepInput, setStepInput] = useState('');
  const [extendMin, setExtendMin] = useState('');
  useEffect(() => {
    if (lot) setStepInput(String(lot.lotBidStep ?? lot.bidStep));
  }, [lot?.id, lot?.lotBidStep, lot?.bidStep]);

  if (!lot) return <div className="content fade" />;

  const left = leftSec(lot.endsAt, now);
  const isLive = lot.status === 'live';
  const participants = Math.max(1, Math.round(lot.bidCount * 0.6));
  const busy = action.isPending;

  return (
    <div className="content fade">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
        <button className="iconbtn2" onClick={() => navigate('/auctions')} style={{ width: 38, height: 38 }}>{AI.back}</button>
        <div>
          <div className="crumb">Торги / Контроль</div>
          <h1 style={{ font: '800 22px/1 var(--ui)', margin: 0, letterSpacing: '-0.02em' }}>{lot.make} {lot.model}</h1>
        </div>
        <span style={{ marginLeft: 12 }}><Sb s={lot.status} /></span>
      </div>

      {lot.status === 'finished' && !lot.reserveMet && lot.bidCount > 0 && (
        <div
          className="pcard"
          style={{ marginBottom: 20, padding: '14px 18px', borderLeft: '3px solid var(--gold)', display: 'flex', alignItems: 'center', gap: 12 }}
        >
          <span style={{ width: 22, height: 22, color: 'var(--gold)', flex: 'none' }}>{AI.users}</span>
          <div style={{ font: '600 13.5px/1.45 var(--ui)' }}>
            Резерв не достигнут — лот не продан автоматически. Лучшая ставка {fmt(lot.currentPrice)} ₽.
            Свяжитесь с участниками ниже, чтобы договориться о продаже.
          </div>
        </div>
      )}

      <div className="lc-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="pcard">
            <div className="metrics4" style={{ padding: 24, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 20 }}>
              <div>
                <div className="l" style={lbl}>Текущая ставка</div>
                <div className="num" style={{ font: '700 26px/1 var(--num)', marginTop: 12 }}>{fmt(lot.currentPrice)} ₽</div>
              </div>
              <div>
                <div className="l" style={lbl}>Резерв</div>
                <div className="num" style={{ font: '700 26px/1 var(--num)', marginTop: 12, color: lot.reserveMet ? 'var(--ok)' : 'var(--dim)' }}>{fmt(lot.reservePrice)} ₽</div>
                <div style={{ font: '600 11px/1 var(--num)', color: lot.reserveMet ? 'var(--ok)' : 'var(--faint)', marginTop: 9 }}>
                  {lot.reserveMet ? '✓ достигнут' : 'не достигнут'}
                </div>
              </div>
              <div>
                <div className="l" style={lbl}>Ставок · участн.</div>
                <div className="num" style={{ font: '700 26px/1 var(--num)', marginTop: 12 }}>{lot.bidCount} · {participants}</div>
              </div>
              <div>
                <div className="l" style={lbl}>До конца</div>
                <div className="bigtimer" style={{ font: '700 32px/1 var(--num)', marginTop: 8, color: left <= 120 ? 'var(--live)' : 'var(--ink)' }}>
                  {fmtTime(left)}
                </div>
              </div>
            </div>
          </div>

          {isLive ? (
            <div className="pcard">
              <div className="ph"><div><h3>Управление торгом</h3><div className="sub">ручной контроль менеджера</div></div></div>
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="fld-l">Управление таймером</label>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button className="btn" disabled={busy} onClick={() => action.mutate({ action: 'extend', seconds: 30 })}>
                      <Ic d={AI.plusclock} s={16} /> +30 сек
                    </button>
                    <button className="btn" disabled={busy} onClick={() => action.mutate({ action: 'extend', seconds: 60 })}>
                      <Ic d={AI.plusclock} s={16} /> +60 сек
                    </button>
                    <button
                      className="btn"
                      disabled={busy}
                      onClick={() => window.confirm('Закрыть торг досрочно? Победителем станет текущий лидер.') && action.mutate({ action: 'close-early' })}
                    >
                      Закрыть досрочно
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 10 }}>
                    <input
                      className="in num"
                      type="number"
                      min={1}
                      max={60}
                      value={extendMin}
                      onChange={(e) => setExtendMin(e.target.value)}
                      placeholder="минут"
                      style={{ maxWidth: 110 }}
                    />
                    <button
                      className="btn sm"
                      disabled={busy || !(Number(extendMin) >= 1)}
                      onClick={() => {
                        const sec = Math.round(Number(extendMin) * 60);
                        if (sec >= 5 && sec <= 3600) {
                          action.mutate({ action: 'extend', seconds: sec });
                          setExtendMin('');
                        }
                      }}
                    >
                      Продлить на N минут
                    </button>
                    <span className="hint" style={{ margin: 0 }}>от 1 до 60 мин</span>
                  </div>
                </div>
                <div style={{ height: 1, background: 'var(--line)' }}></div>
                <div>
                  <label className="fld-l">Изменить шаг ставки</label>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <input className="in num" value={stepInput} onChange={(e) => setStepInput(e.target.value)} style={{ maxWidth: 160 }} />
                    <button
                      className="btn sm"
                      disabled={busy || !Number(stepInput.replace(/\s/g, ''))}
                      onClick={() => action.mutate({ action: 'step', step: Number(stepInput.replace(/\s/g, '')) })}
                    >
                      Применить
                    </button>
                    <span className="hint" style={{ margin: 0 }}>текущий шаг: {fmt(lot.lotBidStep ?? lot.bidStep)} ₽</span>
                  </div>
                </div>
                <div style={{ height: 1, background: 'var(--line)' }}></div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    className="btn"
                    disabled={busy || lot.bidCount === 0}
                    onClick={() => window.confirm('Отклонить последнюю ставку?') && action.mutate({ action: 'reject-last-bid' })}
                  >
                    Отклонить последнюю ставку
                  </button>
                  <button
                    className="btn danger"
                    disabled={busy}
                    onClick={() => window.confirm('Снять лот с торгов? Все ставки будут аннулированы.') && action.mutate({ action: 'withdraw' })}
                  >
                    <Ic d={AI.trash} s={16} /> Снять с торгов
                  </button>
                </div>
                <div className="hint" style={{ display: 'flex', gap: 9, alignItems: 'center', marginTop: 2 }}>
                  <span style={{ width: 14, height: 14, color: 'var(--gold)', flex: 'none', display: 'inline-flex' }}>{AI.clock}</span>
                  {settings?.antisnipeEnabled
                    ? `Антиснайпинг активен: ставка в последние ${settings.antisnipeWindowSec} сек продлевает торги автоматически.`
                    : 'Антиснайпинг выключен.'}
                </div>
              </div>
            </div>
          ) : (
            <div className="pcard">
              <div style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
                <Sb s={lot.status} />
                <span className="hint" style={{ margin: 0 }}>Торг не в эфире — управление недоступно.</span>
              </div>
            </div>
          )}

          {/* participants */}
          <div className="pcard">
            <div className="ph"><div><h3>Участники торга</h3><div className="sub">{parts.length} активных · с контактами</div></div></div>
            <table className="tb">
              <thead><tr><th>Участник</th><th>Телефон</th><th>Макс. ставка</th><th></th></tr></thead>
              <tbody>
                {parts.length === 0 ? (
                  <tr><td className="empty" colSpan={4}>Пока нет участников</td></tr>
                ) : (
                  parts.map((p) => (
                    <tr className="row" key={p.userId}>
                      <td>
                        <div className="lotcell">
                          <div style={{ width: 30, height: 30, borderRadius: '50%', background: p.isLeader ? 'var(--accent-soft)' : 'var(--panel3)', display: 'grid', placeItems: 'center', font: '700 12px/1 var(--num)', color: p.isLeader ? 'var(--accent)' : 'var(--dim)', flex: 'none' }}>
                            {p.name[0]}
                          </div>
                          <div className="nm" style={{ font: '600 13px/1 var(--ui)' }}>
                            {p.name}
                            {p.isLeader && <span className="num" style={{ fontSize: 10, color: 'var(--accent)', marginLeft: 7 }}>ЛИДЕР</span>}
                          </div>
                        </div>
                      </td>
                      <td className="num" style={{ color: 'var(--dim)' }}>
                        {p.phone ?? '—'}
                        {p.email && <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 3 }}>{p.email}</div>}
                      </td>
                      <td className="num" style={{ fontWeight: 600 }}>{fmt(p.maxBid)} ₽</td>
                      <td>
                        <div className="row-actions">
                          {p.phone && (
                            <a className="iconbtn2" title="Позвонить" href={`tel:${p.phone.replace(/\s/g, '')}`} style={{ textDecoration: 'none' }}>
                              {AI.phone}
                            </a>
                          )}
                          {p.email && (
                            <a className="iconbtn2" title="Написать на почту" href={`mailto:${p.email}`} style={{ textDecoration: 'none' }}>
                              {AI.mail}
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="pcard" style={{ position: 'sticky', top: 24 }}>
          <div className="ph">
            <div><h3>Лента ставок</h3><div className="sub">{isLive ? 'live · ' : ''}{lot.bidCount} ставок</div></div>
            {isLive && <span className="sb live"><span className="dot"></span>live</span>}
          </div>
          <div style={{ padding: '4px 20px 14px', maxHeight: 420, overflowY: 'auto' }}>
            {feed.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--faint)', fontSize: 13 }}>Ставок пока нет</div>
            ) : (
              feed.map((r, i) => (
                <div className="feedrow" key={r.id} style={{ opacity: Math.max(0.4, 1 - i * 0.1) }}>
                  <div className="av">{r.name[0]}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ font: '600 13.5px/1.2 var(--ui)' }}>{r.name}</div>
                    <div className="num" style={{ fontSize: 11, color: 'var(--faint)', marginTop: 3 }}>{rel(r.createdAt, now)}</div>
                  </div>
                  <div className="num" style={{ fontWeight: 600 }}>{fmt(r.amount)} ₽</div>
                  {isLive && (
                    <button
                      className="iconbtn2"
                      title="Отклонить ставку"
                      disabled={busy}
                      onClick={() =>
                        window.confirm(`Отклонить ставку ${fmt(r.amount)} ₽ от ${r.name}?`) &&
                        action.mutate({ action: 'reject-bid', bidId: r.id })
                      }
                      style={{ width: 26, height: 26, marginLeft: 8, color: 'var(--live)' }}
                    >
                      <Ic d={AI.ban} s={13} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
