import { useEffect, useRef, useState } from 'react';
import { fmt } from '@hermes/shared';
import { useSaveSettings, useSettings, type AdminSettings } from '../lib/queries';

function Stepper({ val, set, delta, suf, fmtv }: { val: number; set: (n: number) => void; delta: number; suf: string; fmtv?: (n: number) => string }) {
  const round = (n: number) => Math.round(n * 10000) / 10000;
  return (
    <div className="stepper">
      <button onClick={() => set(Math.max(0, round(val - delta)))}>−</button>
      <div className="val">{fmtv ? fmtv(val) : val}</div>
      <span className="suf">{suf}</span>
      <button onClick={() => set(round(val + delta))}>+</button>
    </div>
  );
}

const CONTACT_FIELDS: Array<[string, string, string, boolean]> = [
  // key, label, placeholder, num-font
  ['phone', 'Телефон', '+7 ___ ___-__-__', true],
  ['email', 'Почта', 'mail@hermes-trade.ru', false],
  ['telegram', 'Telegram', '@username', false],
  ['whatsapp', 'WhatsApp', '+7 ___ ___-__-__', true],
  ['max', 'MAX', '@username или телефон', false],
];

const NOTIF_ROWS: Array<[string, string]> = [
  ['outbid', '«Вашу ставку перебили»'],
  ['lotEnding', '«Лот скоро закроется»'],
  ['lotStarting', '«Старт торгов по избранному»'],
];

export function SettingsPage() {
  const { data } = useSettings();
  const save = useSaveSettings();
  const [form, setForm] = useState<AdminSettings | null>(null);
  const [toast, setToast] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (data && !form) setForm(data);
  }, [data, form]);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  if (!form) return <div className="content fade" />;

  const up = (patch: Partial<AdminSettings>) => setForm((f) => (f ? { ...f, ...patch } : f));
  const setC = (k: string, v: string) => up({ managerContacts: { ...form.managerContacts, [k]: v } });
  const contacts = form.managerContacts;

  const onSave = () =>
    save.mutate(form, {
      onSuccess: () => {
        setToast(true);
        clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(false), 2000);
      },
    });

  return (
    <div className="content fade">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20, maxWidth: 880 }}>
        <div className="pcard">
          <div className="ph"><div><h3>Комиссия и ставки</h3><div className="sub">глобальные параметры — применяются ко всем новым лотам</div></div></div>
          <div className="set-row">
            <div className="info">
              <div className="t">Комиссия за выкуп</div>
              <div className="d">Процент, который салон берёт с победителя за выкуп автомобиля. Показывается покупателю в расчёте «итого при выигрыше».</div>
            </div>
            <div className="ctl">
              <Stepper
                val={form.feeRate}
                set={(n) => up({ feeRate: n })}
                delta={0.001}
                suf="%"
                fmtv={(x) => (x * 100).toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              />
            </div>
          </div>
          <div className="set-row">
            <div className="info">
              <div className="t">Шаг ставки по умолчанию</div>
              <div className="d">Минимальный шаг повышения ставки. Можно переопределить для отдельного лота.</div>
            </div>
            <div className="ctl">
              <Stepper val={form.defaultBidStep} set={(n) => up({ defaultBidStep: n })} delta={5000} suf="₽" fmtv={(x) => fmt(x)} />
            </div>
          </div>
        </div>

        <div className="pcard">
          <div className="ph"><div><h3>Контакты менеджера</h3><div className="sub">показываются покупателю после победы — в приложении и письме</div></div></div>
          <div style={{ padding: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 18px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="fld-l">Имя менеджера</label>
                <input className="in" value={contacts.name ?? ''} onChange={(e) => setC('name', e.target.value)} placeholder="Имя Фамилия" />
              </div>
              {CONTACT_FIELDS.map(([k, label, placeholder, num]) => (
                <div key={k}>
                  <label className="fld-l">{label}</label>
                  <input className={num ? 'in num' : 'in'} value={contacts[k] ?? ''} onChange={(e) => setC(k, e.target.value)} placeholder={placeholder} />
                </div>
              ))}
            </div>
            <div style={{ marginTop: 18, padding: '14px 16px', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--panel2)' }}>
              <div className="fld-l" style={{ marginBottom: 12 }}>Предпросмотр у покупателя</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--panel3)', display: 'grid', placeItems: 'center', font: '700 15px/1 var(--num)', color: 'var(--accent)', flex: 'none' }}>
                  {(contacts.name || 'М')[0]}
                </div>
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
            <div className="info">
              <div className="t">Автопродление торгов</div>
              <div className="d">Если ставка сделана в финальные секунды — таймер продлевается, чтобы все успели ответить.</div>
            </div>
            <div className="ctl">
              <div className={`tg ${form.antisnipeEnabled ? 'on' : ''}`} onClick={() => up({ antisnipeEnabled: !form.antisnipeEnabled })}></div>
            </div>
          </div>
          {form.antisnipeEnabled && (
            <>
              <div className="set-row">
                <div className="info">
                  <div className="t">Окно продления</div>
                  <div className="d">За сколько секунд до конца ставка продлевает торги.</div>
                </div>
                <div className="ctl">
                  <Stepper val={form.antisnipeWindowSec} set={(n) => up({ antisnipeWindowSec: n })} delta={5} suf="сек" />
                </div>
              </div>
              <div className="set-row">
                <div className="info">
                  <div className="t">Продление на</div>
                  <div className="d">На сколько секунд продлевается таймер после такой ставки.</div>
                </div>
                <div className="ctl">
                  <Stepper val={form.antisnipeExtensionSec} set={(n) => up({ antisnipeExtensionSec: n })} delta={5} suf="сек" />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="pcard">
          <div className="ph"><div><h3>Уведомления покупателям</h3><div className="sub">push и события</div></div></div>
          {NOTIF_ROWS.map(([k, label]) => (
            <div className="set-row" key={k}>
              <div className="info"><div className="t">{label}</div></div>
              <div className="ctl">
                <div
                  className={`tg ${form.notificationToggles[k] ? 'on' : ''}`}
                  onClick={() => up({ notificationToggles: { ...form.notificationToggles, [k]: !form.notificationToggles[k] } })}
                ></div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn ghost" disabled={!data} onClick={() => data && setForm(data)}>Сбросить</button>
          <button className="btn acc" disabled={save.isPending} onClick={onSave}>Сохранить параметры</button>
        </div>
      </div>
      {toast && <div className="toast">Сохранено</div>}
    </div>
  );
}
