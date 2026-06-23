/* Страница лота: мобильный экран (ScreenLot) и веб-раскладка (LotView) — 1:1 из дизайна. */
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  displayStatus,
  STATUS_META,
  fmt,
  rub,
  fmtTime,
  feeAmount,
  feePctLabel,
  type BidRowDto,
  type LotDto,
} from '@hermes/shared';
import { useLot, useBidsFeed, useConfig, useToggleFavorite } from '../lib/queries';
import { NotFoundPage } from './not-found';
import { useBidForm } from '../lib/bid-form';
import { useLotRoom } from '../lib/ws';
import { useNow, leftSec } from '../lib/time';
import { useIsMobile } from '../lib/layout';
import { Carousel, Photo } from '../components/photo';
import { StatusBadge } from '../components/status-badge';
import { BidInput } from '../components/bid-input';
import { BidList } from '../components/bid-list';
import { AutotekaReport } from '../components/autoteka';
import { SpecTile } from '../components/misc';
import { ReserveInline } from '../components/lot-card';
import { I, Ic } from '../components/icons';

const QUICK = [20_000, 50_000, 100_000];

/** Участники — производная от числа ставок (точных данных API не отдаёт). */
const participantsOf = (lot: LotDto) => Math.max(1, Math.round(lot.bidCount * 0.6));

const lotNo = (lot: LotDto) => `лот #${lot.id.slice(0, 6).toUpperCase()}`;

/** «5 июн, 18:00» — метка окна торгов. */
const winLabel = (iso: string) =>
  new Date(iso).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** Карточка адреса осмотра/выдачи — общая для мобайла и веба. */
function AddressCard({ address }: { address: string }) {
  return (
    <div className="card" style={{ padding: '12px 14px', display: 'flex', gap: 11, alignItems: 'flex-start' }}>
      <span style={{ width: 17, height: 17, color: 'var(--accent)', flex: 'none', marginTop: 1 }}>{I.pin}</span>
      <div style={{ minWidth: 0 }}>
        <div className="eyebrow" style={{ marginBottom: 5 }}>адрес осмотра</div>
        <div style={{ fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.5 }}>{address}</div>
      </div>
    </div>
  );
}

/** Поделиться лотом: системный шит или копирование ссылки. Возвращает true при копировании. */
async function shareLot(lot: LotDto): Promise<boolean> {
  const url = `${location.origin}/lots/${lot.id}`;
  const title = `${lot.make} ${lot.model}, ${lot.year}`;
  const text = `${title} — ${rub(lot.currentPrice)} · ${fmt(lot.mileage)} км на Auction Germes`;
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
    } catch {
      /* отмена пользователем — игнорируем */
    }
    return false;
  }
  await navigator.clipboard?.writeText(url);
  return true;
}

const specRowsOf = (lot: LotDto): Array<[string, string]> => [
  ['Двигатель', `${lot.engine} · ${lot.power} л.с.`],
  ['Топливо', lot.fuel],
  ['Коробка', lot.transmission],
  ['Привод', lot.drive],
  ['Кузов', lot.body],
  ['Пробег', `${fmt(lot.mileage)} км`],
  ['Год выпуска', String(lot.year)],
  ['Цвет', lot.color],
];

/* ============================ мобайл ============================ */

