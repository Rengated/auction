import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fmt } from '@hermes/shared';
import {
  useAdminLot,
  useCreateLot,
  useDeleteAutoteka,
  useDeletePhoto,
  useRelistLot,
  useSettings,
  useUpdateLot,
  useUploadAutoteka,
  useUploadPhotos,
  type LotFormPayload,
} from '../lib/queries';
import { AI, Ic } from '../components/icons';

interface FormState {
  make: string;
  model: string;
  year: string;
  mileage: string;
  vin: string;
  body: string;
  engine: string;
  power: string;
  fuel: string;
  transmission: string;
  drive: string;
  color: string;
  description: string;
  startPrice: string;
  reservePrice: string;
  bidStep: string;
  feeRate: string;
  startsAt: string;
  endsAt: string;
}

const EMPTY: FormState = {
  make: '', model: '', year: '', mileage: '', vin: '', body: '', engine: '', power: '',
  fuel: '', transmission: '', drive: '', color: '', description: '',
  startPrice: '', reservePrice: '', bidStep: '', feeRate: '', startsAt: '', endsAt: '',
};

const MAX_PHOTO_BYTES = 15 * 1024 * 1024;
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

/** Доля 0.015 → строка процента «1.5» без хвостов плавающей точки. */
const ratePct = (rate: number): string => String(Math.round(rate * 10000) / 100);

/** «58 000» → 58000; пустая/нечисловая строка → NaN. */
const num = (s: string): number => parseInt(s.replace(/[^\d]/g, ''), 10);
/** ISO → значение для input type="datetime-local". */
const isoToLocal = (iso: string): string => (iso ? iso.slice(0, 16) : '');

