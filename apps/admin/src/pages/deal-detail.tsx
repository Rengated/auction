import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fmt } from '@hermes/shared';
import { AI, Ic } from '../components/icons';
import { useToast } from '../components/toast';
import { useDeal, usePatchDeal, type AdminDeal } from '../lib/queries';
import { DEAL_STATUS } from './deals';

const STATUS_ORDER: AdminDeal['status'][] = ['in_progress', 'completed', 'cancelled'];

export function DealDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: deal } = useDeal(id);
  const patch = usePatchDeal(id ?? '');
  const toast = useToast();

  const [note, setNote] = useState('');
  useEffect(() => {
    if (deal) setNote(deal.note);
  }, [deal?.id]);

  if (!deal) return <div className="content fade" />;

  const wonAt = new Date(deal.createdAt).toLocaleString('ru-RU');
  const [statusLabel, statusCls] = DEAL_STATUS[deal.status];

  return (
    <div className="content fade">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
        <button className="iconbtn2" onClick={() => navigate('/deals')} style={{ width: 38, height: 38 }}>{AI.back}</button>
        <div>
          <div className="crumb">Сделки / Лот #{deal.lotId.slice(0, 6)}</div>
          <h1 style={{ font: '800 22px/1 var(--ui)', margin: 0, letterSpacing: '-0.02em' }}>{deal.lotTitle}</h1>
        </div>
        <span className={`sb ${statusCls}`} style={{ marginLeft: 10 }}>{statusLabel}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* winner contacts */}
          <div className="pcard">
            <div className="ph"><div><h3>Контакты победителя</h3><div className="sub">для связи и оформления</div></div></div>
            <div style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--panel3)', display: 'grid', placeItems: 'center', font: '700 21px/1 var(--num)', color: 'var(--accent)', flex: 'none' }}>
                {deal.winner.name[0]}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ font: '700 17px/1 var(--ui)' }}>{deal.winner.name}</div>
                <div className="num" style={{ fontSize: 12.5, color: 'var(--dim)', marginTop: 7 }}>
                  выиграл {wonAt}
                </div>
              </div>
            </div>
            <div style={{ padding: '0 20px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {deal.winner.phone && (
                <a href={`tel:${deal.winner.phone.replace(/\s/g, '')}`} className="btn" style={{ justifyContent: 'flex-start', textDecoration: 'none' }}>
                  <Ic d={AI.phone} s={16} /> {deal.winner.phone}
                </a>
              )}
              {deal.winner.email && (
                <a href={`mailto:${deal.winner.email}`} className="btn" style={{ justifyContent: 'flex-start', textDecoration: 'none' }}>
                  <Ic d={AI.mail} s={16} /> {deal.winner.email}
                </a>
              )}
            </div>
          </div>

          {/* deal status */}
          <div className="pcard">
            <div className="ph"><div><h3>Статус сделки</h3><div className="sub">сопровождение менеджером</div></div></div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {STATUS_ORDER.map((s) => {
                  const active = deal.status === s;
                  const color = s === 'in_progress' ? 'var(--gold)' : s === 'completed' ? 'var(--ok)' : 'var(--dim)';
                  const soft = s === 'in_progress' ? 'var(--gold-soft)' : s === 'completed' ? 'var(--ok-soft)' : 'var(--panel3)';
                  return (
                    <button
                      key={s}
                      className="btn sm"
                      disabled={patch.isPending}
                      onClick={() => !active && patch.mutate({ status: s }, { onSuccess: () => toast.ok('Статус сделки обновлён'), onError: (e) => toast.error(`Не удалось обновить статус: ${e.message}`) })}
                      style={{
                        flex: 1,
                        justifyContent: 'center',
                        ...(active
                          ? { background: soft, color }
                          : { background: 'transparent', border: '1px solid var(--line2)' }),
                      }}
                    >
                      {DEAL_STATUS[s][0]}
                    </button>
                  );
                })}
              </div>
              <div className="hint" style={{ margin: 0 }}>
                {deal.status === 'completed' && deal.closedAt
                  ? `Сделка завершена ${new Date(deal.closedAt).toLocaleString('ru-RU')}.`
                  : deal.status === 'cancelled'
                    ? 'Сделка отменена — покупатель уведомлён.'
                    : 'Сделка в работе: связь с победителем, договор, оплата, выдача.'}
              </div>
            </div>
          </div>
        </div>

        {/* money + car */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="pcard">
            {deal.photo && <img src={deal.photo} alt="" style={{ width: '100%', height: 170, objectFit: 'cover', display: 'block' }} />}
            <div style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="l" style={{ font: '600 10px/1 var(--num)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--faint)' }}>Расчёт сделки</div>
                <button className="btn sm" onClick={() => navigate(`/lots/${deal.lotId}/edit`)}>Лот</button>
              </div>
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 11 }}>
                <div className="num" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--dim)' }}>
                  <span>цена победы</span><span>{fmt(deal.amount)} ₽</span>
                </div>
                <div className="num" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--dim)' }}>
                  <span>комиссия {(deal.feeRate * 100).toLocaleString('ru-RU')}%</span>
                  <span style={{ color: 'var(--gold)' }}>{fmt(deal.feeAmount)} ₽</span>
                </div>
                <div className="num" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 17, fontWeight: 700, paddingTop: 11, borderTop: '1px dashed var(--line2)' }}>
                  <span>к оплате</span><span>{fmt(deal.amount + deal.feeAmount)} ₽</span>
                </div>
              </div>
            </div>
          </div>
          <div className="pcard">
            <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label className="fld-l" style={{ margin: 0 }}>Заметка по сделке</label>
              <textarea className="in" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Договорённости, сроки, особенности оплаты…" style={{ minHeight: 90 }}></textarea>
              <button className="btn sm" disabled={patch.isPending} onClick={() => patch.mutate({ note }, { onSuccess: () => toast.ok('Заметка сохранена'), onError: (e) => toast.error(`Не удалось сохранить: ${e.message}`) })}>Сохранить заметку</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