/** Липкая панель ставки (BidPanel из hifi-lot.jsx). */
function BidPanel({ lot }: { lot: LotDto }) {
  const now = useNow();
  const bf = useBidForm(lot);
  const { data: cfg } = useConfig();
  const feeRate = lot.feeRate ?? cfg?.feeRate ?? 0.015;
  const ds = displayStatus(lot.status, lot.endsAt, now);
  const group = STATUS_META[ds].group;
  const left = leftSec(lot.endsAt, now);

  // sold / finished / withdrawn — торги завершены
  if (group === 'done') {
    return (
      <div className="bidbar">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 11 }}>
          <div>
            <div className="eyebrow">{lot.status === 'sold' ? 'итоговая цена' : 'макс. ставка'}</div>
            <div className="num" style={{ fontSize: 19, fontWeight: 700, marginTop: 4, color: lot.status === 'sold' ? 'var(--win)' : 'var(--text)' }}>{rub(lot.currentPrice)}</div>
          </div>
          <div className="num" style={{ fontSize: 12, textAlign: 'right' }}>
            <ReserveInline lot={lot} />
            <div style={{ color: 'var(--text-faint)', marginTop: 5 }}>{lot.bidCount} ставок</div>
          </div>
        </div>
        <button className="btn block" style={{ background: 'var(--surface-2)', color: 'var(--text-dim)', cursor: 'default' }} disabled>
          Торги завершены
        </button>
      </div>
    );
  }

  // upcoming — напоминание о старте, ставок ещё нет
  if (group === 'soon') {
    const startsLeft = leftSec(lot.startsAt, now);
    return (
      <div className="bidbar">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 11 }}>
          <div>
            <div className="eyebrow">стартовая цена</div>
            <div className="num" style={{ fontSize: 19, fontWeight: 700, marginTop: 4 }}>{rub(lot.currentPrice)}</div>
          </div>
          <div className="num" style={{ fontSize: 12, textAlign: 'right', color: 'var(--text-dim)' }}>
            старт через
            <div style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 15, marginTop: 4 }}>{fmtTime(startsLeft)}</div>
          </div>
        </div>
        <div className="num" style={{ display: 'flex', gap: 7, alignItems: 'center', justifyContent: 'center', padding: '12px', borderRadius: 9, background: 'var(--surface-2)', border: '1px solid var(--line-soft)', color: 'var(--text-dim)', fontSize: 12.5 }}>
          <Ic d={I.clock} s={15} /> Торги ещё не начались
        </div>
      </div>
    );
  }

  // live / ending — полная форма ставки
  return (
    <div className="bidbar">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
          <span className="eyebrow">текущая</span>
          <span className="num" style={{ fontWeight: 700, fontSize: 16, whiteSpace: 'nowrap' }}>{rub(lot.currentPrice)}</span>
          {lot.my?.isLeading && <span className="num" style={{ fontSize: 11, fontWeight: 700, color: 'var(--ok)', whiteSpace: 'nowrap' }}>вы лидируете</span>}
        </div>
        <div className="num" style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 12, color: 'var(--text-dim)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Ic d={I.bids} s={13} />{lot.bidCount}</span>
          <span style={{ color: left <= 300 ? 'var(--live)' : 'var(--text-dim)', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Ic d={I.clock} s={13} />{fmtTime(left)}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 7, marginBottom: 9 }}>
        {QUICK.map((q) => (
          <button key={q} className="chip" style={{ flex: 1, textAlign: 'center', justifyContent: 'center' }}
            onClick={() => bf.setValue(Math.max(bf.minNext, bf.value) + q)}>+{q / 1000}к</button>
        ))}
      </div>

      <BidInput value={bf.value} step={lot.bidStep} onChange={bf.setValue} />

      {bf.error && <div className="num" style={{ fontSize: 11.5, color: 'var(--live)', margin: '7px 2px 0' }}>{bf.error}</div>}

      <div className="num" style={{ fontSize: 11, color: bf.tooLow ? 'var(--live)' : 'var(--text-faint)', margin: '8px 2px 9px', display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <span>{bf.tooLow ? `минимум ${rub(bf.minNext)}` : `шаг ${fmt(lot.bidStep)} ₽`}</span>
        <ReserveInline lot={lot} />
      </div>

      <div style={{ background: 'var(--surface-2)', border: '1px solid var(--line-soft)', borderRadius: 9, padding: '9px 12px', marginBottom: 11 }}>
        <div className="num" style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12, color: 'var(--text-dim)' }}>
          <span>комиссия · {feePctLabel(feeRate)}%</span><span style={{ whiteSpace: 'nowrap' }}>{rub(feeAmount(bf.value, feeRate))}</span>
        </div>
        <div className="num" style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13, fontWeight: 700, marginTop: 7, paddingTop: 7, borderTop: '1px dashed var(--line)' }}>
          <span>итого при выигрыше</span><span style={{ whiteSpace: 'nowrap' }}>{rub(bf.value + feeAmount(bf.value, feeRate))}</span>
        </div>
      </div>

      <button className={`btn block ${bf.done ? '' : 'accent'}`} onClick={bf.submit} disabled={bf.pending}
        style={bf.done ? { background: 'color-mix(in srgb, var(--win) 16%, transparent)', color: 'var(--win)', boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--win) 45%, transparent)' } : {}}>
        {bf.done
          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Ic d={I.check} s={17} /> Ставка принята · вы лидируете</span>
          : !bf.authed
            ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Ic d={I.user} s={16} /> Войдите, чтобы участвовать</span>
            : !bf.contactsFilled
              ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Ic d={I.shield} s={16} /> Заполните контакты для ставки</span>
              : <span style={{ whiteSpace: 'nowrap' }}>Поставить {rub(bf.value)}</span>}
      </button>
    </div>
  );
}

