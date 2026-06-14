/* Профиль: мобильные экраны (ScreenProfile / ScreenProfilePage) и веб (сайдбар + панели) из дизайна. */
import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { NOTIFICATION_EVENTS, rub, type DealStatus, type MeDto, type NotificationDto, type NotificationEvent } from '@hermes/shared';
import {
  useConfig,
  useMe,
  useNotifications,
  useUnreadCount,
  useMyBids,
  useSaveContacts,
  useMarkNotificationsRead,
  useMarkNotificationRead,
  useSaveNotificationPrefs,
  logout,
  type MyBidRow,
} from '../lib/queries';
import { useUiStore } from '../lib/ui-store';
import { disablePush, enablePush, getPushState, type PushState } from '../lib/push';
import { useNow } from '../lib/time';
import { useIsMobile } from '../lib/layout';
import { relTime } from '../components/bid-list';
import { Photo } from '../components/photo';
import { I, Ic } from '../components/icons';

/* ============================ общее ============================ */

/** Заголовок/цвет точки по типу уведомления. */
const NOTIF_META: Record<NotificationDto['type'], { title: string; dot: string }> = {
  outbid: { title: 'Вашу ставку перебили', dot: 'var(--live)' },
  won: { title: 'Вы выиграли лот', dot: 'var(--ok)' },
  lot_starting: { title: 'Торги начались', dot: 'var(--accent)' },
  lot_ending: { title: 'Лот скоро закроется', dot: 'var(--live)' },
  lot_extended: { title: 'Торги продлены', dot: 'var(--accent)' },
  lot_withdrawn: { title: 'Лот снят с торгов', dot: 'var(--text-faint)' },
  deal_update: { title: 'Сделка обновлена', dot: 'var(--text-faint)' },
  system: { title: 'Уведомление', dot: 'var(--text-faint)' },
};

const DEAL_TITLES: Record<DealStatus, string> = {
  in_progress: 'Сделка на оформлении',
  completed: 'Сделка завершена',
  cancelled: 'Сделка отменена',
};

const notifTitle = (n: NotificationDto): string => {
  if (n.type === 'lot_starting' && n.payload.phase === 'soon') return 'Скоро старт торгов';
  if (n.type === 'deal_update') {
    const status = n.payload.status as DealStatus | undefined;
    if (status && DEAL_TITLES[status]) return DEAL_TITLES[status];
  }
  return (NOTIF_META[n.type] ?? NOTIF_META.system).title;
};

const notifSub = (n: NotificationDto): string =>
  String(n.payload.lotTitle ?? '') + (n.payload.newAmount ? ` · теперь ${rub(Number(n.payload.newAmount))}` : '');

/** «Сегодня» / «Вчера» / «10 июня» — секции списка уведомлений. */
const dayLabel = (iso: string, now: number): string => {
  const d = new Date(iso);
  const startOf = (t: Date) => new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime();
  const days = Math.round((startOf(new Date(now)) - startOf(d)) / 86_400_000);
  if (days === 0) return 'Сегодня';
  if (days === 1) return 'Вчера';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
};

const initialOf = (me: MeDto): string => (me.displayName?.trim().charAt(0) || '?').toUpperCase();

function Avatar({ me, size }: { me: MeDto; size: number }) {
  const base = {
    width: size, height: size, borderRadius: '50%', flex: 'none',
    background: 'var(--surface-2)', border: '1px solid var(--line)',
  } as const;
  if (me.avatarUrl) {
    return <img src={me.avatarUrl} alt="" style={{ ...base, objectFit: 'cover' as const, display: 'block' }} />;
  }
  return (
    <div style={{ ...base, display: 'grid', placeItems: 'center', font: `700 ${Math.round(size * 0.37)}px/1 var(--num)`, color: 'var(--accent)' }}>
      {initialOf(me)}
    </div>
  );
}

