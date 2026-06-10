import { useNavigate } from 'react-router-dom';
import type { LotDto } from '@hermes/shared';
import { useCatalog, useToggleFavorite } from '../lib/queries';
import { useIsMobile } from '../lib/layout';
import { LotCardBody } from '../components/lot-card';

/** Лобби живых торгов (ScreenLiveLobby из дизайна). */
export function LivePage() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { data: lots = [] } = useCatalog('live', '');
  const toggleFav = useToggleFavorite();
  // Самые «горящие» лоты сверху
  const live = [...lots].sort((a, b) => new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime());

  const open = (lot: LotDto) => navigate(`/lots/${lot.id}`);
  const fav = (lot: LotDto) => (on: boolean) => toggleFav.mutate({ lotId: lot.id, on });

  if (isMobile) {
    return (
      <div className="screen screen-enter">
        <div style={{ flex: 'none', padding: '6px 20px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 7 }}>идут прямо сейчас</div>
            <div className="title-xl">Живые торги</div>
          </div>
          <span className="live"><span className="dot"></span>{live.length}</span>
        </div>
        <div className="body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '4px 20px 96px' }}>
            {live.length === 0
              ? <div style={{ textAlign: 'center', color: 'var(--text-faint)', padding: '54px 0', fontSize: 14 }}>Нет лотов в этой категории</div>
              : live.map((lot) => (
                <button key={lot.id} className="card" onClick={() => open(lot)}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: 0, cursor: 'pointer' }}>
                  <LotCardBody lot={lot} onToggleFav={fav(lot)} />
                </button>
              ))}
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
          <div className="eyebrow-w">идут прямо сейчас</div>
          <h1>Живые торги</h1>
        </div>
        <span className="live" style={{ fontSize: 13 }}><span className="dot"></span>{live.length} в эфире сейчас</span>
      </div>
      {live.length === 0
        ? <div style={{ textAlign: 'center', color: 'var(--text-faint)', padding: '80px 0' }}>Нет лотов в этой категории</div>
        : (
          <div className="grid">
            {live.map((lot) => (
              <button key={lot.id} className="wcard" onClick={() => open(lot)}>
                <LotCardBody lot={lot} onToggleFav={fav(lot)} />
              </button>
            ))}
          </div>
        )}
    </div>
  );
}
