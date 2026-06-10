import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fmt } from '@hermes/shared';
import { AI, Ic } from '../components/icons';
import { useDeal, usePatchDeal, type AdminDeal } from '../lib/queries';
import { DEAL_STATUS } from './deals';

const NEXT_STATUS: Record<AdminDeal['status'], AdminDeal['status']> = {
  pending: 'contract',
  contract: 'closed',
  closed: 'closed',
};

export function DealDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: deal } = useDeal(id);
  const patch = usePatchDeal(id ?? '');

  const [note, setNote] = useState('');
  useEffect(() => {
    if (deal) setNote(deal.note);
  }, [deal?.id]);

  if (!deal) return <div className="content fade" />;

  const wonAt = new Date(deal.createdAt).toLocaleString('ru-RU');
  const steps: Array<[string, string, boolean]> = [
    ['Лот выигран', wonAt, true],
    ['Связь с победителем', 'менеджер запросил контакты', deal.status !== 'pending'],
    ['Оформление договора', 'подписание и оплата', deal.status === 'contract' || deal.status === 'closed'],
    ['Выдача / доставка', 'передача автомобиля', deal.status === 'closed'],
  ];
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
                  {deal.winner.city ?? '—'} · выиграл {wonAt}
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

          {/* deal progress */}
          <div className="pcard">
            <div className="ph"><div><h3>Ход сделки</h3><div className="sub">этапы сопровождения</div></div></div>
            <div style={{ padding: '18px 20px' }}>
              {steps.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 14, paddingBottom: i < steps.length - 1 ? 18 : 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 'none' }}>
                    <span style={{ width: 26, height: 26, borderRadius: '50%', background: s[2] ? 'var(--ok)' : 'var(--panel3)', color: s[2] ? '#fff' : 'var(--faint)', display: 'grid', placeItems: 'center', flex: 'none' }}>
                      <span style={{ width: 14, height: 14 }}>{s[2] ? AI.check : null}</span>
                    </span>
                    {i < steps.length - 1 && <span style={{ width: 2, flex: 1, minHeight: 22, background: 'var(--line)', marginTop: 4 }}></span>}
                  </div>
                  <div>
                    <div style={{ font: '600 14px/1.3 var(--ui)', color: s[2] ? 'var(--ink)' : 'var(--dim)' }}>{s[0]}</div>
                    <div className="num" style={{ fontSize: 12, color: 'var(--faint)', marginTop: 5 }}>{s[1]}</div>
                  </div>
                </div>
              ))}
            </div>
            {deal.status !== 'closed' && (
              <div style={{ padding: '0 20px 20px', display: 'flex', gap: 10 }}>
                <button className="btn acc" disabled={patch.isPending} onClick={() => patch.mutate({ status: NEXT_STATUS[deal.status] })}>
                  Перевести на след. этап
                </button>
              </div>
            )}
          </div>
        </div>

        {/* money + car */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="pcard">
            {deal.photo && <img src={deal.photo} alt="" style={{ width: '100%', height: 170, objectFit: 'cover', display: 'block' }} />}
            <div style={{ padding: 20 }}>
              <div className="l" style={{ font: '600 10px/1 var(--num)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--faint)' }}>Расчёт сделки</div>
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
              <button className="btn sm" disabled={patch.isPending} onClick={() => patch.mutate({ note })}>Сохранить заметку</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
