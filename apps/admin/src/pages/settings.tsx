import { useEffect, useState } from 'react';
import { fmt, NOTIFICATION_EVENTS, type NotificationEvent } from '@hermes/shared';
import {
  useAddresses,
  useCreateAddress,
  useDeleteAddress,
  useSaveSettings,
  useSettings,
  type AdminSettings,
} from '../lib/queries';
import { useToast } from '../components/toast';

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

const NOTIF_LABELS: Record<NotificationEvent, string> = {
  outbid: 'Перебили ставку',
  won: 'Победа в торгах',
  lot_starting: 'Старт торгов',
  lot_ending: 'Скоро финал',
  lot_extended: 'Продление торгов',
  lot_withdrawn: 'Лот снят',
  deal_update: 'Статус сделки',
};

/** События лота, постящиеся в TG-канал (ключи совпадают с TgLotEvent на бэке). */
const TG_EVENTS = ['published', 'opened', 'sold', 'finished', 'withdrawn'] as const;
const TG_EVENT_LABELS: Record<(typeof TG_EVENTS)[number], string> = {
  published: 'Новый лот (опубликован)',
  opened: 'Старт торгов',
  sold: 'Продан',
  finished: 'Торги завершены',
  withdrawn: 'Снят с торгов',
};

export function SettingsPage() {
  const { data } = useSettings();
  const save = useSaveSettings();
  const { data: addresses = [] } = useAddresses();
  const createAddress = useCreateAddress();
  const deleteAddress = useDeleteAddress();
  const [addr, setAddr] = useState({ label: '', fullAddress: '', city: '' });
  const [form, setForm] = useState<AdminSettings | null>(null);
  const toast = useToast();

  useEffect(() => {
    if (data && !form) setForm(data);
  }, [data, form]);

  if (!form) return <div className="content fade" />;

  const up = (patch: Partial<AdminSettings>) => setForm((f) => (f ? { ...f, ...patch } : f));
  const setC = (k: string, v: string) => up({ managerContacts: { ...form.managerContacts, [k]: v } });
  const contacts = form.managerContacts;

  const addAddress = () => {
    if (!addr.label.trim() || !addr.fullAddress.trim()) return;
    createAddress.mutate(
      { label: addr.label.trim(), fullAddress: addr.fullAddress.trim(), city: addr.city.trim() || undefined },
      { onSuccess: () => setAddr({ label: '', fullAddress: '', city: '' }) },
    );
  };

  const onSave = () =>
    save.mutate(form, {
      onSuccess: () => toast.ok('Сохранено'),
      onError: (e) => toast.error(`Не удалось сохранить: ${e.message}`),
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
          <div className="ph"><div><h3>Адреса (точки выдачи)</h3><div className="sub">справочник точек осмотра и выдачи авто</div></div></div>
          <div style={{ padding: 20 }}>
            {addresses.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {addresses.map((a) => (
                  <div
                    key={a.id}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--panel2)' }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ font: '600 14px/1.2 var(--ui)' }}>{a.label}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--dim)', marginTop: 4 }}>
                        {a.fullAddress}{a.city ? ` · ${a.city}` : ''}
                      </div>
                    </div>
                    <button
                      className="iconbtn2"
                      title="Удалить адрес"
                      disabled={deleteAddress.isPending}
                      onClick={() => deleteAddress.mutate(a.id)}
                      style={{ width: 30, height: 30, fontSize: 15, flex: 'none' }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 18px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="fld-l">Название</label>
                <input className="in" value={addr.label} onChange={(e) => setAddr((a) => ({ ...a, label: e.target.value }))} placeholder="Шоурум на Ленинском" />
              </div>
              <div>
                <label className="fld-l">Адрес</label>
                <input className="in" value={addr.fullAddress} onChange={(e) => setAddr((a) => ({ ...a, fullAddress: e.target.value }))} placeholder="Ленинский пр-т, 1" />
              </div>
              <div>
                <label className="fld-l">Город</label>
                <input className="in" value={addr.city} onChange={(e) => setAddr((a) => ({ ...a, city: e.target.value }))} placeholder="Москва" />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, marginTop: 16 }}>
              <div className="hint" style={{ margin: 0 }}>адреса выбираются при создании лота</div>
              <button className="btn" disabled={createAddress.isPending || !addr.label.trim() || !addr.fullAddress.trim()} onClick={addAddress}>Добавить адрес</button>
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
          <div className="set-row">
            <div className="info">
              <div className="t">Пауза между уведомлениями о продлении</div>
              <div className="d">Чтобы при серии продлений не слать пуш каждый раз. 0 — слать всегда. Таймер у покупателя обновляется в любом случае.</div>
            </div>
            <div className="ctl">
              <Stepper val={form.extendThrottleSec} set={(n) => up({ extendThrottleSec: n })} delta={30} suf="сек" />
            </div>
          </div>
        </div>

        <div className="pcard">
          <div className="ph"><div><h3>Уведомления покупателям</h3><div className="sub">выключенный тип не доставляется никому</div></div></div>
          {NOTIFICATION_EVENTS.map((k) => (
            <div className="set-row" key={k}>
              <div className="info"><div className="t">{NOTIF_LABELS[k]}</div></div>
              <div className="ctl">
                <div
                  className={`tg ${form.notificationToggles[k] !== false ? 'on' : ''}`}
                  onClick={() => up({ notificationToggles: { ...form.notificationToggles, [k]: form.notificationToggles[k] === false } })}
                ></div>
              </div>
            </div>
          ))}
        </div>

        <div className="pcard">
          <div className="ph"><div><h3>Telegram-канал</h3><div className="sub">бот публикует события лотов в канал</div></div></div>
          <div style={{ padding: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 18px' }}>
              <div>
                <label className="fld-l">Токен бота</label>
                <input
                  className="in num"
                  type="password"
                  autoComplete="off"
                  value={form.telegramBotToken}
                  onChange={(e) => up({ telegramBotToken: e.target.value })}
                  placeholder="123456:ABC-DEF…"
                />
              </div>
              <div>
                <label className="fld-l">ID канала</label>
                <input
                  className="in num"
                  value={form.telegramChannelId}
                  onChange={(e) => up({ telegramChannelId: e.target.value })}
                  placeholder="@hermes_trade или -100…"
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="fld-l">Контакт под постом</label>
                <input
                  className="in"
                  value={form.telegramContact}
                  onChange={(e) => up({ telegramContact: e.target.value })}
                  placeholder="@example"
                />
              </div>
            </div>
            <div className="hint">бот публикует события лотов в канал; оставьте токен/ID пустыми, чтобы выключить</div>
            <div style={{ marginTop: 18 }}>
              <label className="fld-l">Какие события постить</label>
              {TG_EVENTS.map((k) => (
                <div className="set-row" key={k}>
                  <div className="info"><div className="t">{TG_EVENT_LABELS[k]}</div></div>
                  <div className="ctl">
                    <div
                      className={`tg ${form.tgEventToggles[k] !== false ? 'on' : ''}`}
                      onClick={() => up({ tgEventToggles: { ...form.tgEventToggles, [k]: form.tgEventToggles[k] === false } })}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn ghost" disabled={!data} onClick={() => data && setForm(data)}>Сбросить</button>
          <button className="btn acc" disabled={save.isPending} onClick={onSave}>Сохранить параметры</button>
        </div>
      </div>
    </div>
  );
}
