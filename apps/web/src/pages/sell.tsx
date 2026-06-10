import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateSellRequest, useMe } from '../lib/queries';
import { useIsMobile } from '../lib/layout';
import { ApiError } from '../lib/api';
import { I } from '../components/icons';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="lbl">{label}</label>
      {children}
    </div>
  );
}

export function SellPage() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { data: me } = useMe();
  const create = useCreateSellRequest();

  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [mileage, setMileage] = useState('');
  const [price, setPrice] = useState('');
  const [phone, setPhone] = useState('');
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Предзаполняем телефон из профиля, пока поле пустое
  useEffect(() => {
    if (me?.contacts.phone) setPhone((p) => p || me.contacts.phone || '');
  }, [me]);

  const submit = () => {
    const yearN = Number(year.replace(/\D/g, ''));
    const mileageN = Number(mileage.replace(/\D/g, ''));
    if (!make.trim() || !model.trim() || !year.trim() || !mileage.trim() || !phone.trim()) {
      setError('Заполните марку, модель, год, пробег и телефон');
      return;
    }
    if (!Number.isFinite(yearN) || yearN < 1950 || yearN > 2100) {
      setError('Укажите корректный год (1950–2100)');
      return;
    }
    if (!Number.isFinite(mileageN) || mileageN <= 0) {
      setError('Укажите пробег числом');
      return;
    }
    setError(null);
    // Желаемую цену передаём строкой в комментарии
    const fullComment = [price.trim() && `Желаемая цена (резерв): ${price.trim()} ₽`, comment.trim()]
      .filter(Boolean)
      .join('\n');
    create.mutate(
      { make: make.trim(), model: model.trim(), year: yearN, mileage: mileageN, phone: phone.trim(), comment: fullComment || undefined },
      {
        onError: (err) => {
          if (err instanceof ApiError && err.code === 'CONTACTS_REQUIRED') {
            navigate('/profile/personal');
            return;
          }
          setError(err instanceof Error ? err.message : 'Не удалось отправить заявку');
        },
      },
    );
  };

  /* ---------- экран успеха ---------- */
  if (create.isSuccess) {
    const successBody = (
      <>
        <div style={{ width: 66, height: 66, borderRadius: '50%', background: 'color-mix(in srgb, var(--ok) 16%, transparent)', display: 'grid', placeItems: 'center', color: 'var(--ok)' }}>
          <span style={{ width: 32, height: 32 }}>{I.check}</span>
        </div>
        <div className="title-xl" style={{ marginTop: 20 }}>Заявка отправлена</div>
        <div style={{ color: 'var(--text-dim)', fontSize: 14, marginTop: 12, lineHeight: 1.55 }}>
          Эксперт проверит автомобиль и документы, затем согласует с вами дату торгов и стартовую цену.
        </div>
      </>
    );
    if (isMobile) {
      return (
        <div className="screen screen-enter">
          <div className="body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 30px', textAlign: 'center' }}>
            {successBody}
          </div>
          <div style={{ flex: 'none', padding: '12px 22px calc(20px + env(safe-area-inset-bottom))' }}>
            <button className="btn accent block" onClick={() => navigate('/profile')}>Готово</button>
          </div>
        </div>
      );
    }
    return (
      <div className="wrap viewfade">
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '120px 0 64px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          {successBody}
          <button className="wbtn accent" style={{ marginTop: 28, minWidth: 220 }} onClick={() => navigate('/profile')}>Готово</button>
        </div>
      </div>
    );
  }

  /* ---------- форма ---------- */
  const fields = (
    <>
      <Field label="фотографии">
        <div className="drop">
          <span style={{ width: 24, height: 24, color: 'var(--text-faint)' }}>{I.camera}</span>
          <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>Добавьте 6–12 фото</span>
          <span className="num" style={{ fontSize: 11 }}>экстерьер, салон, документы</span>
        </div>
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
        <Field label="марка"><input className="fld" placeholder="BMW" value={make} onChange={(e) => setMake(e.target.value)} /></Field>
        <Field label="модель"><input className="fld" placeholder="X5" value={model} onChange={(e) => setModel(e.target.value)} /></Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
        <Field label="год"><input className="fld num" inputMode="numeric" placeholder="2021" value={year} onChange={(e) => setYear(e.target.value)} /></Field>
        <Field label="пробег, км"><input className="fld num" inputMode="numeric" placeholder="58 000" value={mileage} onChange={(e) => setMileage(e.target.value)} /></Field>
      </div>

      <Field label="желаемая цена (резерв), ₽">
        <input className="fld num" inputMode="numeric" placeholder="3 200 000" value={price} onChange={(e) => setPrice(e.target.value)} />
        <div className="num" style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 8 }}>
          ниже этой цены автомобиль не будет продан
        </div>
      </Field>

      <Field label="телефон для связи">
        <input className="fld num" inputMode="tel" placeholder="+7 ..." value={phone} onChange={(e) => setPhone(e.target.value)} />
      </Field>

      <Field label="комментарий">
        <textarea className="fld" rows={3} placeholder="Состояние, история обслуживания, особенности…" style={{ resize: 'none', lineHeight: 1.5 }} value={comment} onChange={(e) => setComment(e.target.value)} />
      </Field>

      {error && <div style={{ color: 'var(--live)', fontSize: 13 }}>{error}</div>}

      <div className="card" style={{ padding: '12px 14px', display: 'flex', gap: 11, alignItems: 'center' }}>
        <span style={{ width: 19, height: 19, color: 'var(--ok)', flex: 'none' }}>{I.shield}</span>
        <span style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>Бесплатная проверка экспертом перед торгами</span>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <div className="screen screen-enter">
        <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '4px 16px 12px' }}>
          <button className="iconbtn" onClick={() => navigate(-1)}>{I.back}</button>
          <div>
            <div className="eyebrow">продавцу</div>
            <div className="title-lg" style={{ fontSize: 18, marginTop: 3 }}>Выставить авто</div>
          </div>
        </div>
        <div className="body" style={{ padding: '4px 18px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {fields}
        </div>
        <div className="bidbar">
          <button className="btn accent block" onClick={submit} disabled={create.isPending}>
            {create.isPending ? 'Отправляем…' : 'Отправить на проверку'}
          </button>
        </div>
      </div>
    );
  }

  // Веб-раскладка: центрированная форма
  return (
    <div className="wrap viewfade">
      <div className="page-head" style={{ maxWidth: 600, margin: '0 auto' }}>
        <div>
          <div className="eyebrow-w">продавцу</div>
          <h1>Выставить авто</h1>
        </div>
      </div>
      <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 64 }}>
        {fields}
        <button className="wbtn accent" onClick={submit} disabled={create.isPending} style={{ marginTop: 4 }}>
          {create.isPending ? 'Отправляем…' : 'Отправить на проверку'}
        </button>
      </div>
    </div>
  );
}
