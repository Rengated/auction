import { useNavigate } from 'react-router-dom';
import { fmt, fmtTime } from '@hermes/shared';
import { useAdminLots, useDashboard } from '../lib/queries';
import { leftSec, useNow } from '../lib/time';
import { AI, Ic, Sb } from '../components/icons';

const DOT_COLORS: Record<string, string> = {
  bid: 'var(--live)',
  closed: 'var(--ok)',
  sold: 'var(--ok)',
  opened: 'var(--accent)',
  extended: 'var(--gold)',
};

/** Относительное время от ISO-даты: «сейчас», «N сек», «N мин», «N ч». */
function ago(at: string, now: number): string {
  const s = Math.max(0, Math.floor((now - new Date(at).getTime()) / 1000));
  if (s < 10) return 'сейчас';
  if (s < 60) return `${s} сек`;
  if (s < 3600) return `${Math.floor(s / 60)} мин`;
  return `${Math.floor(s / 3600)} ч`;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const now = useNow();
  const { data } = useDashboard();
  const { data: lots = [] } = useAdminLots('all');

  const live = lots.filter((l) => l.status === 'live' && l.published);
  const upcoming = lots.filter((l) => l.status === 'upcoming' && l.published);
  const schedule = upcoming.concat(live.slice(0, 2));

  const week = data?.week ?? [0, 0, 0, 0, 0, 0, 0];
  const wmax = Math.max(1, ...week);
  // Подписи дней: от «сегодня − 6 дней» до «сегодня»
  const days = Array.from({ length: 7 }, (_, i) => {
    const label = new Date(now - (6 - i) * 86_400_000).toLocaleDateString('ru-RU', { weekday: 'short' });
    return label.charAt(0).toUpperCase() + label.slice(1);
  });
  const activity = data?.activity ?? [];

  return (
    <div className="content fade">
      <div className="stats">
        <div className="stat">
          <div className="l">В эфире сейчас</div>
          <div className="v" style={{ color: 'var(--live)' }}>{data?.liveCount ?? 0}</div>
          <div className="d live">● идут торги</div>
        </div>
        <div className="stat">
          <div className="l">Стартуют сегодня</div>
          <div className="v">{data?.upcomingCount ?? 0}</div>
          <div className="d">ожидают запуска</div>
        </div>
        <div className="stat">
          <div className="l">Ставок за день</div>
          <div className="v">{data?.bidsToday ?? 0}</div>
          <div className="d up">↑ активность высокая</div>
        </div>
        <div className="stat">
          <div className="l">Комиссия (продано)</div>
          <div className="v">{fmt(data?.commissionTotal ?? 0)} ₽</div>
          <div className="d">1.5% · {data?.dealsCount ?? 0} сделок</div>
        </div>
      </div>

      <div className="section-gap"></div>

      {/* график недели + расписание */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20, alignItems: 'stretch' }}>
        <div className="pcard">
          <div className="ph">
            <div><h3>Активность за неделю</h3><div className="sub">ставок в день</div></div>
            <span className="num" style={{ fontSize: 12, color: 'var(--ok)', fontWeight: 600 }}>↑ 23% к прошлой</span>
          </div>
          <div style={{ padding: '24px 20px', display: 'flex', alignItems: 'flex-end', gap: 14, height: 180 }}>
            {week.map((n, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, height: '100%', justifyContent: 'flex-end' }}>
                <span className="num" style={{ fontSize: 11, color: 'var(--dim)', fontWeight: 600 }}>{n}</span>
                <div style={{ width: '100%', height: `${(n / wmax) * 100}%`, background: i === week.length - 1 ? 'var(--accent)' : 'var(--accent-soft)', borderRadius: '6px 6px 0 0', minHeight: 4 }}></div>
                <span className="num" style={{ fontSize: 10.5, color: 'var(--faint)' }}>{days[i]}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="pcard">
          <div className="ph"><div><h3>Расписание стартов</h3><div className="sub">ближайшие торги</div></div></div>
          <div style={{ padding: '8px 20px 14px' }}>
            {schedule.map((l, i) => (
              <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: i < schedule.length - 1 ? '1px solid var(--line)' : 0 }}>
                <span className="num" style={{ width: 52, fontSize: 13, fontWeight: 700, color: l.status === 'upcoming' ? 'var(--gold)' : 'var(--live)', flex: 'none' }}>
                  {new Date(l.startsAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: '600 13px/1.2 var(--ui)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.make} {l.model}</div>
                  <div className="num" style={{ fontSize: 11, color: 'var(--faint)', marginTop: 4 }}>старт {fmt(l.startPrice)} ₽</div>
                </div>
                <Sb s={l.status} />
              </div>
            ))}
            {schedule.length === 0 && (
              <div style={{ padding: '12px 0', fontSize: 13, color: 'var(--faint)' }}>Нет запланированных торгов</div>
            )}
          </div>
        </div>
      </div>

      <div className="section-gap"></div>

      {/* live-таблица + лента событий */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 20, alignItems: 'start' }}>
        <div className="pcard">
          <div className="ph">
            <div><h3>Идут прямо сейчас</h3><div className="sub">требуют контроля</div></div>
            <button className="btn acc sm" onClick={() => navigate('/lots/new')}><Ic d={AI.plus} s={16} /> Добавить лот</button>
          </div>
          <table className="tb">
            <thead><tr><th>Лот</th><th>Ставка</th><th>Ставок</th><th>До конца</th><th></th></tr></thead>
            <tbody>
              {live.map((l) => (
                <tr className="row" key={l.id}>
                  <td>
                    <div className="lotcell">
                      <div className="ph-img">{l.photos[0]?.card ? <img src={l.photos[0].card} alt="" /> : null}</div>
                      <div>
                        <div className="nm">{l.make} {l.model}</div>
                        <div className="meta">#{l.id.slice(0, 6).toUpperCase()}</div>
                      </div>
                    </div>
                  </td>
                  <td className="num" style={{ fontWeight: 600 }}>{fmt(l.currentPrice)} ₽</td>
                  <td className="num">{l.bidCount}</td>
                  <td className="num" style={{ color: 'var(--live)' }}>{fmtTime(leftSec(l.endsAt, now))}</td>
                  <td><div className="row-actions"><button className="btn sm" onClick={() => navigate(`/auctions/${l.id}`)}>Торг</button></div></td>
                </tr>
              ))}
              {live.length === 0 && (
                <tr><td className="empty" colSpan={5}>Сейчас нет активных торгов</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="pcard">
          <div className="ph"><div><h3>Лента событий</h3><div className="sub">в реальном времени</div></div></div>
          <div style={{ padding: '6px 20px 14px' }}>
            {activity.map((a, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: i < activity.length - 1 ? '1px solid var(--line)' : 0 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: DOT_COLORS[a.type] ?? 'var(--dim)', marginTop: 5, flex: 'none' }}></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: '600 13px/1.2 var(--ui)' }}>{a.title}</div>
                  <div className="num" style={{ fontSize: 11.5, color: 'var(--dim)', marginTop: 4 }}>{a.detail}</div>
                </div>
                <span className="num" style={{ fontSize: 11, color: 'var(--faint)', flex: 'none' }}>{ago(a.at, now)}</span>
              </div>
            ))}
            {activity.length === 0 && (
              <div style={{ padding: '12px 0', fontSize: 13, color: 'var(--faint)' }}>Событий пока нет</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
