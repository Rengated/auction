/* hifi-sell.jsx — submit a car to auction */

function Field({ label, children }) {
  return (
    <div>
      <label className="lbl">{label}</label>
      {children}
    </div>
  );
}

function ScreenSell({ onBack }) {
  const [sent, setSent] = React.useState(false);

  if (sent) {
    return (
      <div className="screen screen-enter">
        <StatusBar />
        <div className="body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 30px', textAlign: 'center' }}>
          <div style={{ width: 66, height: 66, borderRadius: '50%', background: 'color-mix(in srgb, var(--ok) 16%, transparent)', display: 'grid', placeItems: 'center', color: 'var(--ok)' }}>
            <span style={{ width: 32, height: 32 }}>{I.check}</span>
          </div>
          <div className="title-xl" style={{ marginTop: 20 }}>Заявка отправлена</div>
          <div style={{ color: 'var(--text-dim)', fontSize: 14, marginTop: 12, lineHeight: 1.55 }}>
            Эксперт проверит автомобиль и документы, затем согласует с вами дату торгов и стартовую цену.
          </div>
        </div>
        <div style={{ flex: 'none', padding: '12px 22px calc(20px + env(safe-area-inset-bottom))' }}>
          <button className="btn accent block" onClick={onBack}>Готово</button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen screen-enter">
      <StatusBar />
      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '4px 16px 12px' }}>
        <button className="iconbtn" onClick={onBack}>{I.back}</button>
        <div>
          <div className="eyebrow">продавцу</div>
          <div className="title-lg" style={{ fontSize: 18, marginTop: 3 }}>Выставить авто</div>
        </div>
      </div>
      <div className="body" style={{ padding: '4px 18px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label="фотографии">
          <div className="drop">
            <span style={{ width: 24, height: 24, color: 'var(--text-faint)' }}>{I.camera}</span>
            <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>Добавьте 6–12 фото</span>
            <span className="num" style={{ fontSize: 11 }}>экстерьер, салон, документы</span>
          </div>
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
          <Field label="марка"><input className="fld" placeholder="BMW" /></Field>
          <Field label="модель"><input className="fld" placeholder="X5" /></Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
          <Field label="год"><input className="fld num" inputMode="numeric" placeholder="2021" /></Field>
          <Field label="пробег, км"><input className="fld num" inputMode="numeric" placeholder="58 000" /></Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
          <Field label="двигатель"><input className="fld" placeholder="3.0 / 249 л.с." /></Field>
          <Field label="топливо"><input className="fld" placeholder="Бензин" /></Field>
        </div>

        <Field label="желаемая цена (резерв), ₽">
          <input className="fld num" inputMode="numeric" placeholder="3 200 000" />
          <div className="num" style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 8 }}>
            ниже этой цены автомобиль не будет продан
          </div>
        </Field>

        <Field label="комментарий">
          <textarea className="fld" rows={3} placeholder="Состояние, история обслуживания, особенности…" style={{ resize: 'none', lineHeight: 1.5 }} />
        </Field>

        <div className="card" style={{ padding: '12px 14px', display: 'flex', gap: 11, alignItems: 'center' }}>
          <span style={{ width: 19, height: 19, color: 'var(--ok)', flex: 'none' }}>{I.shield}</span>
          <span style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>Бесплатная проверка экспертом перед торгами</span>
        </div>
      </div>
      <div className="bidbar">
        <button className="btn accent block" onClick={() => setSent(true)}>Отправить на проверку</button>
      </div>
    </div>
  );
}

Object.assign(window, { ScreenSell });