export function LotFormPage({ relist }: { relist?: boolean }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const editing = Boolean(id) && !relist;
  const { data: lot } = useAdminLot(id);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [published, setPublished] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [mediaErrors, setMediaErrors] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);

  const { data: settings } = useSettings();
  const createM = useCreateLot();
  const updateM = useUpdateLot(id ?? '');
  const relistM = useRelistLot(id ?? '');
  const upload = useUploadPhotos(id ?? '');
  const delPhoto = useDeletePhoto(id ?? '');
  const uploadPdf = useUploadAutoteka(id ?? '');
  const deletePdf = useDeleteAutoteka(id ?? '');
  const mutation = id ? (relist ? relistM : updateM) : createM;

  useEffect(() => {
    if (!lot || loaded) return;
    setForm({
      make: lot.make,
      model: lot.model,
      year: String(lot.year),
      mileage: fmt(lot.mileage),
      vin: lot.vin ?? '',
      body: lot.body,
      engine: lot.engine,
      power: String(lot.power),
      fuel: lot.fuel,
      transmission: lot.transmission,
      drive: lot.drive,
      color: lot.color,
      description: lot.description,
      startPrice: fmt(lot.startPrice),
      reservePrice: fmt(lot.reservePrice),
      bidStep: lot.lotBidStep != null ? fmt(lot.lotBidStep) : '',
      feeRate: lot.lotFeeRate != null ? ratePct(lot.lotFeeRate) : '',
      startsAt: relist ? '' : isoToLocal(lot.startsAt),
      endsAt: relist ? '' : isoToLocal(lot.endsAt),
    });
    setPublished(relist ? false : lot.published);
    setLoaded(true);
  }, [lot, loaded, relist]);

  const set = (k: keyof FormState) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (pub: boolean) => {
    const errs: string[] = [];
    const year = num(form.year);
    const mileage = num(form.mileage);
    const startPrice = num(form.startPrice);
    const reservePrice = num(form.reservePrice);
    if (!form.make.trim()) errs.push('Укажите марку автомобиля');
    if (!form.model.trim()) errs.push('Укажите модель');
    if (!year) errs.push('Укажите год выпуска');
    if (Number.isNaN(mileage)) errs.push('Укажите пробег');
    if (!startPrice) errs.push('Укажите стартовую цену');
    if (!reservePrice) errs.push('Укажите резервную цену');
    if (!form.startsAt) errs.push('Укажите дату старта торгов');
    if (!form.endsAt) errs.push('Укажите дату окончания торгов');
    if (form.startsAt && form.endsAt && new Date(form.endsAt).getTime() <= new Date(form.startsAt).getTime())
      errs.push('Окончание торгов должно быть позже старта');
    if (startPrice && reservePrice && reservePrice < startPrice)
      errs.push('Резерв не может быть ниже стартовой цены');
    const feePct = form.feeRate.trim() ? parseFloat(form.feeRate.replace(',', '.')) : null;
    if (feePct != null && (Number.isNaN(feePct) || feePct < 0 || feePct > 100))
      errs.push('Комиссия за выкуп — число от 0 до 100%');
    setErrors(errs);
    if (errs.length) return;

    const payload: LotFormPayload = {
      make: form.make.trim(),
      model: form.model.trim(),
      year,
      mileage,
      engine: form.engine.trim(),
      power: num(form.power) || 0,
      fuel: form.fuel.trim(),
      transmission: form.transmission.trim(),
      drive: form.drive.trim(),
      body: form.body.trim(),
      color: form.color.trim(),
      vin: form.vin.trim() || undefined,
      description: form.description.trim() || undefined,
      startPrice,
      reservePrice,
      bidStep: form.bidStep.trim() ? num(form.bidStep) : null,
      feeRate: feePct != null ? feePct / 100 : null,
      startsAt: new Date(form.startsAt).toISOString(),
      endsAt: new Date(form.endsAt).toISOString(),
      published: pub,
    };
    mutation.mutate(payload, { onSuccess: () => navigate('/lots') });
  };

  const onFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!files.length || !id) return;
    const rejected: string[] = [];
    const ok = files.filter((f) => {
      const isVideo = f.type.startsWith('video/');
      const limit = isVideo ? MAX_VIDEO_BYTES : MAX_PHOTO_BYTES;
      if (f.size > limit) {
        rejected.push(`${f.name} — ${isVideo ? 'видео не больше 200 МБ' : 'фото не больше 15 МБ'}`);
        return false;
      }
      return true;
    });
    setMediaErrors(rejected);
    if (ok.length) upload.mutate(ok);
  };

  const onPdf = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file && id) uploadPdf.mutate(file);
  };

  const crumb = relist ? 'Перевыставление' : editing ? 'Редактирование' : 'Новый лот';
  const title = relist
    ? `Перевыставить · ${form.make} ${form.model}`.trim()
    : editing
      ? `${form.make} ${form.model}`.trim() || 'Лот'
      : 'Добавить автомобиль';
  const accLabel = relist ? 'Запустить заново' : editing && lot?.published ? 'Сохранить' : 'Опубликовать лот';

  return (
    <div className="content fade">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
        <button className="iconbtn2" onClick={() => navigate('/lots')} style={{ width: 38, height: 38 }}>{AI.back}</button>
        <div>
          <div className="crumb">Лоты / {crumb}</div>
          <h1 style={{ font: '800 22px/1 var(--ui)', margin: 0, letterSpacing: '-0.02em' }}>{title}</h1>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          <button className="btn ghost" disabled={mutation.isPending} onClick={() => submit(false)}>Сохранить черновик</button>
          <button className="btn acc" disabled={mutation.isPending} onClick={() => submit(true)}>{accLabel}</button>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="pcard" style={{ marginBottom: 20, borderColor: 'color-mix(in srgb, var(--live) 50%, var(--line))' }}>
          <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {errors.map((e, i) => (
              <div key={i} style={{ font: '600 13px/1.4 var(--ui)', color: 'var(--live)' }}>{e}</div>
            ))}
          </div>
        </div>
      )}
      {mutation.isError && (
        <div className="pcard" style={{ marginBottom: 20, borderColor: 'color-mix(in srgb, var(--live) 50%, var(--line))' }}>
          <div style={{ padding: '14px 20px', font: '600 13px/1.4 var(--ui)', color: 'var(--live)' }}>
            Не удалось сохранить: {mutation.error.message}
          </div>
        </div>
      )}

      {relist && lot && (
        <div className="pcard" style={{ marginBottom: 20, borderColor: 'color-mix(in srgb, var(--accent) 40%, var(--line))' }}>
          <div style={{ padding: '16px 20px', display: 'flex', gap: 13, alignItems: 'center' }}>
            <span style={{ width: 22, height: 22, color: 'var(--accent)', flex: 'none' }}>{AI.relist}</span>
            <div style={{ flex: 1 }}>
              <div style={{ font: '700 14.5px/1.2 var(--ui)' }}>Перевыставление лота</div>
              <div className="hint" style={{ marginTop: 6 }}>
                Прошлый торг завершён без продажи (резерв {fmt(lot.reservePrice)} ₽ не достигнут, макс. ставка {fmt(lot.currentPrice)} ₽).
                Укажите новые даты и при необходимости скорректируйте резерв и стартовую цену — лот запустится заново.
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>
        {/* левая колонка: основные поля */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="pcard">
            <div className="ph"><h3>Фотографии</h3><div className="sub">до 50 фото и видео · экстерьер, салон, документы</div></div>
            <div style={{ padding: 20 }}>
              {id ? (
                <>
                  {mediaErrors.length > 0 && (
                    <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {mediaErrors.map((m, i) => (
                        <div key={i} style={{ font: '600 12.5px/1.4 var(--ui)', color: 'var(--live)' }}>{m}</div>
                      ))}
                    </div>
                  )}
                  <div className="photo-row" style={{ marginTop: 0 }}>
                    {(lot?.photos ?? []).map((p) => (
                      <div key={p.id} className="thumb">
                        {p.kind === 'video' ? (
                          <>
                            <video src={p.card} preload="metadata" muted style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                            <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
                              <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,0,0,.55)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 10 }}>▶</span>
                            </span>
                          </>
                        ) : p.card ? (
                          <img src={p.card} alt="" />
                        ) : null}
                        <span className="x" onClick={() => delPhoto.mutate(p.id)}>×</span>
                      </div>
                    ))}
                    <div className="add" onClick={() => fileRef.current?.click()}><Ic d={AI.plus} s={20} /></div>
                  </div>
                  <input ref={fileRef} type="file" multiple accept="image/*,video/mp4,video/webm,video/quicktime" hidden onChange={onFiles} />
                </>
              ) : (
                <div className="dz">
                  <Ic d={AI.camera} s={26} />
                  <div style={{ fontSize: 13.5, color: 'var(--dim)' }}>Сначала сохраните лот, затем добавьте фото и видео</div>
                  <div className="num" style={{ fontSize: 11 }}>JPG, PNG, MP4 · до 50 шт</div>
                </div>
              )}
            </div>
          </div>

          <div className="pcard">
            <div className="ph"><h3>Автомобиль</h3></div>
            <div style={{ padding: 20 }}>
              <div className="form-grid">
                <div><label className="fld-l">Марка</label><input className="in" value={form.make} onChange={set('make')} placeholder="BMW" /></div>
                <div><label className="fld-l">Модель</label><input className="in" value={form.model} onChange={set('model')} placeholder="X5 xDrive40i" /></div>
                <div><label className="fld-l">Год выпуска</label><input className="in num" value={form.year} onChange={set('year')} placeholder="2021" /></div>
                <div><label className="fld-l">Пробег, км</label><input className="in num" value={form.mileage} onChange={set('mileage')} placeholder="58 000" /></div>
                <div><label className="fld-l">VIN</label><input className="in" value={form.vin} onChange={set('vin')} placeholder="WBAXXXXXXXXXXXXXX" /></div>
                <div><label className="fld-l">Кузов</label><input className="in" value={form.body} onChange={set('body')} placeholder="SUV" /></div>
                <div><label className="fld-l">Двигатель</label><input className="in" value={form.engine} onChange={set('engine')} placeholder="3.0 турбо" /></div>
                <div><label className="fld-l">Мощность, л.с.</label><input className="in num" value={form.power} onChange={set('power')} placeholder="340" /></div>
                <div><label className="fld-l">Топливо</label><input className="in" value={form.fuel} onChange={set('fuel')} placeholder="Бензин" /></div>
                <div><label className="fld-l">Коробка</label><input className="in" value={form.transmission} onChange={set('transmission')} placeholder="Автомат · 8 ст." /></div>
                <div><label className="fld-l">Привод</label><input className="in" value={form.drive} onChange={set('drive')} placeholder="Полный" /></div>
                <div><label className="fld-l">Цвет</label><input className="in" value={form.color} onChange={set('color')} placeholder="Чёрный" /></div>
                <div className="span2"><label className="fld-l">Описание</label><textarea className="in" value={form.description} onChange={set('description')} placeholder="Состояние, история обслуживания, комплектация, особенности…"></textarea></div>
              </div>
            </div>
          </div>

          {/* отчёт Автотеки */}
          <div className="pcard">
            <div className="ph">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 26, height: 26, borderRadius: 7, background: '#d6f0e0', color: '#1f8a52', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 12, fontFamily: 'var(--num)' }}>А</span>
                <div><h3>Отчёт Автотеки</h3><div className="sub">проверка истории — показывается покупателю</div></div>
              </div>
              {lot?.autotekaPdfUrl
                ? <span className="sb sold"><span className="dot"></span> прикреплён</span>
                : <span className="sb fin">не прикреплён</span>}
            </div>
            <div style={{ padding: 20 }}>
              {uploadPdf.isError && (
                <div style={{ marginBottom: 12, font: '600 12.5px/1.4 var(--ui)', color: 'var(--live)' }}>
                  Не удалось загрузить отчёт: {uploadPdf.error.message}
                </div>
              )}
              {id && lot?.autotekaPdfUrl ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--panel2)' }}>
                  <span style={{ width: 22, height: 22, color: 'var(--accent)', flex: 'none' }}>{AI.doc}</span>
                  <div style={{ flex: 1, font: '600 13.5px/1.2 var(--ui)' }}>PDF-отчёт прикреплён</div>
                  <a className="btn sm" href={lot.autotekaPdfUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>Открыть</a>
                  <button
                    className="iconbtn2"
                    title="Удалить отчёт"
                    disabled={deletePdf.isPending}
                    onClick={() => deletePdf.mutate()}
                    style={{ width: 30, height: 30, fontSize: 15 }}
                  >
                    ×
                  </button>
                </div>
              ) : id ? (
                <>
                  <div className="dz" style={{ cursor: 'pointer' }} onClick={() => pdfRef.current?.click()}>
                    <Ic d={AI.doc} s={26} />
                    <div style={{ fontSize: 13.5, color: 'var(--dim)' }}>{uploadPdf.isPending ? 'Загрузка…' : 'Загрузить PDF-отчёт Автотеки'}</div>
                    <div className="num" style={{ fontSize: 11 }}>PDF · до 25 МБ</div>
                  </div>
                  <input ref={pdfRef} type="file" accept="application/pdf" hidden onChange={onPdf} />
                </>
              ) : (
                <div className="dz">
                  <Ic d={AI.doc} s={26} />
                  <div style={{ fontSize: 13.5, color: 'var(--dim)' }}>Сначала сохраните лот, затем прикрепите отчёт</div>
                  <div className="num" style={{ fontSize: 11 }}>PDF · до 25 МБ</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* правая колонка: параметры торгов */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, position: 'sticky', top: 84 }}>
          <div className="pcard">
            <div className="ph"><h3>Параметры торгов</h3></div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label className="fld-l">Стартовая цена, ₽</label>
                <input className="in num" value={form.startPrice} onChange={set('startPrice')} placeholder="2 800 000" />
              </div>
              <div>
                <label className="fld-l">Резерв (мин. цена продажи), ₽</label>
                <input className="in num" value={form.reservePrice} onChange={set('reservePrice')} placeholder="3 200 000" />
                <div className="hint">ниже резерва авто не продаётся</div>
              </div>
              <div>
                <label className="fld-l">Шаг ставки, ₽</label>
                <input className="in num" value={form.bidStep} onChange={set('bidStep')} placeholder="20 000" />
                <div className="hint">по умолчанию из глобальных параметров</div>
              </div>
              <div>
                <label className="fld-l">Комиссия за выкуп, %</label>
                <input className="in num" value={form.feeRate} onChange={set('feeRate')} placeholder={settings ? ratePct(settings.feeRate) : '1.5'} />
                <div className="hint">по умолчанию из глобальных параметров</div>
              </div>
              <div style={{ height: 1, background: 'var(--line)' }}></div>
              <div>
                <label className="fld-l">Старт торгов</label>
                <input className="in num" type="datetime-local" value={form.startsAt} onChange={set('startsAt')} />
              </div>
              <div>
                <label className="fld-l">Окончание торгов</label>
                <input className="in num" type="datetime-local" value={form.endsAt} onChange={set('endsAt')} />
              </div>
            </div>
          </div>
          <div className="pcard" style={{ borderColor: published ? 'color-mix(in srgb, var(--ok) 40%, var(--line))' : 'color-mix(in srgb, var(--gold) 40%, var(--line))' }}>
            <div className="ph"><div><h3>Публикация</h3><div className="sub">видимость в приложении</div></div></div>
            <div style={{ padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14 }}>
              <div>
                <div className="t" style={{ font: '600 14px/1 var(--ui)', color: published ? 'var(--ok)' : 'var(--gold)' }}>{published ? 'Опубликован' : 'Черновик'}</div>
                <div className="hint" style={{ marginTop: 6 }}>{published ? 'виден покупателям в каталоге' : 'скрыт от покупателей, только в админке'}</div>
              </div>
              <div className={`tg ${published ? 'on' : ''}`} onClick={() => setPublished((p) => !p)} style={published ? { background: 'var(--ok)' } : undefined}></div>
            </div>
          </div>
          <div className="pcard">
            <div style={{ padding: '16px 20px', display: 'flex', gap: 11, alignItems: 'flex-start' }}>
              <span style={{ width: 18, height: 18, color: 'var(--gold)', flex: 'none' }}>{AI.clock}</span>
              <div style={{ fontSize: 12.5, color: 'var(--dim)', lineHeight: 1.5 }}>
                Комиссия за выкуп{' '}
                <b style={{ color: 'var(--ink)' }}>
                  {form.feeRate.trim() ? form.feeRate.trim().replace('.', ',') : settings ? ratePct(settings.feeRate).replace('.', ',') : '—'}%
                </b>{' '}
                {form.feeRate.trim() ? '(индивидуальная для лота)' : '(из глобальных параметров)'}.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
