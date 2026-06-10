import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fmt } from '@hermes/shared';
import { useAdminLots, usePublishLot, type AdminLotsFilter } from '../lib/queries';
import { AI, Ic, Sb } from '../components/icons';

const TABS: Array<[AdminLotsFilter, string]> = [
  ['all', 'Все'],
  ['live', 'В эфире'],
  ['soon', 'Ожидают'],
  ['done', 'Завершены'],
  ['draft', 'Черновики'],
];

export function LotsPage() {
  const navigate = useNavigate();
  const [f, setF] = useState<AdminLotsFilter>('all');
  const { data: lots = [] } = useAdminLots(f);
  const { data: drafts } = useAdminLots('draft');
  const publish = usePublishLot();
  const draftCount = drafts?.length ?? 0;

  return (
    <div className="content fade">
      <div className="pcard">
        <div className="ph">
          <div style={{ display: 'flex', gap: 7 }}>
            {TABS.map(([k, l]) => (
              <button
                key={k}
                className="btn sm"
                onClick={() => setF(k)}
                style={f === k ? { background: 'var(--accent-soft)', color: 'var(--accent)' } : { background: 'transparent', border: '1px solid var(--line2)' }}
              >
                {l}{k === 'draft' && draftCount ? ` · ${draftCount}` : ''}
              </button>
            ))}
          </div>
          <button className="btn acc sm" onClick={() => navigate('/lots/new')}><Ic d={AI.plus} s={16} /> Добавить лот</button>
        </div>
        <table className="tb">
          <thead><tr><th>Лот</th><th>Публикация</th><th>Статус</th><th>Стартовая</th><th>Текущая</th><th>Резерв</th><th></th></tr></thead>
          <tbody>
            {lots.map((l) => (
              <tr className="row" key={l.id} style={!l.published ? { background: 'color-mix(in srgb, var(--gold) 7%, transparent)' } : undefined}>
                <td>
                  <div className="lotcell">
                    <div className="ph-img">{l.photos[0]?.card ? <img src={l.photos[0].card} alt="" /> : null}</div>
                    <div>
                      <div className="nm">{l.make} {l.model}</div>
                      <div className="meta">#{l.id.slice(0, 6).toUpperCase()} · {fmt(l.mileage)} км</div>
                    </div>
                  </div>
                </td>
                <td>
                  {l.published
                    ? <span className="sb sold"><span className="dot"></span> опубликован</span>
                    : <span className="sb" style={{ background: 'var(--gold-soft)', color: 'var(--gold)' }}>черновик</span>}
                </td>
                <td><Sb s={l.published ? l.status : 'draft'} /></td>
                <td className="num" style={{ color: 'var(--dim)' }}>{fmt(l.startPrice)} ₽</td>
                <td className="num" style={{ fontWeight: 600 }}>{fmt(l.currentPrice)} ₽</td>
                <td className="num">{fmt(l.reservePrice)} ₽</td>
                <td>
                  <div className="row-actions">
                    {!l.published && (
                      <button className="btn sm" disabled={publish.isPending} onClick={() => publish.mutate(l.id)}>Опубликовать</button>
                    )}
                    {l.status === 'live' && (
                      <button className="iconbtn2" title="Контроль торга" onClick={() => navigate(`/auctions/${l.id}`)}>{AI.gavel}</button>
                    )}
                    {(l.status === 'finished' || l.status === 'withdrawn') && (
                      <button
                        className="iconbtn2"
                        title="Перевыставить лот"
                        onClick={() => navigate(`/lots/${l.id}/relist`)}
                        style={{ color: 'var(--accent)', borderColor: 'color-mix(in srgb, var(--accent) 40%, var(--line2))' }}
                      >
                        {AI.relist}
                      </button>
                    )}
                    <button className="iconbtn2" title="Редактировать" onClick={() => navigate(`/lots/${l.id}/edit`)}>{AI.edit}</button>
                  </div>
                </td>
              </tr>
            ))}
            {lots.length === 0 && (
              <tr><td className="empty" colSpan={7}>Нет лотов</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
