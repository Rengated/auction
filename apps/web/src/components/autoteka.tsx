import { useEffect, useState } from 'react';
import type { AutotekaReportDto, LotDto } from '@hermes/shared';
import { fmt } from '@hermes/shared';
import { useIsMobile } from '../lib/layout';
import { I, Ic } from './icons';

type ModalKind = 'mileage' | 'incidents' | 'checks';

const dt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Дата не указана';

const yearOf = (iso: string | null) => (iso ? new Date(iso).getFullYear() : null);

function uniq<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function AutotekaModal({
  report,
  kind,
  onClose,
}: {
  report: AutotekaReportDto;
  kind: ModalKind;
  onClose: () => void;
}) {
  const isMobile = useIsMobile();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const title = kind === 'mileage' ? 'История пробега' : kind === 'incidents' ? 'ДТП и повреждения' : 'Важные проверки';
  const subtitle =
    kind === 'mileage'
      ? `${report.mileageSubtitle ?? 'Пробег'}${report.mileageHasAnomalies ? ' · есть аномалии' : ''}`
      : kind === 'incidents'
        ? report.incidentsTitle ?? `${report.incidentsCount} происшествий`
        : checksSubtitle(report);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1200,
        background: 'rgba(8,9,12,.46)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        padding: isMobile ? 0 : 24,
        animation: 'fadeIn .18s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: isMobile ? '100%' : 760,
          maxHeight: isMobile ? '84vh' : '80vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: isMobile ? '22px 22px 0 0' : 18,
          boxShadow: '0 18px 54px rgba(0,0,0,.28)',
          animation: isMobile ? 'sheetUp .26s cubic-bezier(.2,.8,.2,1)' : 'modalIn .2s ease',
        }}
      >
        <div style={{ padding: isMobile ? '8px 12px 13px' : '18px 16px 15px', borderBottom: '1px solid var(--line-soft)' }}>
          {isMobile && <div style={{ width: 38, height: 4, borderRadius: 3, background: 'var(--line)', margin: '0 auto 15px' }} />}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ font: '800 20px/1.15 var(--ui)', margin: 0 }}>{title}</h2>
              <div className="num" style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 6 }}>{subtitle}</div>
            </div>
            <button className="iconbtn" onClick={onClose} aria-label="Закрыть" style={{ width: 34, height: 34 }}>{I.close}</button>
          </div>
        </div>

        <div style={{ overflow: 'auto', padding: isMobile ? '12px 10px calc(18px + env(safe-area-inset-bottom))' : '16px 16px 18px' }}>
          {kind === 'mileage' ? <MileageHistory report={report} /> : kind === 'incidents' ? <IncidentHistory report={report} /> : <ChecksHistory report={report} />}
        </div>
      </div>
    </div>
  );
}

function MileageHistory({ report }: { report: AutotekaReportDto }) {
  if (report.mileage.length === 0) {
    return <EmptyHistory text="В импортированном отчёте нет точек пробега." />;
  }
  const sorted = [...report.mileage].sort((a, b) => {
    const at = a.date ? new Date(a.date).getTime() : 0;
    const bt = b.date ? new Date(b.date).getTime() : 0;
    return at - bt;
  });
  const latest = sorted[sorted.length - 1];
  const anomalies = sorted.filter((p) => p.anomaly);
  const keyPoints = anomalies.length ? anomalies : [latest];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="card" style={{ padding: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 7 }}>последняя запись</div>
            <div className="num" style={{ fontSize: 22, fontWeight: 800 }}>{fmt(latest.mileage)} км</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 5 }}>{dt(latest.date)}</div>
          </div>
          <div>
            <div className="eyebrow" style={{ marginBottom: 7 }}>динамика</div>
            <div className="num" style={{ fontSize: 15, fontWeight: 800, color: anomalies.length ? 'var(--live)' : 'var(--ok)' }}>
              {anomalies.length ? `${anomalies.length} аномал.` : 'без явных аномалий'}
            </div>
            {report.mileageSubtitle && <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 5 }}>{report.mileageSubtitle}</div>}
          </div>
        </div>
        <MileageChart points={sorted} />
        {report.mileageConclusion?.text && (
          <div style={{ fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.45, marginTop: 10 }}>
            {report.mileageConclusion.text}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div className="eyebrow" style={{ margin: 0 }}>{anomalies.length ? 'аномальные записи' : 'последняя запись'}</div>
        <div className="num" style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>{sorted.length} точек в отчёте</div>
      </div>

      {keyPoints.map((p) => (
        <HistoryRow key={p.id} point={p} />
      ))}
    </div>
  );
}

