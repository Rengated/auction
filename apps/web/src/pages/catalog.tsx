import { useNavigate } from 'react-router-dom';
import { displayStatus, STATUS_META, type LotDto } from '@hermes/shared';
import { useCatalog, useToggleFavorite, type CatalogFilter } from '../lib/queries';
import { useNow } from '../lib/time';
import { useIsMobile } from '../lib/layout';
import { useUiStore } from '../lib/ui-store';
import { LotCardBody } from '../components/lot-card';
import { RecentBidsTicker } from '../components/misc';
import { I, Ic } from '../components/icons';

/** Фильтры-чипы каталога (порядок и подписи из дизайна). */
const FILTERS: Array<[CatalogFilter, string]> = [
  ['all', 'Все'],
  ['live', 'В эфире'],
  ['soon', 'Скоро старт'],
  ['done', 'Завершён'],
  ['fav', 'Избранное'],
];

/** Карточка лота — кнопка-обёртка над общим телом (мобайл). */
function LotCard({ lot, onOpen, onToggleFav }: { lot: LotDto; onOpen: () => void; onToggleFav: (on: boolean) => void }) {
  return (
    <button className="card" onClick={onOpen}
      style={{ display: 'block', width: '100%', textAlign: 'left', padding: 0, cursor: 'pointer' }}>
      <LotCardBody lot={lot} onToggleFav={onToggleFav} />
    </button>
  );
}

export function CatalogPage() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const now = useNow();
  const { filter, q, setFilter, setQ } = useUiStore();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useCatalog(filter, q);
  const lots = data?.items ?? [];
  // Отдельный запрос «всё» — для тикера ставок и счётчика «в эфире»
  const { data: allData } = useCatalog('all', '');
  const allLots = allData?.items ?? [];
  const toggleFav = useToggleFavorite();
  const liveCount = allLots.filter((l) => STATUS_META[displayStatus(l.status, l.endsAt, now)].group === 'live').length;

  const open = (lot: LotDto) => navigate(`/lots/${lot.id}`);
  const fav = (lot: LotDto) => (on: boolean) => toggleFav.mutate({ lotId: lot.id, on });

  if (isMobile) {
    return (
      <div className="screen screen-enter">
        <div style={{ flex: 'none', padding: '4px 18px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 6 }}>аукцион · сегодня</div>
              <div className="title-xl">Лоты</div>
            </div>
            <button className="live" onClick={() => navigate('/live')} style={{ cursor: 'pointer' }}>
              <span className="dot"></span>{liveCount} В ЭФИРЕ
            </button>
          </div>
          <div style={{ display: 'flex', gap: 9, marginTop: 14 }}>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 9, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, padding: '11px 13px' }}>
              <span style={{ width: 17, height: 17, flex: 'none', color: 'var(--text-faint)' }}>{I.search}</span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Поиск по объявлениям — марка, модель…"
                style={{ flex: 1, minWidth: 0, background: 'none', border: 0, outline: 'none', color: 'var(--text)', font: '400 13.5px/1 var(--ui)' }}
              />
            </div>
          </div>
        </div>
        <div className="body">
          <div style={{ padding: '0 18px 12px' }}><RecentBidsTicker lots={allLots} /></div>
          <div style={{ display: 'flex', gap: 8, padding: '0 18px 2px', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {FILTERS.map(([k, l]) => (
              <button key={k} className={`chip ${filter === k ? 'on' : ''}`} onClick={() => setFilter(k)}>{l}</button>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '13px 18px 96px' }}>
            {lots.length === 0
              ? <div style={{ textAlign: 'center', color: 'var(--text-faint)', padding: '54px 0', fontSize: 14 }}>Нет лотов в этой категории</div>
              : lots.map((lot) => <LotCard key={lot.id} lot={lot} onOpen={() => open(lot)} onToggleFav={fav(lot)} />)}
            {hasNextPage && (
              <button className="btn" disabled={isFetchingNextPage} onClick={() => fetchNextPage()}
                style={{ marginTop: 16, alignSelf: 'center', background: 'transparent', border: '1px solid var(--line)', color: 'var(--text-dim)' }}>
                {isFetchingNextPage ? 'Загрузка…' : 'Показать ещё'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Веб-раскладка (CatalogView из hifi-web.jsx)
  return (
    <div className="wrap viewfade">
      <div className="page-head">
        <div>
          <div className="eyebrow-w">аукцион автомобилей · сегодня</div>
          <h1>Каталог лотов</h1>
        </div>
        <button className="live" onClick={() => navigate('/live')} style={{ fontSize: 13, cursor: 'pointer' }}>
          <span className="dot"></span>{liveCount} в эфире сейчас
        </button>
      </div>
      <div style={{ marginBottom: 18 }}><RecentBidsTicker lots={allLots} /></div>
      <div style={{ display: 'flex', gap: 9, paddingBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        {FILTERS.map(([k, l]) => (
          <button key={k} className={`wchip ${filter === k ? 'on' : ''}`} onClick={() => setFilter(k)}>{l}</button>
        ))}
        {q && (
          <button className="wchip" onClick={() => setQ('')} title="Сбросить поиск" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            «{q}» <Ic d={I.cross} s={13} />
          </button>
        )}
      </div>
      {lots.length === 0
        ? <div style={{ textAlign: 'center', color: 'var(--text-faint)', padding: '80px 0' }}>Нет лотов в этой категории</div>
        : (
          <>
            <div className="grid">
              {lots.map((lot) => (
                <button key={lot.id} className="wcard" onClick={() => open(lot)}>
                  <LotCardBody lot={lot} onToggleFav={fav(lot)} />
                </button>
              ))}
            </div>
            {hasNextPage && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
                <button className="wbtn ghost" disabled={isFetchingNextPage} onClick={() => fetchNextPage()}>
                  {isFetchingNextPage ? 'Загрузка…' : 'Показать ещё'}
                </button>
              </div>
            )}
          </>
        )}
    </div>
  );
}
