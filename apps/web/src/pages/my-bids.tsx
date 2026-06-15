import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { displayStatus, fmtTime, rub, STATUS_META, type LotDto } from '@hermes/shared';
import { useCatalog, useMyBids } from '../lib/queries';
import { leftSec, useNow } from '../lib/time';
import { useIsMobile } from '../lib/layout';
import { Photo } from '../components/photo';

type Tab = 'active' | 'won' | 'fav';
type RowKind = 'lead' | 'out' | 'win' | 'watch';

const TABS: Array<[Tab, string]> = [
  ['active', 'Активные'],
  ['won', 'Выигранные'],
  ['fav', 'Избранное'],
];

const KIND_LABEL: Record<RowKind, string> = {
  lead: 'вы лидируете',
  out: 'вашу перебили',
  win: 'выигран',
  watch: 'в избранном',
};

interface Row {
  lot: LotDto;
  kind: RowKind;
  /** Моя последняя ставка (нет у избранного) */
  mine: number | null;
}

/** Строка портфеля торгов (MyBidRow из hifi-mybids.jsx). */
function BidRow({ row, now, onOpen }: { row: Row; now: number; onOpen: () => void }) {
  const { lot, kind, mine } = row;
  const left = leftSec(lot.endsAt, now);
  const isLive = STATUS_META[displayStatus(lot.status, lot.endsAt, now)].group === 'live';
  return (
    <button className="card" onClick={onOpen}
      style={{ display: 'flex', width: '100%', gap: 13, padding: 12, textAlign: 'left', cursor: 'pointer', alignItems: 'center', background: 'var(--surface)', border: '1px solid var(--line-soft)', borderColor: kind === 'out' ? 'rgba(229,83,61,0.35)' : 'var(--line-soft)' }}>
      <Photo src={lot.photos[0]?.card} h={66} glyph={lot.make[0] ?? 'А'} fit="cover" style={{ width: 88, flex: 'none', borderRadius: 9 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span style={{ font: '600 15px/1.2 var(--ui)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lot.make} {lot.model}</span>
          <span className={`tag ${kind}`} style={{ flex: 'none' }}>{KIND_LABEL[kind]}</span>
        </div>
        <div className="num" style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 7, whiteSpace: 'nowrap' }}>
          {mine !== null ? `ваша · ${rub(mine)}` : `ставка · ${rub(lot.currentPrice)}`}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 9 }}>
          <span className="num" style={{ fontSize: 12, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>текущая {rub(lot.currentPrice)}</span>
          {kind === 'win'
            ? <span className="num" style={{ fontSize: 11, color: 'var(--win)' }}>завершён</span>
            : <span className="num" style={{ fontSize: 11, color: left <= 300 && isLive ? 'var(--live)' : 'var(--text-faint)' }}>⏱ {fmtTime(left)}</span>}
        </div>
      </div>
    </button>
  );
}

export function MyBidsPage() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const now = useNow();
  const [tab, setTab] = useState<Tab>('active');
  const activeQ = useMyBids('active');
  const wonQ = useMyBids('won');
  const favQ = useCatalog('fav', '');

  const active = activeQ.data?.items ?? [];
  const won = wonQ.data?.items ?? [];
  const favLots = favQ.data?.items ?? [];

  const rows: Row[] =
    tab === 'active'
      ? active.map((r) => ({ lot: r.lot, kind: r.isLeading ? 'lead' : 'out', mine: r.myLastBid }))
      : tab === 'won'
        ? won.map((r) => ({ lot: r.lot, kind: 'win', mine: r.myLastBid }))
        : favLots.map((lot) => ({ lot, kind: 'watch', mine: null }));

  // «Показать ещё» относится к текущей активной вкладке
  const tabQ = tab === 'active' ? activeQ : tab === 'won' ? wonQ : favQ;

  const list = rows.length === 0
    ? <div style={{ textAlign: 'center', color: 'var(--text-faint)', padding: '60px 0', fontSize: 14 }}>Здесь пока пусто</div>
    : (
      <>
        {rows.map((r) => <BidRow key={r.lot.id} row={r} now={now} onOpen={() => navigate(`/lots/${r.lot.id}`)} />)}
        {tabQ.hasNextPage && (
          <button className="wbtn ghost" disabled={tabQ.isFetchingNextPage} onClick={() => tabQ.fetchNextPage()}
            style={{ alignSelf: 'center', marginTop: 4, justifyContent: 'center' }}>
            {tabQ.isFetchingNextPage ? 'Загрузка…' : 'Показать ещё'}
          </button>
        )}
      </>
    );

  if (isMobile) {
    return (
      <div className="screen screen-enter">
        <div style={{ flex: 'none', padding: '6px 20px 14px' }}>
          <div className="eyebrow" style={{ marginBottom: 7 }}>портфель торгов</div>
          <div className="title-xl">Мои ставки</div>
          <div style={{ display: 'flex', gap: 9, marginTop: 16 }}>
            {TABS.map(([k, l]) => <button key={k} className={`chip ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>{l}</button>)}
          </div>
        </div>
        <div className="body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 20px 96px' }}>
            {list}
          </div>
        </div>
      </div>
    );
  }

  // Веб-раскладка
  return (
    <div className="wrap viewfade">
      <div className="page-head">
        <div>
          <div className="eyebrow-w">портфель торгов</div>
          <h1>Мои ставки</h1>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 9, paddingBottom: 24, flexWrap: 'wrap' }}>
        {TABS.map(([k, l]) => <button key={k} className={`wchip ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>{l}</button>)}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 720, paddingBottom: 64 }}>
        {list}
      </div>
    </div>
  );
}