function MileageChart({ points }: { points: AutotekaReportDto['mileage'] }) {
  const values = points.map((p) => p.mileage);
  const maxMileage = Math.max(...values);
  const minWidth = Math.max(520, points.length * 58);

  return (
    <div style={{ overflowX: 'auto', overflowY: 'hidden', paddingBottom: 4 }} aria-label="Гистограмма истории пробега">
      <div style={{ minWidth, height: 236, display: 'grid', gridTemplateColumns: `repeat(${points.length}, minmax(44px, 1fr))`, gap: 10, alignItems: 'end', padding: '8px 2px 0' }}>
        {points.map((p) => {
          const height = Math.max(8, Math.round((p.mileage / Math.max(1, maxMileage)) * 132));
          const label = p.mileage >= 1000 ? `${Math.round(p.mileage / 1000)}к` : String(p.mileage);
          const year = yearOf(p.date);
          return (
            <div key={p.id} title={`${fmt(p.mileage)} км · ${dt(p.date)}${p.event ? ` · ${p.event}` : ''}`} style={{ minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
              <div className="num" style={{ fontSize: 11.5, fontWeight: 800, color: p.anomaly ? 'var(--live)' : 'var(--text-dim)', minHeight: 15 }}>
                {label}
              </div>
              <div style={{ height: 136, display: 'flex', alignItems: 'flex-end', width: '100%', justifyContent: 'center', borderBottom: '1px solid var(--line-soft)' }}>
                <div
                  style={{
                    width: '72%',
                    maxWidth: 34,
                    minWidth: 14,
                    height,
                    borderRadius: '7px 7px 2px 2px',
                    background: p.anomaly
                      ? 'linear-gradient(180deg, color-mix(in srgb, var(--live) 78%, #fff), color-mix(in srgb, var(--live) 88%, #111))'
                      : 'linear-gradient(180deg, #8ea4b8, #526b80)',
                    opacity: p.mileage === 0 ? 0.3 : 0.82,
                    boxShadow: p.anomaly ? '0 0 0 4px color-mix(in srgb, var(--live) 10%, transparent)' : '0 6px 14px -12px rgba(30, 52, 70, .55)',
                  }}
                />
              </div>
              <div style={{ minHeight: 18, textAlign: 'center', minWidth: 0 }}>
                <div className="num" style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)' }}>{year ?? ''}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HistoryRow({ point }: { point: AutotekaReportDto['mileage'][number] }) {
  return (
    <div className="card" style={{ padding: '11px 13px', display: 'grid', gridTemplateColumns: '112px 1fr', gap: 12, alignItems: 'start', borderColor: point.anomaly ? 'color-mix(in srgb, var(--live) 34%, var(--line))' : undefined }}>
      <div>
        <div className="num" style={{ fontSize: 14.5, fontWeight: 800, color: point.anomaly ? 'var(--live)' : 'var(--text)' }}>{fmt(point.mileage)} км</div>
        <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 5 }}>{dt(point.date)}</div>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.35 }}>{point.event ?? point.title ?? 'Запись пробега'}</div>
        <div style={{ fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.4, marginTop: 5 }}>
          {[point.source, point.location].filter(Boolean).join(' · ')}
        </div>
        {point.anomaly && point.description && (
          <div style={{ fontSize: 12.5, color: 'var(--live)', lineHeight: 1.4, marginTop: 7 }}>{point.description}</div>
        )}
      </div>
    </div>
  );
}

function IncidentHistory({ report }: { report: AutotekaReportDto }) {
  if (report.incidents.length === 0) {
    return <EmptyHistory text="В импортированном отчёте нет событий повреждений." />;
  }
  const visible = report.incidents.slice(0, 8);
  const damageLabels = uniq(report.incidents.flatMap((i) => i.damages.map((d) => d.description ?? d.subject).filter(Boolean) as string[])).slice(0, 12);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="card" style={{ padding: 16 }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>повреждения</div>
        <div className="num" style={{ fontSize: 24, fontWeight: 900, color: 'var(--live)' }}>{report.incidentsTitle ?? `${report.incidentsCount} событий`}</div>
        {damageLabels.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 16 }}>
            {damageLabels.slice(0, 8).map((label) => <span key={label} className="chip" style={{ cursor: 'default' }}>{label}</span>)}
          </div>
        )}
      </div>

      <div className="eyebrow" style={{ margin: 0 }}>хронология</div>
      <div className="card" style={{ padding: '4px 0' }}>
        {visible.map((item, index) => (
          <IncidentTimelineItem key={item.id} item={item} last={index === visible.length - 1} />
        ))}
      </div>
      {report.incidents.length > visible.length && (
        <div style={{ fontSize: 12.5, color: 'var(--text-faint)', textAlign: 'center' }}>
          Показаны основные события: {visible.length} из {report.incidents.length}.
        </div>
      )}
    </div>
  );
}