/** Мобильный экран лота (ScreenLot из hifi-lot.jsx). */
function ScreenLot({ lot, feed }: { lot: LotDto; feed: BidRowDto[] }) {
  const navigate = useNavigate();
  const now = useNow();
  const fav = useToggleFavorite();
  const [tab, setTab] = useState('Обзор');
  const [copied, setCopied] = useState(false);
  const tabs = ['Обзор', 'Характеристики', 'Описание'];
  const live = STATUS_META[displayStatus(lot.status, lot.endsAt, now)].group === 'live';

  const onShare = async () => {
    if (await shareLot(lot)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="screen screen-enter">
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 5, display: 'flex', justifyContent: 'space-between', padding: '14px 16px 0' }}>
        <button className="iconbtn" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}>{I.back}</button>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {copied && (
            <span className="num" style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text)', background: 'color-mix(in srgb, var(--bg) 70%, transparent)', border: '1px solid var(--line)', borderRadius: 8, padding: '6px 9px', backdropFilter: 'blur(6px)' }}>
              Ссылка скопирована
            </span>
          )}
          <button className="iconbtn" onClick={onShare}>{I.share}</button>
          <button className="iconbtn" style={{ color: lot.isFavorite ? 'var(--accent)' : 'var(--text)' }}
            onClick={() => fav.mutate({ lotId: lot.id, on: !lot.isFavorite })}>{I.bookmark}</button>
        </div>
      </div>

      <div className="body">
        <div style={{ position: 'relative' }}>
          <Carousel photos={lot.photos} h={264} glyph={lot.make.toUpperCase()} size="md" />
          <div style={{ position: 'absolute', bottom: 11, right: 56, zIndex: 5 }}><StatusBadge lot={lot} /></div>
        </div>

        <div style={{ padding: '16px 18px 0' }}>
          <div className="eyebrow">{lotNo(lot)}</div>
          <div className="title-xl" style={{ marginTop: 7 }}>{lot.make} {lot.model}</div>
          <div className="num" style={{ color: 'var(--text-dim)', fontSize: 13, marginTop: 7 }}>{lot.year} · {fmt(lot.mileage)} км · {lot.body}</div>

          <div style={{ display: 'flex', gap: 16, marginTop: 15 }}>
            <div>
              <div className="eyebrow">{lot.status === 'sold' ? 'продан за' : lot.status === 'upcoming' ? 'стартовая цена' : 'текущая ставка'}</div>
              <div className="num" style={{ fontSize: 22, fontWeight: 700, marginTop: 4, color: lot.status === 'sold' ? 'var(--win)' : 'var(--text)' }}>{rub(lot.currentPrice)}</div>
              <div className="num" style={{ fontSize: 11, marginTop: 5 }}><ReserveInline lot={lot} /></div>
            </div>
            <div style={{ borderLeft: '1px solid var(--line)', paddingLeft: 16 }}>
              <div className="eyebrow">ставок · участников</div>
              <div className="num" style={{ fontSize: 16, fontWeight: 600, marginTop: 6 }}>{lot.bidCount} · {participantsOf(lot)}</div>
              <div className="num" style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 6 }}>оконч. {winLabel(lot.endsAt)}</div>
            </div>
          </div>
        </div>

        <div style={{ padding: '18px 18px 0' }}>
          <div className="seg">
            {tabs.map((t) => <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>)}
          </div>
        </div>

        <div style={{ padding: '16px 18px 24px' }}>
          {tab === 'Обзор' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
                <SpecTile icon={I.road} k="пробег" v={`${fmt(lot.mileage)} км`} />
                <SpecTile icon={I.engine} k="двигатель" v={`${lot.engine} · ${lot.power} л.с.`} />
                <SpecTile icon={I.fuel} k="топливо" v={lot.fuel} />
                <SpecTile icon={I.catalog} k="привод" v={lot.drive} />
              </div>
              <AutotekaReport lot={lot} />
              <div className="card" style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>Окно торгов</span>
                <span className="num" style={{ fontSize: 12.5, fontWeight: 600 }}>{winLabel(lot.startsAt)} → {winLabel(lot.endsAt)}</span>
              </div>
              {lot.address && <AddressCard address={lot.address} />}
            </div>
          )}
          {tab === 'Характеристики' && (
            <div className="card" style={{ padding: '2px 15px' }}>
              {specRowsOf(lot).map(([k, v]) => (
                <div key={k} className="spec-row"><span className="k">{k}</span><span className="v num">{v}</span></div>
              ))}
            </div>
          )}
          {tab === 'Описание' && (
            <div>
              <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: 14, lineHeight: 1.62, textWrap: 'pretty' }}>{lot.description}</p>
              {lot.options.length > 0 && (
                <div className="card" style={{ marginTop: 14, padding: '13px 15px' }}>
                  <div className="eyebrow" style={{ marginBottom: 10 }}>комплектация</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {lot.options.map((o) => <span key={o} className="chip" style={{ cursor: 'default' }}>{o}</span>)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ padding: '0 18px 26px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div className="eyebrow">ставки по лоту · {lot.bidCount} · {participantsOf(lot)} участн.</div>
            {live && <span className="live" style={{ fontSize: 11 }}><span className="dot"></span>обновляется</span>}
          </div>
          <BidList bids={feed} max={8} scroll />
        </div>
      </div>

      <BidPanel lot={lot} />
    </div>
  );
}

/* ============================ веб ============================ */

/** Правая колонка торгов (WebBidBox из hifi-web-lot.jsx). */
function WebBidBox({ lot }: { lot: LotDto }) {
  const now = useNow();
  const bf = useBidForm(lot);
  const { data: cfg } = useConfig();
  const feeRate = lot.feeRate ?? cfg?.feeRate ?? 0.015;
  const ds = displayStatus(lot.status, lot.endsAt, now);
  const group = STATUS_META[ds].group;
  const left = leftSec(lot.endsAt, now);
  const startsLeft = leftSec(lot.startsAt, now);

  return (
    <div className="bidbox">
      <div className="eyebrow-w">{lot.status === 'sold' ? 'итоговая цена' : lot.status === 'upcoming' ? 'стартовая цена' : 'текущая ставка'}</div>
      <div className="num" style={{ fontSize: 32, fontWeight: 700, marginTop: 8, letterSpacing: '-0.02em', color: lot.status === 'sold' ? 'var(--win)' : 'var(--text)' }}>{rub(lot.currentPrice)}</div>
      <div className="num" style={{ fontSize: 12.5, fontWeight: 600, marginTop: 8 }}>
        <ReserveInline lot={lot} />
        {lot.my?.isLeading && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ok)', marginLeft: 9 }}>вы лидируете</span>}
      </div>

      <div className="statline">
        <div><div className="eyebrow-w">ставок</div><div className="num" style={{ fontSize: 18, fontWeight: 700, marginTop: 6 }}>{lot.bidCount}</div></div>
        <div><div className="eyebrow-w">участников</div><div className="num" style={{ fontSize: 18, fontWeight: 700, marginTop: 6 }}>{participantsOf(lot)}</div></div>
        <div>
          <div className="eyebrow-w">{group === 'soon' ? 'старт через' : group === 'done' ? 'завершены' : 'до конца'}</div>
          <div className="num" style={{ fontSize: 18, fontWeight: 700, marginTop: 6, color: group === 'live' && left <= 300 ? 'var(--live)' : 'var(--text)' }}>
            {group === 'soon' ? fmtTime(startsLeft) : group === 'done' ? winLabel(lot.endsAt) : fmtTime(left)}
          </div>
        </div>
      </div>

      {group === 'live' && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            {QUICK.map((q) => (
              <button key={q} className="wchip" style={{ flex: 1, justifyContent: 'center', textAlign: 'center' }}
                onClick={() => bf.setValue(Math.max(bf.minNext, bf.value) + q)}>+{q / 1000}к</button>
            ))}
          </div>
          <BidInput value={bf.value} step={lot.bidStep} onChange={bf.setValue} />
          {bf.error && <div className="num" style={{ fontSize: 12, color: 'var(--live)', margin: '9px 2px 0' }}>{bf.error}</div>}
          <div className="num" style={{ fontSize: 12, color: bf.tooLow ? 'var(--live)' : 'var(--text-faint)', margin: '10px 2px 12px' }}>
            {bf.tooLow ? `минимум ${rub(bf.minNext)}` : `мин. шаг ${fmt(lot.bidStep)} ₽ · следующая ${rub(bf.minNext)}`}
          </div>
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--line-soft)', borderRadius: 10, padding: '11px 14px', marginBottom: 14 }}>
            <div className="num" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13, color: 'var(--text-dim)' }}>
              <span>ваша ставка</span><span style={{ whiteSpace: 'nowrap' }}>{rub(bf.value)}</span>
            </div>
            <div className="num" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13, color: 'var(--text-dim)', marginTop: 8 }}>
              <span>комиссия · {feePctLabel(feeRate)}%</span><span style={{ whiteSpace: 'nowrap' }}>{rub(feeAmount(bf.value, feeRate))}</span>
            </div>
            <div className="num" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 15, fontWeight: 700, marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--line)' }}>
              <span>итого при выигрыше</span><span style={{ whiteSpace: 'nowrap' }}>{rub(bf.value + feeAmount(bf.value, feeRate))}</span>
            </div>
          </div>
          <button className={`wbtn ${bf.done ? '' : 'accent'}`} disabled={bf.pending}
            style={{ width: '100%', justifyContent: 'center', padding: '15px', ...(bf.done ? { background: 'color-mix(in srgb, var(--win) 16%, transparent)', color: 'var(--win)' } : {}) }}
            onClick={bf.submit}>
            {bf.done
              ? <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><Ic d={I.check} /> Ставка принята · вы лидируете</span>
              : !bf.authed
                ? <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><Ic d={I.user} s={16} /> Войдите, чтобы участвовать</span>
                : !bf.contactsFilled
                  ? <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><Ic d={I.shield} s={16} /> Заполните контакты для ставки</span>
                  : `Поставить ${rub(bf.value)}`}
          </button>
        </>
      )}

      {group === 'soon' && (
        <div className="num" style={{ display: 'flex', gap: 9, alignItems: 'center', justifyContent: 'center', padding: '14px', borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--line-soft)', color: 'var(--text-dim)', fontSize: 13 }}>
          <Ic d={I.clock} s={16} /> Торги ещё не начались — старт через {fmtTime(startsLeft)}
        </div>
      )}

      {group === 'done' && (
        <button className="wbtn" style={{ width: '100%', justifyContent: 'center', padding: '15px', color: 'var(--text-dim)', cursor: 'default' }} disabled>
          Торги завершены
        </button>
      )}
    </div>
  );
}

