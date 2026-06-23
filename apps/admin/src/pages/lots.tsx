import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fmt, PAGE_LIMITS } from '@hermes/shared';
import {
  useAdminLots,
  useArchiveLot,
  useDeleteLot,
  useMe,
  usePublishLot,
  useUnpublishLot,
  type AdminLot,
  type AdminLotsFilter,
  type LotFormPayload,
} from '../lib/queries';
import { AI, Ic, Sb } from '../components/icons';
import { Pagination } from '../components/pagination';
import { useToast } from '../components/toast';

const TABS: Array<[AdminLotsFilter, string]> = [
  ['all', 'Все'],
  ['live', 'В эфире'],
  ['soon', 'Ожидают'],
  ['done', 'Завершены'],
  ['draft', 'Черновики'],
  ['archived', 'Архив'],
];

/** Полный LotFormPayload из строки таблицы — для PATCH со снятием публикации. */
function rowToPayload(l: AdminLot, published: boolean): LotFormPayload {
  return {
    make: l.make,
    model: l.model,
    year: l.year,
    mileage: l.mileage,
    engine: l.engine,
    power: l.power,
    fuel: l.fuel,
    transmission: l.transmission,
    drive: l.drive,
    body: l.body,
    color: l.color,
    vin: l.vin ?? undefined,
    description: l.description || undefined,
    options: l.options,
    addressId: l.addressId,
    startPrice: l.startPrice,
    reservePrice: l.reservePrice,
    bidStep: l.lotBidStep,
    feeRate: l.lotFeeRate,
    startsAt: l.startsAt,
    endsAt: l.endsAt,
    published,
  };
}

export function LotsPage() {
  const navigate = useNavigate();
  const [f, setF] = useState<AdminLotsFilter>('all');
  const [page, setPage] = useState(1);
  const { data } = useAdminLots(f, page);
  const lots = data?.items ?? [];
  const { data: drafts } = useAdminLots('draft');
  const publish = usePublishLot();
  const unpublish = useUnpublishLot();
  const archive = useArchiveLot();
  const delLot = useDeleteLot();
  const { data: me } = useMe();
  const isAdmin = me?.role === 'admin';
  const toast = useToast();
  const draftCount = drafts?.total ?? 0;

  const onArchive = (l: AdminLot) =>
    archive.mutate(
      { id: l.id, archived: !l.archived },
      { onSuccess: () => toast.ok(l.archived ? 'Лот возвращён' : 'Лот в архиве'), onError: (e) => toast.error(e.message) },
    );
  const onDelete = (l: AdminLot) => {
    if (!window.confirm(`Удалить лот «${l.make} ${l.model}» безвозвратно?`)) return;
    delLot.mutate(l.id, { onSuccess: () => toast.ok('Лот удалён'), onError: (e) => toast.error(e.message) });
  };
  const setFilter = (nf: AdminLotsFilter) => {
    setF(nf);
    setPage(1);
  };

  const onUnpublish = (l: AdminLot) => {
    if (!window.confirm('Снять лот с публикации? Он вернётся в черновики.')) return;
    unpublish.mutate(
      { id: l.id, payload: rowToPayload(l, false) },
      {
        onSuccess: () => toast.ok('Лот снят с публикации'),
        onError: (e) => toast.error(`Не удалось снять с публикации: ${e.message}`),
      },
    );
  };

  return (
    <div className="content fade">
      <div className="pcard">
        <div className="ph">
          <div style={{ display: 'flex', gap: 7 }}>
            {TABS.map(([k, l]) => (
              <button
                key={k}
                className="btn sm"
                onClick={() => setFilter(k)}
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
                <td data-label="Публикация">
                  {l.published
                    ? <span className="sb sold"><span className="dot"></span> опубликован</span>
                    : <span className="sb" style={{ background: 'var(--gold-soft)', color: 'var(--gold)' }}>черновик</span>}
                </td>
                <td data-label="Статус"><Sb s={l.published ? l.status : 'draft'} /></td>
                <td data-label="Стартовая" className="num" style={{ color: 'var(--dim)' }}>{fmt(l.startPrice)} ₽</td>
                <td data-label="Текущая" className="num" style={{ fontWeight: 600 }}>{fmt(l.currentPrice)} ₽</td>
                <td data-label="Резерв" className="num">{fmt(l.reservePrice)} ₽</td>
                <td>
                  <div className="row-actions">
                    {l.archived ? (
                      <>
                        <button className="btn sm" disabled={archive.isPending} onClick={() => onArchive(l)}>Вернуть</button>
                        {isAdmin && l.bidCount === 0 && (
                          <button className="iconbtn2" title="Удалить безвозвратно" disabled={delLot.isPending} onClick={() => onDelete(l)} style={{ color: 'var(--live)', borderColor: 'color-mix(in srgb, var(--live) 40%, var(--line2))' }}>
                            <Ic d={AI.trash} s={14} />
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        {!l.published && (
                          <button className="btn sm" disabled={publish.isPending} onClick={() => publish.mutate(l.id, { onSuccess: () => toast.ok('Лот опубликован'), onError: (e) => toast.error(`Не удалось опубликовать: ${e.message}`) })}>Опубликовать</button>
                        )}
                        {l.published && (l.status === 'upcoming' || l.status === 'draft') && l.bidCount === 0 && (
                          <button className="btn sm" disabled={unpublish.isPending} onClick={() => onUnpublish(l)}>Снять с публикации</button>
                        )}
                        {l.status === 'live' && (
                          <button className="iconbtn2" title="Контроль торга" onClick={() => navigate(`/auctions/${l.id}`)}>{AI.gavel}</button>
                        )}
                        {(l.status === 'finished' || l.status === 'sold') &&
                          l.bidCount > 0 &&
                          (!l.dealStatus || l.dealStatus === 'cancelled') && (
                            <button
                              className="iconbtn2"
                              title="Выбрать победителя — участники и ставки"
                              onClick={() => navigate(`/auctions/${l.id}`)}
                              style={{ color: 'var(--gold)', borderColor: 'color-mix(in srgb, var(--gold) 45%, var(--line2))' }}
                            >
                              {AI.users}
                            </button>
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
                        {l.status !== 'live' && (
                          <button className="iconbtn2" title="В архив (скрыть)" disabled={archive.isPending} onClick={() => onArchive(l)}>
                            {AI.ban}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {lots.length === 0 && (
              <tr><td className="empty" colSpan={7}>Нет лотов</td></tr>
            )}
          </tbody>
        </table>
        <Pagination total={data?.total ?? 0} limit={PAGE_LIMITS.admin} page={page} onPage={setPage} />
      </div>
    </div>
  );
}