function IncidentTimelineItem({ item, last }: { item: AutotekaReportDto['incidents'][number]; last: boolean }) {
  const isEstimate = item.title.toLowerCase().includes('расч');
  const isRepair = item.title.toLowerCase().includes('ремонт');
  const tone = isEstimate ? '#8a6a2d' : isRepair ? '#7a3f4f' : '#526b80';
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '28px minmax(0, 1fr)', gap: 10, padding: '12px 13px 0' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <span style={{ width: 22, height: 22, borderRadius: '50%', background: `${tone}18`, border: `2px solid ${tone}`, display: 'grid', placeItems: 'center', color: tone }}>
          <span style={{ width: 10, height: 10, display: 'inline-flex' }}>{isEstimate ? I.doc : I.alert}</span>
        </span>
        {!last && <span style={{ width: 1, flex: 1, minHeight: 44, background: 'var(--line-soft)', marginTop: 7 }} />}
      </div>
      <div style={{ minWidth: 0, paddingBottom: last ? 12 : 18, borderBottom: last ? 'none' : '1px solid var(--line-soft)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
          <div className="num" style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--text-faint)' }}>{item.date ?? 'Без даты'}</div>
          {item.price && <div className="num" style={{ fontSize: 12, fontWeight: 900, color: 'var(--live)', overflowWrap: 'anywhere', textAlign: 'right' }}>{item.price}</div>}
        </div>
        <div style={{ fontSize: 14.5, fontWeight: 800, lineHeight: 1.32, overflowWrap: 'anywhere' }}>{item.title}</div>
        {item.damages.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 10 }}>
            {item.damages.slice(0, 4).map((d, i) => (
              <span key={`${item.id}-${d.description}-${i}`} className="chip" style={{ cursor: 'default', maxWidth: '100%', overflowWrap: 'anywhere', whiteSpace: 'normal', lineHeight: 1.25 }}>
                {d.description ?? d.subject ?? 'Повреждение'}
              </span>
            ))}
            {item.damages.length > 4 && <span className="chip" style={{ cursor: 'default', color: 'var(--text-faint)' }}>+{item.damages.length - 4}</span>}
          </div>
          )}
      </div>
    </div>
  );
}

function EmptyHistory({ text }: { text: string }) {
  return (
    <div className="card" style={{ padding: '18px 16px', color: 'var(--text-dim)', fontSize: 13.5, lineHeight: 1.45 }}>
      {text}
    </div>
  );
}