/** Веб-страница лота (LotView из hifi-web-lot.jsx). */
function LotView({ lot, feed }: { lot: LotDto; feed: BidRowDto[] }) {
  const navigate = useNavigate();
  const now = useNow();
  const [tab, setTab] = useState('Обзор');
  const [photoIdx, setPhotoIdx] = useState(0);
  const tabs = ['Обзор', 'Характеристики', 'Описание'];
  const live = STATUS_META[displayStatus(lot.status, lot.endsAt, now)].group === 'live';

  return (
    <div className="wrap viewfade">
      <div style={{ padding: '22px 0 0' }}>
        <button className="wbtn ghost" onClick={() => navigate('/')}><span style={{ width: 16, height: 16 }}>{I.back}</span> Назад к каталогу</button>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20, padding: '18px 0 22px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="eyebrow-w">{lotNo(lot)} · {lot.year}</div>
          <h1 style={{ font: '800 30px/1.12 var(--ui)', letterSpacing: '-0.025em', margin: '12px 0 0' }}>{lot.make} {lot.model}</h1>
          <div className="num" style={{ color: 'var(--text-dim)', fontSize: 14, marginTop: 12 }}>{fmt(lot.mileage)} км · {lot.body} · {lot.color}</div>
        </div>
        <StatusBadge lot={lot} />
      </div>

      <div className="lot-grid">
        <div>
          <div className="gallery-main">
            <Carousel photos={lot.photos} h={420} glyph={lot.make.toUpperCase()} size="lg" index={Math.min(photoIdx, Math.max(0, lot.photos.length - 1))} onIndex={setPhotoIdx} />
          </div>
          {lot.mediaPurged && lot.photos.length === 0 && (
            <div className="num" style={{ fontSize: 12, color: 'var(--text-dim)', margin: '8px 2px 0' }}>
              Медиа этого лота удалено по истечении срока хранения.
            </div>
          )}
          {lot.photos.length > 1 && (
            <div className="thumbs">
              {lot.photos.map((p, i) => (
                <div
                  key={p.id}
                  className={`thumb ${i === photoIdx ? 'on' : ''}`}
                  onClick={() => setPhotoIdx(i)}
                  style={{ cursor: 'pointer' }}
                >
                  {p.kind === 'video' ? (
                    <div style={{ height: 70, background: 'linear-gradient(135deg, #2a2f37 0%, #171a1f 100%)', display: 'grid', placeItems: 'center', color: '#f5f4f0', fontSize: 16, opacity: 0.9 }}>▶</div>
                  ) : (
                    <Photo src={p.card ?? null} h={70} glyph={String(i + 1)} />
                  )}
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 26 }}>
            <div className="wseg">{tabs.map((t) => <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>)}</div>
            <div style={{ marginTop: 18 }}>
              {tab === 'Обзор' && (
                <div>
                  <div className="specgrid">
                    <SpecTile icon={I.road} k="пробег" v={`${fmt(lot.mileage)} км`} />
                    <SpecTile icon={I.engine} k="двигатель" v={`${lot.engine} · ${lot.power} л.с.`} />
                    <SpecTile icon={I.fuel} k="топливо" v={lot.fuel} />
                    <SpecTile icon={I.catalog} k="привод" v={lot.drive} />
                    <SpecTile icon={I.clock} k="коробка" v={lot.transmission} />
                    <SpecTile icon={I.shield} k="проверка" v={lot.autotekaPdfUrl ? 'пройдена' : 'готовится'} />
                  </div>
                  <div style={{ marginTop: 14 }}><AutotekaReport lot={lot} /></div>
                  {lot.address && <div style={{ marginTop: 14 }}><AddressCard address={lot.address} /></div>}
                </div>
              )}
              {tab === 'Характеристики' && (
                <div className="card" style={{ padding: '2px 18px' }}>
                  {specRowsOf(lot).map(([k, v]) => <div key={k} className="spec-row"><span className="k">{k}</span><span className="v num">{v}</span></div>)}
                </div>
              )}
              {tab === 'Описание' && (
                <div>
                  <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: 15, lineHeight: 1.65, textWrap: 'pretty' }}>{lot.description}</p>
                  {lot.options.length > 0 && (
                    <div className="card" style={{ marginTop: 16, padding: '16px 18px' }}>
                      <div className="eyebrow-w" style={{ marginBottom: 12 }}>комплектация</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{lot.options.map((o) => <span key={o} className="wchip" style={{ cursor: 'default' }}>{o}</span>)}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div style={{ marginTop: 26 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div className="eyebrow-w" style={{ margin: 0 }}>ставки по лоту · {lot.bidCount} · {participantsOf(lot)} участников</div>
              {live && <span className="live" style={{ fontSize: 12 }}><span className="dot"></span>обновляется</span>}
            </div>
            <BidList bids={feed} max={8} scroll />
          </div>
        </div>

        {/* липкая колонка: бокс ставки + живая мини-лента (WebFeed) */}
        <div style={{ position: 'sticky', top: 90 }}>
          <WebBidBox lot={lot} />
          <div style={{ marginTop: 16 }}>
            <BidList bids={feed} max={4} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================ страница ============================ */

export function LotPage() {
  const { id } = useParams<{ id: string }>();
  const { data: lot, isLoading, isError } = useLot(id);
  const { data: feed = [] } = useBidsFeed(id);
  const isMobile = useIsMobile();
  useLotRoom(id);

  // Лот не найден / снят с публикации / в архиве → 404 (а не вечный лоадер).
  if (isError || (!isLoading && !lot)) {
    return <NotFoundPage title="Лот не найден" text="Лот снят с публикации, продан или ссылка устарела." />;
  }
  if (!lot) {
    return <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-faint)', fontSize: 14 }}>Загрузка…</div>;
  }
  return isMobile ? <ScreenLot lot={lot} feed={feed} /> : <LotView lot={lot} feed={feed} />;
}