/** Редактируемая форма контактов — общая для мобайла и веба. */
function PersonalForm({ me, mobile, onSaved }: { me: MeDto; mobile: boolean; onSaved: () => void }) {
  const save = useSaveContacts();
  const [fullName, setFullName] = useState(me.contacts.fullName ?? '');
  const [phone, setPhone] = useState(me.contacts.phone ?? '');
  const [email, setEmail] = useState(me.contacts.email ?? '');
  const [err, setErr] = useState<string | null>(null);

  const submit = () => {
    // Валидация: имя и телефон обязательны
    if (!fullName.trim() || !phone.trim()) {
      setErr('Укажите имя и телефон — они обязательны');
      return;
    }
    setErr(null);
    save.mutate(
      { fullName: fullName.trim(), phone: phone.trim(), email: email.trim() || undefined },
      { onSuccess: onSaved },
    );
  };

  const fields: Array<[string, string, (v: string) => void, string]> = [
    ['Имя', fullName, setFullName, 'Александр Соколов'],
    ['Телефон', phone, setPhone, '+7 900 000-00-00'],
    ['Email', email, setEmail, 'you@mail.ru'],
  ];

  return (
    <div>
      {!me.contactsFilled && (
        <div className="card" style={{ padding: mobile ? '13px 15px' : '14px 18px', marginBottom: 14, display: 'flex', gap: 11, alignItems: 'flex-start', borderColor: 'color-mix(in srgb, var(--accent) 38%, var(--line))' }}>
          <span style={{ width: 17, height: 17, color: 'var(--accent)', flex: 'none', marginTop: 1 }}>{I.shield}</span>
          <span style={{ fontSize: mobile ? 13 : 13.5, color: 'var(--text-dim)', lineHeight: 1.5 }}>
            Заполните контактные данные, чтобы участвовать в торгах. Их увидит только менеджер для связи по сделке.
          </span>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
        {fields.map(([label, value, set, ph]) => (
          <div key={label}>
            <label className="lbl">{label}</label>
            <input className="fld" value={value} placeholder={ph} onChange={(e) => set(e.target.value)} />
          </div>
        ))}
      </div>
      {err && <div className="num" style={{ fontSize: 12, color: 'var(--live)', marginTop: 10 }}>{err}</div>}
      <button className={mobile ? 'btn accent block' : 'wbtn accent'} style={{ marginTop: 16 }} onClick={submit} disabled={save.isPending}>
        {me.contactsFilled ? 'Сохранить' : 'Заполнить и сохранить'}
      </button>
    </div>
  );
}

/** Тоггл Web Push: подписка на пуши «перебили / выигран / скоро конец». */
function PushToggle() {
  const { data: cfg } = useConfig();
  const [state, setState] = useState<PushState>('off');
  useEffect(() => {
    getPushState().then(setState);
  }, []);
  if (state === 'unsupported' || !cfg?.vapidPublicKey) return null;
  const on = state === 'on';
  return (
    <div className="card" style={{ padding: '13px 15px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Push-уведомления</div>
        <div className="num" style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 4 }}>
          {state === 'denied' ? 'заблокированы в настройках браузера' : 'перебитие, победа, финал торгов — даже при закрытом приложении'}
        </div>
      </div>
      <button
        className={`chip ${on ? 'on' : ''}`}
        disabled={state === 'denied'}
        onClick={async () => {
          setState(on ? await disablePush() : await enablePush(cfg.vapidPublicKey!));
        }}
      >
        {on ? 'включены' : 'включить'}
      </button>
    </div>
  );
}

/** Переключатель темы оформления — карточка в настройках профиля. */
function ThemeCard() {
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  return (
    <div className="card" style={{ padding: '13px 15px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Тема оформления</div>
        <div className="num" style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 4 }}>тёмная или светлая — сохраняется на устройстве</div>
      </div>
      <button className={`chip ${theme === 'light' ? 'on' : ''}`} onClick={toggleTheme}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Ic d={theme === 'dark' ? I.moon : I.sun} s={13} /> {theme === 'dark' ? 'Тёмная' : 'Светлая'}
        </span>
      </button>
    </div>
  );
}

/** Мини-переключатель вкл/выкл для настроек уведомлений. */
function PrefSwitch({ on, dim, onClick }: { on: boolean; dim?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={dim}
      style={{
        width: 36, height: 21, borderRadius: 11, padding: 0, flex: 'none', position: 'relative',
        cursor: dim ? 'default' : 'pointer', opacity: dim ? 0.35 : 1, transition: 'all .15s ease',
        border: `1px solid ${on ? 'color-mix(in srgb, var(--accent) 55%, transparent)' : 'var(--line)'}`,
        background: on ? 'color-mix(in srgb, var(--accent) 20%, transparent)' : 'var(--surface-2)',
      }}
    >
      <span style={{ position: 'absolute', top: 2.5, left: on ? 17 : 2.5, width: 14, height: 14, borderRadius: '50%', background: on ? 'var(--accent)' : 'var(--text-faint)', transition: 'left .15s ease' }} />
    </button>
  );
}

const PREF_LABELS: Record<NotificationEvent, string> = {
  outbid: 'Перебили ставку',
  won: 'Победа в торгах',
  lot_starting: 'Старт торгов',
  lot_ending: 'Скоро финал',
  lot_extended: 'Продление торгов',
  lot_withdrawn: 'Лот снят',
  deal_update: 'Статус сделки',
};

/** Настройки событий: лента (in-app) и push по каждому типу. */
function NotifPrefs({ me, mobile }: { me: MeDto; mobile: boolean }) {
  const save = useSaveNotificationPrefs();
  const [push, setPush] = useState<PushState>('off');
  useEffect(() => {
    getPushState().then(setPush);
  }, []);
  const pushOn = push === 'on';
  const col = { width: 44, textAlign: 'center' as const, flex: 'none' as const };
  return (
    <div className="card" style={{ padding: mobile ? '13px 15px' : '15px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 11, borderBottom: '1px solid var(--line-soft)' }}>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>Какие события получать</span>
        <span className="eyebrow" style={col}>лента</span>
        <span className="eyebrow" style={{ ...col, opacity: pushOn ? 1 : 0.4 }}>push</span>
      </div>
      {NOTIFICATION_EVENTS.map((ev, idx) => {
        const p = me.notificationPrefs[ev];
        return (
          <div key={ev} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: idx < NOTIFICATION_EVENTS.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
            <span style={{ flex: 1, fontSize: 13, color: 'var(--text-dim)' }}>{PREF_LABELS[ev]}</span>
            <span style={{ ...col, display: 'inline-flex', justifyContent: 'center' }}>
              <PrefSwitch on={p.inApp} onClick={() => save.mutate({ [ev]: { inApp: !p.inApp } })} />
            </span>
            <span style={{ ...col, display: 'inline-flex', justifyContent: 'center' }}>
              <PrefSwitch on={p.push} dim={!pushOn} onClick={() => save.mutate({ [ev]: { push: !p.push } })} />
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Центр уведомлений: настройки + лента, сгруппированная по дням. */
function NotifList({ mobile }: { mobile: boolean }) {
  const { data: me } = useMe();
  const { data: items = [] } = useNotifications(true);
  const { data: unreadDto } = useUnreadCount();
  const markAll = useMarkNotificationsRead();
  const markOne = useMarkNotificationRead();
  const navigate = useNavigate();
  const now = useNow();
  const unread = unreadDto?.count ?? 0;

  // Группировка по дням (лента приходит отсортированной по убыванию даты)
  const groups: Array<[string, NotificationDto[]]> = [];
  for (const n of items) {
    const label = dayLabel(n.createdAt, now);
    const last = groups[groups.length - 1];
    if (last && last[0] === label) last[1].push(n);
    else groups.push([label, [n]]);
  }

  const open = (n: NotificationDto) => {
    if (!n.readAt) markOne.mutate(n.id);
    const lotId = n.payload.lotId;
    if (typeof lotId === 'string' && lotId) navigate(`/lots/${lotId}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <PushToggle />
      {me && <NotifPrefs me={me} mobile={mobile} />}
      {items.length === 0 ? (
        <div className="card" style={{ padding: '22px 16px', textAlign: 'center', color: 'var(--text-faint)', fontSize: 13 }}>Уведомлений нет</div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 4 }}>
            <span className="num" style={{ fontSize: 12, color: unread > 0 ? 'var(--accent)' : 'var(--text-faint)' }}>
              {unread > 0 ? `непрочитанных · ${unread}` : 'все прочитано'}
            </span>
            {unread > 0 && (
              <button className="chip" onClick={() => markAll.mutate()} disabled={markAll.isPending}>Прочитать все</button>
            )}
          </div>
          {groups.map(([label, list]) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="eyebrow" style={{ margin: '6px 2px 0' }}>{label}</div>
              {list.map((n) => {
                const meta = NOTIF_META[n.type] ?? NOTIF_META.system;
                const isUnread = !n.readAt;
                return (
                  <div
                    key={n.id}
                    className="card"
                    onClick={() => open(n)}
                    style={{
                      padding: mobile ? '13px 15px' : '15px 18px', display: 'flex', gap: mobile ? 12 : 13,
                      alignItems: 'flex-start', cursor: 'pointer',
                      background: isUnread ? 'color-mix(in srgb, var(--accent) 7%, var(--surface))' : undefined,
                    }}
                  >
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: isUnread ? 'var(--accent)' : meta.dot, opacity: isUnread ? 1 : 0.45, marginTop: 5, flex: 'none' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: mobile ? 14 : 14.5, fontWeight: 600 }}>{notifTitle(n)}</div>
                      {notifSub(n) && <div className="num" style={{ fontSize: mobile ? 12 : 12.5, color: 'var(--text-dim)', marginTop: 4 }}>{notifSub(n)}</div>}
                    </div>
                    <span className="num" style={{ fontSize: mobile ? 11 : 11.5, color: 'var(--text-faint)', flex: 'none' }}>{relTime(n.createdAt, now)}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

/** Статус сделки выигранного лота → [подпись, цвет]. */
const DEAL_STATUS_META: Record<DealStatus, [string, string]> = {
  in_progress: ['На оформлении · менеджер свяжется', 'var(--gold)'],
  completed: ['Сделка завершена', 'var(--ok)'],
  cancelled: ['Сделка отменена', 'var(--text-faint)'],
};

/** Карточки выигранных лотов (общие). */
function WonList({ mobile }: { mobile: boolean }) {
  const { data: won = [] } = useMyBids('won');
  const navigate = useNavigate();
  if (won.length === 0) {
    return <div className="card" style={{ padding: '22px 16px', textAlign: 'center', color: 'var(--text-faint)', fontSize: 13 }}>Пока нет выигранных лотов</div>;
  }
  const status = (row: MyBidRow): [string, string] =>
    DEAL_STATUS_META[row.dealStatus ?? 'in_progress'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {won.map((row) => {
        const [label, color] = status(row);
        return (
          <div key={row.lot.id} className="card" style={{ padding: mobile ? 12 : 14 }}>
            <div style={{ display: 'flex', gap: mobile ? 13 : 15, alignItems: 'center' }}>
              <Photo src={row.lot.photos[0]?.card ?? null} h={mobile ? 62 : 70} glyph={row.lot.make[0]} style={{ width: mobile ? 84 : 100, flex: 'none', borderRadius: 9 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: mobile ? 15 : 16, fontWeight: 600 }}>{row.lot.make} {row.lot.model}</div>
                <div className="num" style={{ fontSize: mobile ? 13 : 14, color: 'var(--text-dim)', marginTop: 5 }}>{rub(row.myLastBid)}</div>
                {row.feeAmount != null && (
                  <div className="num" style={{ fontSize: mobile ? 11 : 11.5, color: 'var(--text-dim)', marginTop: 4 }}>
                    комиссия {rub(row.feeAmount)} · к оплате {rub(row.amountDue ?? 0)}
                  </div>
                )}
                <div className="num" style={{ fontSize: mobile ? 11 : 12, marginTop: mobile ? 6 : 7, color, fontWeight: 600 }}>{label}</div>
              </div>
              <span style={{ color: 'var(--text-faint)', transform: 'rotate(180deg)', width: 18, height: 18, flex: 'none' }}>{I.back}</span>
            </div>
            {row.dealNote && (
              <div style={{ fontSize: mobile ? 12 : 12.5, color: 'var(--text-dim)', marginTop: 10, lineHeight: 1.5 }}>
                Менеджер: {row.dealNote}
              </div>
            )}
            <button className={mobile ? 'btn' : 'wbtn'} onClick={() => navigate('/profile/manager')} style={{ marginTop: 11 }}>
              Связаться с менеджером
            </button>
          </div>
        );
      })}
      <div className="card" style={{ padding: '13px 15px', display: 'flex', gap: 11, alignItems: 'center' }}>
        <span style={{ width: 18, height: 18, color: 'var(--text-dim)', flex: 'none' }}>{I.shield}</span>
        <span style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>Документы по сделкам хранятся здесь</span>
      </div>
    </div>
  );
}

/** Телефон → href tel: (цифры и плюс). */
const telHref = (v: string) => `tel:${v.replace(/[^\d+]/g, '')}`;

/** WhatsApp: цифры, ведущая 8 → 7. */
const waHref = (v: string) => {
  let d = v.replace(/\D/g, '');
  if (d.startsWith('8')) d = `7${d.slice(1)}`;
  return `https://wa.me/${d}`;
};

/** MAX: @username → max.ru/{name}, иначе max.ru/u/{цифры}. */
const maxHref = (v: string) =>
  v.startsWith('@') ? `https://max.ru/${v.slice(1)}` : `https://max.ru/u/${v.replace(/\D/g, '')}`;

/** Контакты менеджера — из публичных настроек (useConfig). */
function ManagerBlock({ mobile }: { mobile: boolean }) {
  const { data: cfg } = useConfig();
  const mc = cfg?.managerContacts ?? {};
  const btnCls = mobile ? 'btn block' : 'wbtn';
  const linkStyle = {
    textDecoration: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--text)',
  } as const;
  // [иконка, подпись, значение, href, внешняя ли ссылка] — порядок фиксированный
  const contacts: Array<[ReactNode, string, string, string, boolean]> = [];
  if (mc.phone) contacts.push([I.phone, 'Позвонить', mc.phone, telHref(mc.phone), false]);
  if (mc.telegram) contacts.push([I.telegram, 'Telegram', mc.telegram, `https://t.me/${mc.telegram.replace(/^@/, '')}`, true]);
  if (mc.whatsapp) contacts.push([I.whatsapp, 'WhatsApp', mc.whatsapp, waHref(mc.whatsapp), true]);
  if (mc.max) contacts.push([I.maxIcon, 'MAX', mc.max, maxHref(mc.max), true]);
  if (mc.email) contacts.push([I.mail, 'Почта', mc.email, `mailto:${mc.email}`, false]);
  const name = mc.name?.trim();
  const title = name ? `${name}, ваш менеджер` : 'Менеджер Hermes Trade';
  const initial = (name?.charAt(0) || 'М').toUpperCase();
  return (
    <div>
      <div className="card" style={{ padding: mobile ? 18 : 20, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: mobile ? 54 : 56, height: mobile ? 54 : 56, borderRadius: '50%', background: 'var(--surface-2)', border: '1px solid var(--line)', display: 'grid', placeItems: 'center', font: '700 18px/1 var(--num)', color: 'var(--accent)', flex: 'none' }}>{initial}</div>
        <div>
          <div style={{ font: `700 ${mobile ? 16 : 17}px/1.2 var(--ui)` }}>{title}</div>
          <div className="num" style={{ fontSize: mobile ? 12 : 12.5, color: 'var(--text-dim)', marginTop: 6 }}>на связи 9:00–21:00 МСК</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 14 }}>
        {contacts.length === 0 ? (
          <div className="card" style={{ padding: '16px', textAlign: 'center', color: 'var(--text-faint)', fontSize: 13 }}>Контакты появятся позже</div>
        ) : (
          contacts.map(([icon, label, value, href, ext]) => (
            <a key={label} href={href} className={btnCls} style={linkStyle} {...(ext ? { target: '_blank', rel: 'noreferrer' } : {})}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}><Ic d={icon} s={16} /> {label}</span>
              <span className="num" style={{ color: 'var(--text-dim)', fontSize: 13 }}>{value}</span>
            </a>
          ))
        )}
      </div>
      <div className="card" style={{ marginTop: 16, padding: mobile ? '14px 16px' : '16px 18px' }}>
        <div className={mobile ? 'eyebrow' : 'eyebrow-w'} style={{ marginBottom: mobile ? 9 : 12 }}>чем помогает</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: mobile ? 9 : 10 }}>
          {['Оформление сделки и комиссии после победы', 'Осмотр и проверка автомобиля', 'Доставка в ваш город', 'Вопросы по лотам и ставкам'].map((x) => (
            <div key={x} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: mobile ? 13 : 13.5, color: 'var(--text-dim)' }}>
              <span style={{ width: 15, height: 15, color: 'var(--ok)', flex: 'none' }}>{I.check}</span>{x}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================ мобайл ============================ */

/** Корень профиля (ScreenProfile из дизайна). */
function ScreenProfile({ me }: { me: MeDto }) {
  const navigate = useNavigate();
  const menu: Array<[string, string, string]> = [
    ['won', 'Мои выигранные лоты', 'договоры и статусы сделок'],
    ['notif', 'Уведомления', 'ставки, перебитие, финал торгов'],
    ['manager', 'Связь с менеджером', 'сопровождение сделки'],
    ['personal', 'Личные данные', 'имя, телефон, верификация'],
  ];
  const doLogout = async () => {
    await logout();
    navigate('/auth');
  };
  return (
    <div className="screen screen-enter">
      <div className="body">
        <div style={{ padding: '14px 20px 0' }}>
          <div className="eyebrow" style={{ marginBottom: 7 }}>аккаунт</div>
          <div className="title-xl">Профиль</div>
        </div>
        <div style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'center', gap: 14 }}>
          <Avatar me={me} size={60} />
          <div>
            <div style={{ font: '700 18px/1 var(--ui)' }}>{me.displayName}</div>
            <div className="num" style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Ic d={I.phone} s={13} /> {me.contacts.phone || '—'}
            </div>
          </div>
        </div>
        <div style={{ padding: '20px 20px 18px' }}>
          <div className="card">
            {menu.map((m, i) => (
              <button key={m[0]} onClick={() => navigate(`/profile/${m[0]}`)} style={{ width: '100%', textAlign: 'left', background: 'none', border: 0, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '15px 18px', borderBottom: i < menu.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>{m[1]}</div>
                  <div className="num" style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 4 }}>{m[2]}</div>
                </div>
                <span style={{ color: 'var(--text-faint)', transform: 'rotate(180deg)', width: 18, height: 18, flex: 'none' }}>{I.back}</span>
              </button>
            ))}
          </div>
          <div style={{ marginTop: 14 }}><ThemeCard /></div>
          <button className="btn block" onClick={doLogout} style={{ marginTop: 14, marginBottom: 96, background: 'transparent', border: '1px solid var(--line)', color: 'var(--text-dim)' }}>Выйти из аккаунта</button>
        </div>
      </div>
    </div>
  );
}

function PageHead({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px 12px' }}>
      <button className="iconbtn" onClick={onBack}>{I.back}</button>
      <div className="title-lg" style={{ fontSize: 19 }}>{title}</div>
    </div>
  );
}

/** Подстраницы профиля (ScreenProfilePage из дизайна). */
function ScreenProfilePage({ me, page }: { me: MeDto; page: string }) {
  const navigate = useNavigate();
  const back = () => navigate(-1);

  if (page === 'personal') {
    return (
      <div className="screen screen-enter">
        <PageHead title="Личные данные" onBack={back} />
        <div className="body" style={{ padding: '4px 18px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
            <Avatar me={me} size={56} />
            <span className="chip" style={{ cursor: 'default' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Ic d={I.edit} s={13} /> фото из Яндекс ID</span>
            </span>
          </div>
          <PersonalForm me={me} mobile onSaved={back} />
        </div>
      </div>
    );
  }

  if (page === 'notif') {
    return (
      <div className="screen screen-enter">
        <PageHead title="Уведомления" onBack={back} />
        <div className="body" style={{ padding: '4px 18px 24px' }}>
          <NotifList mobile />
        </div>
      </div>
    );
  }

  if (page === 'won') {
    return (
      <div className="screen screen-enter">
        <PageHead title="Выигранные лоты" onBack={back} />
        <div className="body" style={{ padding: '4px 18px 24px' }}>
          <WonList mobile />
        </div>
      </div>
    );
  }

  // manager
  return (
    <div className="screen screen-enter">
      <PageHead title="Связь с менеджером" onBack={back} />
      <div className="body" style={{ padding: '4px 18px 24px' }}>
        <ManagerBlock mobile />
      </div>
    </div>
  );
}

/* ============================ веб ============================ */

function PanelHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <h2 style={{ font: '800 22px/1 var(--ui)', letterSpacing: '-0.02em', margin: 0 }}>{title}</h2>
      {sub && <div className="num" style={{ fontSize: 13, color: 'var(--text-faint)', marginTop: 8 }}>{sub}</div>}
    </div>
  );
}

/** Веб-профиль: сайдбар + контент-панели (WebProfile из hifi-web-profile.jsx). */
function WebProfile({ me, sec }: { me: MeDto; sec: string }) {
  const navigate = useNavigate();
  const menu: Array<[string, string, ReactNode]> = [
    ['personal', 'Личные данные', I.user],
    ['notif', 'Уведомления', I.bids],
    ['won', 'Выигранные лоты', I.check],
    ['manager', 'Связь с менеджером', I.shield],
  ];
  const doLogout = async () => {
    await logout();
    navigate('/auth');
  };
  return (
    <div className="wrap viewfade">
      <div style={{ padding: '22px 0 0' }}>
        <button className="wbtn ghost" onClick={() => navigate('/')}><span style={{ width: 16, height: 16 }}>{I.back}</span> К каталогу</button>
      </div>
      <div className="page-head" style={{ paddingBottom: 26 }}>
        <div>
          <div className="eyebrow-w">аккаунт</div>
          <h1>Профиль</h1>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 28, alignItems: 'start', paddingBottom: 64 }}>
        {/* сайдбар */}
        <div style={{ position: 'sticky', top: 90 }}>
          <div className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <Avatar me={me} size={52} />
            <div style={{ minWidth: 0 }}>
              <div style={{ font: '700 16px/1 var(--ui)' }}>{me.displayName}</div>
              {me.contactsFilled
                ? <div className="num" style={{ fontSize: 11.5, color: 'var(--ok)', marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 5 }}><Ic d={I.check} s={12} /> верифицирован</div>
                : <div className="num" style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 6 }}>контакты не заполнены</div>}
            </div>
          </div>
          <div className="card" style={{ padding: 6 }}>
            {menu.map(([k, l, ic]) => (
              <button key={k} onClick={() => navigate(`/profile/${k}`)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 11, padding: '12px 13px', border: 0, borderRadius: 9, cursor: 'pointer', textAlign: 'left',
                  background: sec === k ? 'color-mix(in srgb, var(--accent) 13%, transparent)' : 'transparent',
                  color: sec === k ? 'var(--accent)' : 'var(--text)', font: '600 14px/1 var(--ui)' }}>
                <span style={{ width: 18, height: 18, flex: 'none' }}>{ic}</span>{l}
              </button>
            ))}
          </div>
          <button className="wbtn" onClick={doLogout} style={{ width: '100%', justifyContent: 'center', marginTop: 14, background: 'transparent', border: '1px solid var(--line)', color: 'var(--text-dim)' }}>Выйти из аккаунта</button>
        </div>

        {/* контент */}
        <div>
          {sec === 'personal' && (
            <div>
              <PanelHead title="Личные данные" sub="Нужны для участия в торгах и связи менеджера после победы" />
              <div style={{ maxWidth: 560 }}><PersonalForm me={me} mobile={false} onSaved={() => navigate('/profile/personal')} /></div>
            </div>
          )}
          {sec === 'notif' && (
            <div>
              <PanelHead title="Уведомления" sub="События по вашим ставкам и лотам" />
              <div style={{ maxWidth: 640 }}><NotifList mobile={false} /></div>
            </div>
          )}
          {sec === 'won' && (
            <div>
              <PanelHead title="Выигранные лоты" sub="Документы и статусы сделок" />
              <div style={{ maxWidth: 640 }}><WonList mobile={false} /></div>
            </div>
          )}
          {sec === 'manager' && (
            <div>
              <PanelHead title="Связь с менеджером" sub="Сопровождение сделки после победы" />
              <div style={{ maxWidth: 560 }}><ManagerBlock mobile={false} /></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================ страница ============================ */

export function ProfilePage() {
  const isMobile = useIsMobile();
  const { page } = useParams<{ page?: string }>();
  const { data: me } = useMe();

  // Gate выше по дереву гарантирует авторизацию, но тип допускает null
  if (!me) {
    return <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-faint)', fontSize: 14 }}>Загрузка…</div>;
  }

  if (isMobile) {
    return page ? <ScreenProfilePage me={me} page={page} /> : <ScreenProfile me={me} />;
  }
  return <WebProfile me={me} sec={page ?? 'personal'} />;
}