function ChecksHistory({ report }: { report: AutotekaReportDto }) {
  const checks = report.checks ?? [];
  const owners = report.owners ?? [];
  const legal = checks.filter((c) => c.group === 'legal');
  const commercial = checks.filter((c) => c.group === 'commercial');
  const hasData = legal.length > 0 || commercial.length > 0 || owners.length > 0;
  if (!hasData) return <EmptyHistory text="В отчёте нет данных для этого раздела." />;
  const warnings = checks.filter((c) => c.status === 'warning' || c.status === 'bad');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="card" style={{ padding: 16, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <span style={{ width: 38, height: 38, borderRadius: 12, display: 'grid', placeItems: 'center', flex: 'none', color: warnings.length ? 'var(--live)' : 'var(--ok)', background: warnings.length ? 'color-mix(in srgb, var(--live) 10%, transparent)' : 'color-mix(in srgb, var(--ok) 12%, transparent)' }}>
          <Ic d={warnings.length ? I.alert : I.shield} s={19} />
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 850 }}>{warnings.length ? `Есть предупреждения: ${warnings.length}` : 'Критичных рисков не найдено'}</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.45, marginTop: 6 }}>
            {owners.length ? `Владельцев в истории: ${owners.length}` : 'Данные о владельцах не найдены'}
          </div>
        </div>
      </div>

      <CheckSection title="Юридическая чистота" items={legal} />
      <CheckSection title="Коммерческое использование" items={commercial} />

      {owners.length > 0 && (
        <div className="card" style={{ padding: '14px 15px' }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>владельцы</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10 }}>
            {owners.map((o) => (
              <div key={`${o.title}-${o.period}`} style={{ padding: '10px 11px', border: '1px solid var(--line-soft)', borderRadius: 10, background: 'var(--surface-2)' }}>
                <div className="num" style={{ fontSize: 11.5, fontWeight: 850, color: 'var(--text-faint)' }}>{o.title}</div>
                <div style={{ fontSize: 13, fontWeight: 800, lineHeight: 1.35, marginTop: 6 }}>{o.period ?? 'Период не указан'}</div>
                <div style={{ fontSize: 12.2, color: 'var(--text-dim)', lineHeight: 1.35, marginTop: 5 }}>{[o.duration, o.type, o.region].filter(Boolean).join(' · ')}</div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

function checksSubtitle(report: AutotekaReportDto): string {
  const parts: string[] = [];
  const checks = report.checks?.length ?? 0;
  const owners = report.owners?.length ?? 0;
  if (checks > 0) parts.push(`${checks} пунктов`);
  if (owners > 0) parts.push(`${owners} владельцев`);
  return parts.length ? parts.join(' · ') : 'нет данных';
}

function CheckSection({ title, items }: { title: string; items: AutotekaReportDto['checks'] }) {
  const visible = items.filter((item) => item.status !== 'unknown');
  if (!visible.length) return null;
  return (
    <div className="card" style={{ padding: '14px 15px' }}>
      <div className="eyebrow" style={{ marginBottom: 10 }}>{title}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
        {visible.map((item) => {
          const ok = item.status === 'ok';
          return (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0, padding: '9px 10px', borderRadius: 10, background: ok ? 'var(--surface-2)' : 'color-mix(in srgb, var(--live) 8%, transparent)', border: `1px solid ${ok ? 'var(--line-soft)' : 'color-mix(in srgb, var(--live) 22%, var(--line))'}` }}>
              <span style={{ width: 22, height: 22, borderRadius: '50%', display: 'grid', placeItems: 'center', flex: 'none', color: ok ? 'var(--ok)' : 'var(--live)', background: ok ? 'color-mix(in srgb, var(--ok) 10%, transparent)' : 'color-mix(in srgb, var(--live) 10%, transparent)' }}>
                <Ic d={ok ? I.check : I.alert} s={12} />
              </span>
              <span style={{ fontSize: 12.8, lineHeight: 1.32, color: ok ? 'var(--text-dim)' : 'var(--text)', overflowWrap: 'anywhere' }}>{item.title}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Отчёт Автотеки: PDF/ссылка и импортированные данные истории. */
export function AutotekaReport({ lot }: { lot: LotDto }) {
  const [modal, setModal] = useState<ModalKind | null>(null);
  const report = lot.autotekaReport;
  const historyButtonStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    minHeight: 38,
    lineHeight: 1,
    textAlign: 'center' as const,
    whiteSpace: 'nowrap' as const,
  };

  if (!lot.autotekaPdfUrl && !report) {
    return (
      <div className="card" style={{ padding: '14px 15px', display: 'flex', alignItems: 'center', gap: 11 }}>
        <span style={{ width: 18, height: 18, color: 'var(--text-faint)', flex: 'none' }}>{I.doc}</span>
        <span style={{ fontSize: 13, color: 'var(--text-faint)' }}>Отчёт Автотеки готовится — появится до старта торгов</span>
      </div>
    );
  }

  return (
    <>
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '13px 15px', display: 'flex', alignItems: 'center', gap: 11 }}>
          <span style={{ width: 30, height: 30, borderRadius: 8, background: '#d6f0e0', color: '#1f8a52', display: 'grid', placeItems: 'center', flex: 'none', fontWeight: 800, fontSize: 13, fontFamily: 'var(--num)' }}>А</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>Отчёт Автотеки</div>
            <div className="num" style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 3 }}>
              {lot.vin ? `VIN ${lot.vin}` : report?.vin ? `VIN ${report.vin}` : 'История автомобиля'}
            </div>
          </div>
          <span className="num" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: 'var(--ok)', flex: 'none' }}>
            <span style={{ width: 13, height: 13 }}>{I.check}</span> проверка пройдена
          </span>
        </div>

        {report && (
          <div style={{ padding: '0 15px 13px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
            <button className="wchip" onClick={() => setModal('mileage')} style={historyButtonStyle}>
              <Ic d={I.road} s={15} /> История пробега
            </button>
            <button className="wchip" onClick={() => setModal('incidents')} style={historyButtonStyle}>
              <Ic d={I.alert} s={15} /> ДТП и повреждения
            </button>
            <button className="wchip" onClick={() => setModal('checks')} style={historyButtonStyle}>
              <Ic d={I.shield} s={15} /> Проверки
            </button>
          </div>
        )}

        {lot.autotekaPdfUrl && (
          <a
            href={lot.autotekaPdfUrl}
            target="_blank"
            rel="noreferrer"
            style={{ textDecoration: 'none', padding: '13px 15px', display: 'flex', gap: 10, alignItems: 'center', background: 'var(--surface-2)', borderTop: '1px solid var(--line-soft)', color: 'var(--text)' }}
          >
            <Ic d={I.doc} s={16} />
            <span style={{ fontSize: 12.5, color: 'var(--text-dim)', flex: 1 }}>Полный отчёт о юридической чистоте</span>
            <span className="num" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--accent)', whiteSpace: 'nowrap' }}>Открыть отчёт</span>
          </a>
        )}
      </div>

      {report && modal && <AutotekaModal report={report} kind={modal} onClose={() => setModal(null)} />}
    </>
  );
}
