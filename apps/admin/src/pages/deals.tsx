import { useNavigate } from 'react-router-dom';
import { fmt } from '@hermes/shared';
import { useDeals, type AdminDeal } from '../lib/queries';

export const DEAL_STATUS: Record<AdminDeal['status'], [string, string]> = {
  pending: ['Ждёт менеджера', 'up'],
  contract: ['Оформление договора', 'live'],
  closed: ['Сделка закрыта', 'sold'],
};

export function DealsPage() {
  const navigate = useNavigate();
  const { data: deals = [] } = useDeals();
  const feeRate = deals[0]?.feeRate;
  const feeHead = feeRate ? `Комиссия ${(feeRate * 100).toLocaleString('ru-RU')}%` : 'Комиссия';
  return (
    <div className="content fade">
      <div className="pcard">
        <div className="ph"><div><h3>Сделки после победы</h3><div className="sub">сопровождение выигранных лотов · контакты победителя</div></div></div>
        <table className="tb">
          <thead><tr><th>Автомобиль</th><th>Победитель</th><th>Цена</th><th>{feeHead}</th><th>К оплате</th><th>Статус</th><th></th></tr></thead>
          <tbody>
            {deals.length === 0 ? (
              <tr><td className="empty" colSpan={7}>Сделок пока нет</td></tr>
            ) : (
              deals.map((d) => (
                <tr className="row" key={d.id}>
                  <td>
                    <div className="lotcell">
                      <div className="ph-img">{d.photo && <img src={d.photo} alt="" />}</div>
                      <div>
                        <div className="nm">{d.lotTitle}</div>
                        <div className="meta">лот #{d.lotId.slice(0, 6)}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{d.winner.name}</div>
                    <div className="num" style={{ fontSize: 11.5, color: 'var(--faint)', marginTop: 4 }}>{d.winner.phone ?? '—'}</div>
                  </td>
                  <td className="num" style={{ fontWeight: 600 }}>{fmt(d.amount)} ₽</td>
                  <td className="num" style={{ color: 'var(--gold)' }}>{fmt(d.feeAmount)} ₽</td>
                  <td className="num" style={{ fontWeight: 600 }}>{fmt(d.amount + d.feeAmount)} ₽</td>
                  <td><span className={`sb ${DEAL_STATUS[d.status][1]}`}>{DEAL_STATUS[d.status][0]}</span></td>
                  <td>
                    <div className="row-actions">
                      <button className="btn sm" onClick={() => navigate(`/deals/${d.id}`)}>Открыть</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
