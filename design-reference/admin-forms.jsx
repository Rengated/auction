/* admin-forms.jsx — add/edit lot, live auction control, settings */

function AddLot({ lot, onBack, relist }) {
  const editing = !!lot;
  const v = lot || {};
  const [published, setPublished] = React.useState(editing && !relist ? !!v.published : false);
  const save = (pub) => { if (editing) lot.published = pub; onBack(); };
  return (
    <div className="content fade">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
        <button className="iconbtn2" onClick={onBack} style={{ width: 38, height: 38 }}>{AI.back}</button>
        <div>
          <div className="crumb">Лоты / {relist ? 'Перевыставление' : editing ? 'Редактирование' : 'Новый лот'}</div>
          <h1 style={{ font: '800 22px/1 var(--ui)', margin: 0, letterSpacing: '-0.02em' }}>{relist ? `Перевыставить · ${v.make} ${v.model}` : editing ? `${v.make} ${v.model}` : 'Добавить автомобиль'}</h1>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          <button className="btn ghost" onClick={() => save(false)}>Сохранить черновик</button>
          <button className="btn acc" onClick={() => save(true)}>{relist ? 'Запустить заново' : editing && v.published ? 'Сохранить' : 'Опубликовать лот'}</button>
        </div>
      </div>

      {relist && (
        <div className="pcard" style={{ marginBottom: 20, borderColor: 'color-mix(in srgb, var(--accent) 40%, var(--line))' }}>
          <div style={{ padding: '16px 20px', display: 'flex', gap: 13, alignItems: 'center' }}>
            <span style={{ width: 22, height: 22, color: 'var(--accent)', flex: 'none' }}>{AI.relist}</span>
            <div style={{ flex: 1 }}>
              <div style={{ font: '700 14.5px/1.2 var(--ui)' }}>Перевыставление лота</div>
              <div className="hint" style={{ marginTop: 6 }}>Прошлый торг завершён без продажи (резерв {fmt(v.reserve)} ₽ не достигнут, макс. ставка {fmt(v.bid)} ₽). Укажите новые даты и при необходимости скорректируйте резерв и стартовую цену — лот запустится заново.</div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>
        {/* left: main fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="pcard">
            <div className="ph"><h3>Фотографии</h3><div className="sub">до 25 фото · экстерьер, салон, документы</div></div>
            <div style={{ padding: 20 }}>
              {editing ? (
                <div className="photo-row">
                  {[0, 1, 2, 3, 4].map(i => <div key={i} className="thumb"><img src={v.img} alt="" /><span className="x">×</span></div>)}
                  <div className="add">{AI.plus}</div>
                </div>
              ) : (
                <div className="dz">{AI.camera}<div style={{ fontSize: 13.5, color: 'var(--dim)' }}>Перетащите фото или нажмите для загрузки</div><div className="num" style={{ fontSize: 11 }}>JPG, PNG · до 25 шт</div></div>
              )}
            </div>
          </div>

          <div className="pcard">
            <div className="ph"><h3>Автомобиль</h3></div>
            <div style={{ padding: 20 }}>
              <div className="form-grid">
                <div><label className="fld-l">Марка</label><input className="in" defaultValue={v.make} placeholder="BMW" /></div>
                <div><label className="fld-l">Модель</label><input className="in" defaultValue={v.model} placeholder="X5 xDrive40i" /></div>
                <div><label className="fld-l">Год выпуска</label><input className="in num" defaultValue={v.year} placeholder="2021" /></div>
                <div><label className="fld-l">Пробег, км</label><input className="in num" defaultValue={v.mileage ? fmt(v.mileage) : ''} placeholder="58 000" /></div>
                <div><label className="fld-l">VIN</label><input className="in" placeholder="WBAXXXXXXXXXXXXXX" /></div>
                <div><label className="fld-l">Кузов</label><input className="in" defaultValue={v.body} placeholder="SUV" /></div>
                <div><label className="fld-l">Двигатель</label><input className="in" defaultValue={v.engine} placeholder="3.0 турбо" /></div>
                <div><label className="fld-l">Мощность, л.с.</label><input className="in num" defaultValue={v.power} placeholder="340" /></div>
                <div><label className="fld-l">Топливо</label><input className="in" defaultValue={v.fuel} placeholder="Бензин" /></div>
                <div><label className="fld-l">Коробка</label><input className="in" defaultValue={v.transmission} placeholder="Автомат · 8 ст." /></div>
                <div className="span2"><label className="fld-l">Описание</label><textarea className="in" defaultValue={v.desc} placeholder="Состояние, история обслуживания, комплектация, особенности…"></textarea></div>
              </div>
            </div>
          </div>

          {/* Autoteka report */}
          <div className="pcard">
            <div className="ph">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 26, height: 26, borderRadius: 7, background: '#d6f0e0', color: '#1f8a52', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 12, fontFamily: 'var(--num)' }}>А</span>
                <div><h3>Отчёт Автотеки</h3><div className="sub">проверка истории — показывается покупателю</div></div>
              </div>
              {editing && v.autoteka && v.autoteka.attached
                ? <span className="sb sold"><span className="dot"></span> прикреплён</span>
                : <span className="sb fin">не прикреплён</span>}
            </div>
            <div style={{ padding: 20 }}>
              {editing && v.autoteka && v.autoteka.attached ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: '1px solid var(--line)', borderRadius: 9, background: 'var(--panel2)' }}>
                    <span style={{ width: 20, height: 20, color: 'var(--accent)', flex: 'none' }}>{AI.doc}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ font: '600 13.5px/1 var(--ui)' }}>autoteka_{String(v.id).padStart(3, '0')}.pdf</div>
                      <div className="num" style={{ fontSize: 11.5, color: 'var(--faint)', marginTop: 5 }}>VIN {v.vin || '—'} · отчёт от {v.autoteka.date}</div>
                    </div>
                    <button className="iconbtn2" title="Просмотр">{AI.eye}</button>
                    <button className="iconbtn2" title="Удалить">{AI.trash}</button>
                  </div>
                  <div style={{ display: 'flex', gap: 9, marginTop: 12 }}>
                    <input className="in" defaultValue={v.vin} placeholder="VIN" style={{ flex: 1 }} />
                    <button className="btn">Обновить из Автотеки</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', gap: 9 }}>
                    <input className="in" defaultValue={v.vin} placeholder="VIN автомобиля" style={{ flex: 1 }} />
                    <button className="btn acc">Запросить отчёт</button>
                  </div>
                  <div className="dz" style={{ marginTop: 12 }}>{AI.doc}<div style={{ fontSize: 13.5, color: 'var(--dim)' }}>Загрузить PDF-отчёт Автотеки</div><div className="num" style={{ fontSize: 11 }}>или подтянуть автоматически по VIN</div></div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* right: auction params */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, position: 'sticky', top: 84 }}>
          <div className="pcard">
            <div className="ph"><h3>Параметры торгов</h3></div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div><label className="fld-l">Стартовая цена, ₽</label><input className="in num" defaultValue={v.reserve ? fmt(v.reserve - 300000) : ''} placeholder="2 800 000" /></div>
              <div><label className="fld-l">Резерв (мин. цена продажи), ₽</label><input className="in num" defaultValue={v.reserve ? fmt(v.reserve) : ''} placeholder="3 200 000" /><div className="hint">ниже резерва авто не продаётся</div></div>
              <div><label className="fld-l">Шаг ставки, ₽</label><input className="in num" defaultValue="20 000" /><div className="hint">по умолчанию из глобальных параметров</div></div>
              <div style={{ height: 1, background: 'var(--line)' }}></div>
              <div><label className="fld-l">Старт торгов</label><input className="in" defaultValue={editing ? '05.06.2026 18:00' : ''} placeholder="дата и время" /></div>
              <div><label className="fld-l">Окончание торгов</label><input className="in" defaultValue={editing ? '06.06.2026 12:00' : ''} placeholder="дата и время" /></div>
            </div>
          </div>
          <div className="pcard" style={{ borderColor: published ? 'color-mix(in srgb, var(--ok) 40%, var(--line))' : 'color-mix(in srgb, var(--gold) 40%, var(--line))' }}>
            <div className="ph"><div><h3>Публикация</h3><div className="sub">видимость в приложении</div></div></div>
            <div style={{ padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14 }}>
              <div><div className="t" style={{ font: '600 14px/1 var(--ui)', color: published ? 'var(--ok)' : 'var(--gold)' }}>{published ? 'Опубликован' : 'Черновик'}</div><div className="hint" style={{ marginTop: 6 }}>{published ? 'виден покупателям в каталоге' : 'скрыт от покупателей, только в админке'}</div></div>
              <div className={`tg ${published ? 'on' : ''}`} onClick={() => setPublished(p => !p)} style={published ? { background: 'var(--ok)' } : null}></div>
            </div>
          </div>
          <div className="pcard">
            <div style={{ padding: '16px 20px', display: 'flex', gap: 11, alignItems: 'flex-start' }}>
              <span style={{ width: 18, height: 18, color: 'var(--gold)', flex: 'none' }}><svg viewBox="0 0 24 24" style={{ width: 18, height: 18, stroke: 'currentColor', fill: 'none', strokeWidth: 1.8 }}><circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 2"/></svg></span>
              <div style={{ fontSize: 12.5, color: 'var(--dim)', lineHeight: 1.5 }}>Комиссия за выкуп <b style={{ color: 'var(--ink)' }}>1.5%</b> применяется автоматически из глобальных параметров.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AuctionControl({ lot, onBack }) {
  const left = Math.max(0, lot.endsIn - 40);
  const feed = ['Александр С.', 'user_77', 'kuznetsov', 'Игорь П.', 'avto_msk', 'd.orlov'].map((u, i) => ({ u, p: lot.bid - i * 20000, t: i === 0 ? 'сейчас' : `${i * 14} сек` }));
  const parts = [
    ['Александр С.', '+7 916 240-11-08', lot.bid, true],
    ['Игорь П.', '+7 903 555-72-19', lot.bid - 20000, false],
    ['kuznetsov', '+7 911 002-44-31', lot.bid - 60000, false],
    ['avto_msk', '+7 922 717-30-55', lot.bid - 140000, false],
  ];
  return (
    <div className="content fade">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
        <button className="iconbtn2" onClick={onBack} style={{ width: 38, height: 38 }}>{AI.back}</button>
        <div>
          <div className="crumb">Торги / Контроль</div>
          <h1 style={{ font: '800 22px/1 var(--ui)', margin: 0, letterSpacing: '-0.02em' }}>{lot.make} {lot.model}</h1>
        </div>
        <span className="sb live" style={{ marginLeft: 12 }}><span className="dot"></span>В ЭФИРЕ</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          <button className="btn ghost"><span style={{ width: 16, height: 16 }}>{AI.eye}</span> Как видит покупатель</button>
        </div>
      </div>

      <div className="lc-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="pcard">
            <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 20 }}>
              <div><div className="l" style={{ font: '600 11px/1 var(--num)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--faint)' }}>Текущая ставка</div><div className="num" style={{ font: '700 26px/1 var(--num)', marginTop: 12 }}>{fmt(lot.bid)} ₽</div></div>
              <div><div className="l" style={{ font: '600 11px/1 var(--num)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--faint)' }}>Резерв</div><div className="num" style={{ font: '700 26px/1 var(--num)', marginTop: 12, color: lot.reserveMet ? 'var(--ok)' : 'var(--dim)' }}>{fmt(lot.reserve)} ₽</div><div style={{ font: '600 11px/1 var(--num)', color: lot.reserveMet ? 'var(--ok)' : 'var(--faint)', marginTop: 9 }}>{lot.reserveMet ? '✓ достигнут' : 'не достигнут'}</div></div>
              <div><div className="l" style={{ font: '600 11px/1 var(--num)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--faint)' }}>Ставок · участн.</div><div className="num" style={{ font: '700 26px/1 var(--num)', marginTop: 12 }}>{lot.bids} · {Math.round(lot.bids * 0.6)}</div></div>
              <div><div className="l" style={{ font: '600 11px/1 var(--num)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--faint)' }}>До конца</div><div className="bigtimer" style={{ font: '700 32px/1 var(--num)', marginTop: 8, color: left <= 120 ? 'var(--live)' : 'var(--ink)' }}>{fmtTime(left)}</div></div>
            </div>
          </div>

          <div className="pcard">
            <div className="ph"><div><h3>Управление торгом</h3><div className="sub">ручной контроль менеджера</div></div></div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="fld-l">Управление таймером</label>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button className="btn"><span style={{ width: 16, height: 16 }}>{AI.plusclock}</span> +30 сек</button>
                  <button className="btn"><span style={{ width: 16, height: 16 }}>{AI.plusclock}</span> +60 сек</button>
                  <button className="btn">Пауза</button>
                  <button className="btn">Закрыть досрочно</button>
                </div>
              </div>
              <div style={{ height: 1, background: 'var(--line)' }}></div>
              <div>
                <label className="fld-l">Изменить шаг ставки</label>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input className="in num" defaultValue="20 000" style={{ maxWidth: 160 }} />
                  <span className="hint" style={{ margin: 0 }}>текущий шаг для этого лота</span>
                </div>
              </div>
              <div style={{ height: 1, background: 'var(--line)' }}></div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button className="btn">Отклонить последнюю ставку</button>
                <button className="btn danger"><span style={{ width: 16, height: 16 }}>{AI.trash}</span> Снять с торгов</button>
              </div>
              <div className="hint" style={{ display: 'flex', gap: 9, alignItems: 'center', marginTop: 2 }}>
                <span style={{ width: 14, height: 14, color: 'var(--gold)' }}><svg viewBox="0 0 24 24" style={{ width: 14, height: 14, stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}><circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 2"/></svg></span>
                Антиснайпинг активен: ставка в последние 15 сек продлевает торги автоматически.
              </div>
            </div>
          </div>

          {/* participants */}
          <div className="pcard">
            <div className="ph"><div><h3>Участники торга</h3><div className="sub">{Math.round(lot.bids * 0.6)} активных · с контактами</div></div></div>
            <table className="tb">
              <thead><tr><th>Участник</th><th>Телефон</th><th>Макс. ставка</th><th></th></tr></thead>
              <tbody>
                {parts.map((p, i) => (
                  <tr className="row" key={i}>
                    <td><div className="lotcell"><div style={{ width: 30, height: 30, borderRadius: '50%', background: p[3] ? 'var(--accent-soft)' : 'var(--panel3)', display: 'grid', placeItems: 'center', font: '700 12px/1 var(--num)', color: p[3] ? 'var(--accent)' : 'var(--dim)', flex: 'none' }}>{p[0][0]}</div><div className="nm" style={{ font: '600 13px/1 var(--ui)' }}>{p[0]}{p[3] && <span className="num" style={{ fontSize: 10, color: 'var(--accent)', marginLeft: 7 }}>ЛИДЕР</span>}</div></div></td>
                    <td className="num" style={{ color: 'var(--dim)' }}>{p[1]}</td>
                    <td className="num" style={{ fontWeight: 600 }}>{fmt(p[2])} ₽</td>
                    <td><div className="row-actions"><button className="iconbtn2" title="Позвонить">{AI.phone}</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="pcard" style={{ position: 'sticky', top: 24 }}>
          <div className="ph"><div><h3>Лента ставок</h3><div className="sub">live · {lot.bids} ставок</div></div><span className="sb live"><span className="dot"></span>live</span></div>
          <div style={{ padding: '4px 20px 14px', maxHeight: 420, overflowY: 'auto' }}>
            {feed.map((r, i) => (
              <div className="feedrow" key={i} style={{ opacity: 1 - i * 0.1 }}>
                <div className="av">{r.u[0]}</div>
                <div style={{ flex: 1 }}><div style={{ font: '600 13.5px/1.2 var(--ui)' }}>{r.u}</div><div className="num" style={{ fontSize: 11, color: 'var(--faint)', marginTop: 3 }}>{r.t}</div></div>
                <div className="num" style={{ fontWeight: 600 }}>{fmt(r.p)} ₽</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Settings() {
  const [fee, setFee] = React.useState(15); // tenths of percent → 1.5%
  const [step, setStep] = React.useState(20000);
  const [snipe, setSnipe] = React.useState(true);
  const [snipeSec, setSnipeSec] = React.useState(15);
  const [autoReserve, setAutoReserve] = React.useState(true);
  const [contacts, setContacts] = React.useState({
    name: 'Михаил Гуров',
    phone: '+7 495 000-00-00',
    email: 'm.gurov@hermes-trade.ru',
    telegram: '@hermes_trade',
    whatsapp: '+7 916 240-11-08',
    max: '@hermes_trade',
  });
  const setC = (k, v) => setContacts(c => ({ ...c, [k]: v }));

  const Stepper = ({ val, set, delta, suf, fmtv }) => (
    <div className="stepper">
      <button onClick={() => set(Math.max(0, val - delta))}>−</button>
      <div className="val">{fmtv ? fmtv(val) : val}</div>
      <span className="suf">{suf}</span>
      <button onClick={() => set(val + delta)}>+</button>
    </div>
  );

  return (
    <div className="content fade">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20, maxWidth: 880 }}>
        <div className="pcard">
          <div className="ph"><div><h3>Комиссия и ставки</h3><div className="sub">глобальные параметры — применяются ко всем новым лотам</div></div></div>
          <div className="set-row">
            <div className="info"><div className="t">Комиссия за выкуп</div><div className="d">Процент, который салон берёт с победителя за выкуп автомобиля. Показывается покупателю в расчёте «итого при выигрыше».</div></div>
            <div className="ctl"><Stepper val={fee} set={setFee} delta={1} suf="%" fmtv={(x) => (x / 10).toLocaleString('ru-RU', { minimumFractionDigits: 1 })} /></div>
          </div>
          <div className="set-row">
            <div className="info"><div className="t">Шаг ставки по умолчанию</div><div className="d">Минимальный шаг повышения ставки. Можно переопределить для отдельного лота.</div></div>
            <div className="ctl"><Stepper val={step} set={setStep} delta={5000} suf="₽" fmtv={(x) => fmt(x)} /></div>
          </div>
          <div className="set-row">
            <div className="info"><div className="t">Округление ставок</div><div className="d">Разрешить только ставки, кратные шагу.</div></div>
            <div className="ctl"><div className={`tg ${autoReserve ? 'on' : ''}`} onClick={() => setAutoReserve(!autoReserve)}></div></div>
          </div>
        </div>

        <div className="pcard">
          <div className="ph"><div><h3>Контакты менеджера</h3><div className="sub">показываются покупателю после победы — в приложении и письме</div></div></div>
          <div style={{ padding: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 18px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="fld-l">Имя менеджера</label>
                <input className="in" value={contacts.name} onChange={(e) => setC('name', e.target.value)} placeholder="Имя Фамилия" />
              </div>
              <div>
                <label className="fld-l">Телефон</label>
                <input className="in num" value={contacts.phone} onChange={(e) => setC('phone', e.target.value)} placeholder="+7 ___ ___-__-__" />
              </div>
              <div>
                <label className="fld-l">Почта</label>
                <input className="in" value={contacts.email} onChange={(e) => setC('email', e.target.value)} placeholder="mail@hermes-trade.ru" />
              </div>
              <div>
                <label className="fld-l">Telegram</label>
                <input className="in" value={contacts.telegram} onChange={(e) => setC('telegram', e.target.value)} placeholder="@username" />
              </div>
              <div>
                <label className="fld-l">WhatsApp</label>
                <input className="in num" value={contacts.whatsapp} onChange={(e) => setC('whatsapp', e.target.value)} placeholder="+7 ___ ___-__-__" />
              </div>
              <div>
                <label className="fld-l">MAX</label>
                <input className="in" value={contacts.max} onChange={(e) => setC('max', e.target.value)} placeholder="@username или телефон" />
              </div>
            </div>
            <div style={{ marginTop: 18, padding: '14px 16px', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--panel2)' }}>
              <div className="fld-l" style={{ marginBottom: 12 }}>Предпросмотр у покупателя</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--panel3)', display: 'grid', placeItems: 'center', font: '700 15px/1 var(--num)', color: 'var(--accent)', flex: 'none' }}>{(contacts.name || 'М')[0]}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: '600 14px/1.2 var(--ui)' }}>{contacts.name || '—'}</div>
                  <div className="num" style={{ fontSize: 12, color: 'var(--dim)', marginTop: 5 }}>ваш менеджер по сделке</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
                {contacts.phone && <span className="sb" style={{ background: 'var(--panel3)', color: 'var(--ink)' }}>☎ {contacts.phone}</span>}
                {contacts.telegram && <span className="sb" style={{ background: '#d9ebf7', color: '#2b6fa0' }}>Telegram {contacts.telegram}</span>}
                {contacts.whatsapp && <span className="sb" style={{ background: '#dcf0e0', color: '#1f8a52' }}>WhatsApp {contacts.whatsapp}</span>}
                {contacts.max && <span className="sb" style={{ background: '#e7e0fb', color: '#5b3fd0' }}>MAX {contacts.max}</span>}
                {contacts.email && <span className="sb" style={{ background: 'var(--panel3)', color: 'var(--ink)' }}>✉ {contacts.email}</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="pcard">
          <div className="ph"><div><h3>Антиснайпинг</h3><div className="sub">защита от ставок в последнюю секунду</div></div></div>
          <div className="set-row">
            <div className="info"><div className="t">Автопродление торгов</div><div className="d">Если ставка сделана в финальные секунды — таймер продлевается, чтобы все успели ответить.</div></div>
            <div className="ctl"><div className={`tg ${snipe ? 'on' : ''}`} onClick={() => setSnipe(!snipe)}></div></div>
          </div>
          {snipe && (
            <div className="set-row">
              <div className="info"><div className="t">Окно продления</div><div className="d">За сколько секунд до конца ставка продлевает торги.</div></div>
              <div className="ctl"><Stepper val={snipeSec} set={setSnipeSec} delta={5} suf="сек" /></div>
            </div>
          )}
        </div>

        <div className="pcard">
          <div className="ph"><div><h3>Уведомления покупателям</h3><div className="sub">push и события</div></div></div>
          <div className="set-row"><div className="info"><div className="t">«Вашу ставку перебили»</div></div><div className="ctl"><div className="tg on"></div></div></div>
          <div className="set-row"><div className="info"><div className="t">«Лот скоро закроется»</div></div><div className="ctl"><div className="tg on"></div></div></div>
          <div className="set-row"><div className="info"><div className="t">«Старт торгов по избранному»</div></div><div className="ctl"><div className="tg on"></div></div></div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn ghost">Сбросить</button>
          <button className="btn acc">Сохранить параметры</button>
        </div>
      </div>
    </div>
  );
}

function AddUser({ user, onBack }) {
  const editing = !!user;
  const v = user || {};
  const [role, setRole] = React.useState(v.role || 'buyer');
  const [blocked, setBlocked] = React.useState(!!v.block);
  const [mode, setMode] = React.useState(v.block && !v.block.until ? 'perm' : 'until');
  const [until, setUntil] = React.useState(v.block && v.block.until ? v.block.until : '');
  const [reason, setReason] = React.useState(v.block ? v.block.reason : '');

  const save = () => {
    if (editing) {
      user.block = blocked ? { until: mode === 'perm' ? null : (until || 'не указана'), reason: reason || 'Без указания причины' } : null;
      user.role = role;
    }
    onBack();
  };
  return (
    <div className="content fade">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
        <button className="iconbtn2" onClick={onBack} style={{ width: 38, height: 38 }}>{AI.back}</button>
        <div>
          <div className="crumb">Пользователи / {editing ? 'Карточка' : 'Новый'}</div>
          <h1 style={{ font: '800 22px/1 var(--ui)', margin: 0, letterSpacing: '-0.02em' }}>{editing ? v.name : 'Новый пользователь'}</h1>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          <button className="btn ghost" onClick={onBack}>Отмена</button>
          <button className="btn acc" onClick={save}>{editing ? 'Сохранить' : 'Создать'}</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>
        <div className="pcard">
          <div className="ph"><h3>Данные пользователя</h3></div>
          <div style={{ padding: 20 }}>
            <div className="form-grid">
              <div className="span2"><label className="fld-l">ФИО</label><input className="in" defaultValue={v.name} placeholder="Иван Иванов" /></div>
              <div><label className="fld-l">Телефон</label><input className="in num" defaultValue={v.phone} placeholder="+7 900 000-00-00" /></div>
              <div><label className="fld-l">Email</label><input className="in" defaultValue={v.email} placeholder="mail@example.ru" /></div>
              <div><label className="fld-l">Город</label><input className="in" defaultValue={v.city} placeholder="Москва" /></div>
              <div><label className="fld-l">Яндекс ID</label><input className="in" defaultValue={editing ? 'yandex:483920104' : ''} placeholder="привязка после первого входа" /></div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="pcard">
            <div className="ph"><h3>Роль и доступ</h3></div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="fld-l">Роль</label>
                <div style={{ display: 'flex', gap: 7 }}>
                  {[['buyer', 'Покупатель'], ['manager', 'Менеджер'], ['admin', 'Админ']].map(([k, l]) => (
                    <button key={k} className="btn sm" onClick={() => setRole(k)} style={{ flex: 1, justifyContent: 'center', ...(role === k ? { background: 'var(--accent-soft)', color: 'var(--accent)' } : { background: 'transparent', border: '1px solid var(--line2)' }) }}>{l}</button>
                  ))}
                </div>
                <div className="hint">{role === 'buyer' ? 'Может делать ставки и выигрывать лоты.' : role === 'manager' ? 'Доступ к админке: лоты, торги, сделки.' : 'Полный доступ, включая параметры.'}</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6 }}>
                <div><div className="t" style={{ font: '600 14px/1 var(--ui)' }}>Верифицирован</div><div className="hint" style={{ marginTop: 6 }}>паспорт проверен</div></div>
                <div className={`tg ${v.verified ? 'on' : ''}`}></div>
              </div>
            </div>
          </div>

          {/* blocking */}
          <div className="pcard" style={{ borderColor: blocked ? 'color-mix(in srgb, var(--live) 40%, var(--line))' : 'var(--line)' }}>
            <div className="ph"><div><h3>Блокировка</h3><div className="sub">запрет ставок и входа</div></div></div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div><div className="t" style={{ font: '600 14px/1 var(--ui)', color: blocked ? 'var(--live)' : 'var(--ink)' }}>{blocked ? 'Пользователь заблокирован' : 'Доступ открыт'}</div><div className="hint" style={{ marginTop: 6 }}>{blocked ? 'не может делать ставки' : 'участвует в торгах'}</div></div>
                <div className={`tg ${blocked ? 'on' : ''}`} onClick={() => setBlocked(b => !b)} style={blocked ? { background: 'var(--live)' } : null}></div>
              </div>

              {blocked && (
                <React.Fragment>
                  <div>
                    <label className="fld-l">Срок</label>
                    <div style={{ display: 'flex', gap: 7 }}>
                      {[['until', 'До даты'], ['perm', 'Навсегда']].map(([k, l]) => (
                        <button key={k} className="btn sm" onClick={() => setMode(k)} style={{ flex: 1, justifyContent: 'center', ...(mode === k ? { background: 'var(--live-soft)', color: 'var(--live)' } : { background: 'transparent', border: '1px solid var(--line2)' }) }}>{l}</button>
                      ))}
                    </div>
                  </div>
                  {mode === 'until' && (
                    <div>
                      <label className="fld-l">Заблокировать до</label>
                      <input className="in num" value={until} onChange={(e) => setUntil(e.target.value)} placeholder="дд.мм.гггг" />
                    </div>
                  )}
                  <div>
                    <label className="fld-l">Причина</label>
                    <textarea className="in" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Неоплата лота, накрутка ставок, жалобы…" style={{ minHeight: 64 }}></textarea>
                  </div>
                  <div className="hint" style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{ width: 14, height: 14, color: 'var(--live)', flex: 'none', marginTop: 1 }}>{AI.ban}</span>
                    {mode === 'perm' ? 'Блокировка навсегда — снимается только вручную.' : 'Доступ восстановится автоматически после указанной даты.'}
                  </div>
                </React.Fragment>
              )}
            </div>
          </div>

          {editing && (
            <div className="pcard">
              <div className="ph"><h3>Активность</h3></div>
              <div style={{ padding: 20, display: 'flex', gap: 22 }}>
                <div><div className="l" style={{ font: '600 10px/1 var(--num)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--faint)' }}>Ставок</div><div className="num" style={{ fontSize: 22, fontWeight: 700, marginTop: 8 }}>{v.bids}</div></div>
                <div><div className="l" style={{ font: '600 10px/1 var(--num)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--faint)' }}>Побед</div><div className="num" style={{ fontSize: 22, fontWeight: 700, marginTop: 8 }}>{v.wins}</div></div>
                <div><div className="l" style={{ font: '600 10px/1 var(--num)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--faint)' }}>С нами с</div><div className="num" style={{ fontSize: 15, fontWeight: 600, marginTop: 12 }}>{v.joined}</div></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DealDetail({ deal, onBack }) {
  const fee = Math.round(deal.amt * 0.015);
  const steps = [
    ['Лот выигран', deal.won, true],
    ['Связь с победителем', 'менеджер запросил контакты', deal.status !== 'pending'],
    ['Оформление договора', 'подписание и оплата', deal.status === 'closed' || deal.status === 'contract'],
    ['Выдача / доставка', 'передача автомобиля', deal.status === 'closed'],
  ];
  return (
    <div className="content fade">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
        <button className="iconbtn2" onClick={onBack} style={{ width: 38, height: 38 }}>{AI.back}</button>
        <div>
          <div className="crumb">Сделки / Лот #{String(deal.lotNo).padStart(3, '0')}</div>
          <h1 style={{ font: '800 22px/1 var(--ui)', margin: 0, letterSpacing: '-0.02em' }}>{deal.car}</h1>
        </div>
        <span className={`sb ${DEAL_STATUS[deal.status][1]}`} style={{ marginLeft: 10 }}>{DEAL_STATUS[deal.status][0]}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* winner contacts */}
          <div className="pcard">
            <div className="ph"><div><h3>Контакты победителя</h3><div className="sub">для связи и оформления</div></div></div>
            <div style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--panel3)', display: 'grid', placeItems: 'center', font: '700 21px/1 var(--num)', color: 'var(--accent)', flex: 'none' }}>{deal.who[0]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ font: '700 17px/1 var(--ui)' }}>{deal.who}</div>
                <div className="num" style={{ fontSize: 12.5, color: 'var(--dim)', marginTop: 7 }}>{deal.city} · выиграл {deal.won}</div>
              </div>
            </div>
            <div style={{ padding: '0 20px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <a href={`tel:${deal.phone.replace(/\s/g, '')}`} className="btn" style={{ justifyContent: 'flex-start', textDecoration: 'none' }}><span style={{ width: 16, height: 16 }}>{AI.phone}</span> {deal.phone}</a>
              <a href={`mailto:${deal.email}`} className="btn" style={{ justifyContent: 'flex-start', textDecoration: 'none' }}><span style={{ width: 16, height: 16 }}>{AI.mail}</span> {deal.email}</a>
              <button className="btn acc" style={{ justifyContent: 'center' }}><span style={{ width: 16, height: 16 }}>{AI.msg}</span> Написать в чат</button>
              <button className="btn" style={{ justifyContent: 'center' }}>Открыть карточку клиента</button>
            </div>
          </div>

          {/* deal progress */}
          <div className="pcard">
            <div className="ph"><div><h3>Ход сделки</h3><div className="sub">этапы сопровождения</div></div></div>
            <div style={{ padding: '18px 20px' }}>
              {steps.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 14, paddingBottom: i < steps.length - 1 ? 18 : 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 'none' }}>
                    <span style={{ width: 26, height: 26, borderRadius: '50%', background: s[2] ? 'var(--ok)' : 'var(--panel3)', color: s[2] ? '#fff' : 'var(--faint)', display: 'grid', placeItems: 'center', flex: 'none' }}><span style={{ width: 14, height: 14 }}>{s[2] ? AI.check : null}</span></span>
                    {i < steps.length - 1 && <span style={{ width: 2, flex: 1, minHeight: 22, background: 'var(--line)', marginTop: 4 }}></span>}
                  </div>
                  <div><div style={{ font: '600 14px/1.3 var(--ui)', color: s[2] ? 'var(--ink)' : 'var(--dim)' }}>{s[0]}</div><div className="num" style={{ fontSize: 12, color: 'var(--faint)', marginTop: 5 }}>{s[1]}</div></div>
                </div>
              ))}
            </div>
            <div style={{ padding: '0 20px 20px', display: 'flex', gap: 10 }}>
              {deal.status !== 'closed' && <button className="btn acc">Перевести на след. этап</button>}
              <button className="btn"><span style={{ width: 16, height: 16 }}>{AI.doc}</span> Документы</button>
            </div>
          </div>
        </div>

        {/* money + car */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="pcard">
            <img src={deal.img} alt="" style={{ width: '100%', height: 170, objectFit: 'cover', display: 'block' }} />
            <div style={{ padding: 20 }}>
              <div className="l" style={{ font: '600 10px/1 var(--num)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--faint)' }}>Расчёт сделки</div>
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 11 }}>
                <div className="num" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--dim)' }}><span>цена победы</span><span>{fmt(deal.amt)} ₽</span></div>
                <div className="num" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--dim)' }}><span>комиссия 1.5%</span><span style={{ color: 'var(--gold)' }}>{fmt(fee)} ₽</span></div>
                <div className="num" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 17, fontWeight: 700, paddingTop: 11, borderTop: '1px dashed var(--line2)' }}><span>к оплате</span><span>{fmt(deal.amt + fee)} ₽</span></div>
              </div>
            </div>
          </div>
          <div className="pcard">
            <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label className="fld-l" style={{ margin: 0 }}>Заметка по сделке</label>
              <textarea className="in" placeholder="Договорённости, сроки, особенности оплаты…" style={{ minHeight: 90 }}></textarea>
              <button className="btn sm">Сохранить заметку</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AddLot, AddUser, DealDetail, AuctionControl, Settings });
