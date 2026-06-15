import { useState } from 'react';
import { PAGE_LIMITS } from '@hermes/shared';
import { AI, Ic } from '../components/icons';
import { Pagination } from '../components/pagination';
import {
  useCreateStaff,
  useDeleteUser,
  useMe,
  usePatchStaff,
  usePatchUser,
  useSetStaffPassword,
  useUsers,
  type AdminUser,
  type UsersFilter,
} from '../lib/queries';
import { useToast } from '../components/toast';

const ROLE_LABEL: Record<AdminUser['role'], string> = { buyer: 'Покупатель', manager: 'Менеджер', admin: 'Админ' };

const isBlocked = (u: AdminUser) => u.blockPermanent || Boolean(u.blockedUntil);
const blockLabel = (u: AdminUser) =>
  u.blockPermanent ? 'навсегда' : u.blockedUntil ? `до ${new Date(u.blockedUntil).toLocaleDateString('ru-RU')}` : '';

function UserCard({ user, onBack }: { user: AdminUser; onBack: () => void }) {
  const patch = usePatchUser();
  const [blocked, setBlocked] = useState(isBlocked(user));
  const [mode, setMode] = useState<'until' | 'perm'>(user.blockPermanent ? 'perm' : 'until');
  const [until, setUntil] = useState(user.blockedUntil ? user.blockedUntil.slice(0, 10) : '');
  const [reason, setReason] = useState(user.blockReason ?? '');

  const canSave = !patch.isPending && !(blocked && mode === 'until' && !until);
  const save = () =>
    patch.mutate(
      {
        id: user.id,
        blockedUntil: blocked ? (mode === 'perm' ? 'perm' : new Date(`${until}T23:59:59`).toISOString()) : null,
        blockReason: blocked ? reason : '',
      },
      { onSuccess: onBack },
    );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
        <button className="iconbtn2" onClick={onBack} style={{ width: 38, height: 38 }}>{AI.back}</button>
        <div>
          <div className="crumb">Пользователи / Карточка</div>
          <h1 style={{ font: '800 22px/1 var(--ui)', margin: 0, letterSpacing: '-0.02em' }}>{user.name}</h1>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          <button className="btn ghost" onClick={onBack}>Отмена</button>
          <button className="btn acc" disabled={!canSave} onClick={save}>Сохранить</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>
        <div className="pcard">
          <div className="ph"><h3>Данные пользователя</h3></div>
          <div style={{ padding: 20 }}>
            <div className="form-grid">
              <div className="span2"><label className="fld-l">ФИО</label><input className="in" readOnly value={user.name} /></div>
              <div><label className="fld-l">Телефон</label><input className="in num" readOnly value={user.phone ?? ''} placeholder="—" /></div>
              <div><label className="fld-l">Email</label><input className="in" readOnly value={user.email ?? ''} placeholder="—" /></div>
            </div>
            <div className="hint">Профиль заполняется пользователем при входе через Яндекс ID.</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="pcard">
            <div className="ph"><h3>Роль и доступ</h3></div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="fld-l">Роль</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="sb" style={{ background: 'var(--panel3)', color: 'var(--dim)' }}>{ROLE_LABEL[user.role]}</span>
                </div>
                <div className="hint">
                  Покупатель (вход через Яндекс ID). Роль не меняется — сотрудники создаются отдельно в разделе «Персонал».
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6 }}>
                <div>
                  <div className="t" style={{ font: '600 14px/1 var(--ui)' }}>Контакты</div>
                  <div className="hint" style={{ marginTop: 6 }}>допуск к торгам — по заполненным имени, телефону и почте</div>
                </div>
                {user.verified
                  ? <span className="sb sold"><span className="dot"></span> заполнены</span>
                  : <span className="sb fin">не заполнены</span>}
              </div>
            </div>
          </div>

          {/* blocking */}
          <div className="pcard" style={{ borderColor: blocked ? 'color-mix(in srgb, var(--live) 40%, var(--line))' : 'var(--line)' }}>
            <div className="ph"><div><h3>Блокировка</h3><div className="sub">запрет ставок и входа</div></div></div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div className="t" style={{ font: '600 14px/1 var(--ui)', color: blocked ? 'var(--live)' : 'var(--ink)' }}>
                    {blocked ? 'Пользователь заблокирован' : 'Доступ открыт'}
                  </div>
                  <div className="hint" style={{ marginTop: 6 }}>{blocked ? 'не может делать ставки' : 'участвует в торгах'}</div>
                </div>
                <div className={`tg ${blocked ? 'on' : ''}`} onClick={() => setBlocked((b) => !b)} style={blocked ? { background: 'var(--live)' } : undefined}></div>
              </div>

              {blocked && (
                <>
                  <div>
                    <label className="fld-l">Срок</label>
                    <div style={{ display: 'flex', gap: 7 }}>
                      {([['until', 'До даты'], ['perm', 'Навсегда']] as Array<['until' | 'perm', string]>).map(([k, l]) => (
                        <button
                          key={k}
                          className="btn sm"
                          onClick={() => setMode(k)}
                          style={{
                            flex: 1,
                            justifyContent: 'center',
                            ...(mode === k
                              ? { background: 'var(--live-soft)', color: 'var(--live)' }
                              : { background: 'transparent', border: '1px solid var(--line2)' }),
                          }}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                  {mode === 'until' && (
                    <div>
                      <label className="fld-l">Заблокировать до</label>
                      <input className="in num" type="date" value={until} onChange={(e) => setUntil(e.target.value)} />
                    </div>
                  )}
                  <div>
                    <label className="fld-l">Причина</label>
                    <textarea className="in" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Неоплата лота, накрутка ставок, жалобы…" style={{ minHeight: 64 }}></textarea>
                  </div>
                  <div className="hint" style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{ width: 14, height: 14, color: 'var(--live)', flex: 'none', marginTop: 1, display: 'inline-flex' }}>{AI.ban}</span>
                    {mode === 'perm' ? 'Блокировка навсегда — снимается только вручную.' : 'Доступ восстановится автоматически после указанной даты.'}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="pcard">
            <div className="ph"><h3>Активность</h3></div>
            <div style={{ padding: 20, display: 'flex', gap: 22 }}>
              <div>
                <div className="l" style={{ font: '600 10px/1 var(--num)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--faint)' }}>Ставок</div>
                <div className="num" style={{ fontSize: 22, fontWeight: 700, marginTop: 8 }}>{user.bids}</div>
              </div>
              <div>
                <div className="l" style={{ font: '600 10px/1 var(--num)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--faint)' }}>Побед</div>
                <div className="num" style={{ fontSize: 22, fontWeight: 700, marginTop: 8 }}>{user.wins}</div>
              </div>
              <div>
                <div className="l" style={{ font: '600 10px/1 var(--num)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--faint)' }}>С нами с</div>
                <div className="num" style={{ fontSize: 15, fontWeight: 600, marginTop: 12 }}>{new Date(user.joined).toLocaleDateString('ru-RU')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StaffCreateForm({ onDone }: { onDone: () => void }) {
  const create = useCreateStaff();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<'manager' | 'admin'>('manager');
  const [error, setError] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (create.isPending) return;
    setError('');
    if (password.length < 6) {
      setError('Пароль должен быть не короче 6 символов');
      return;
    }
    create.mutate(
      { username: username.trim(), password, displayName: displayName.trim(), role },
      {
        onSuccess: onDone,
        onError: (err) => setError(err.message || 'Не удалось создать сотрудника'),
      },
    );
  };

  return (
    <form onSubmit={submit} style={{ padding: 20 }}>
      <div className="form-grid">
        <div>
          <label className="fld-l">Логин</label>
          <input className="in" autoComplete="off" value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div>
          <label className="fld-l">Пароль</label>
          <input className="in" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div>
          <label className="fld-l">Имя</label>
          <input className="in" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </div>
        <div>
          <label className="fld-l">Роль</label>
          <select className="in" value={role} onChange={(e) => setRole(e.target.value as 'manager' | 'admin')}>
            <option value="manager">Менеджер</option>
            <option value="admin">Админ</option>
          </select>
        </div>
      </div>
      {error && <div style={{ font: '500 13px/1.4 var(--ui)', color: 'var(--live)', marginTop: 14 }}>{error}</div>}
      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        <button type="button" className="btn ghost" onClick={onDone}>Отмена</button>
        <button type="submit" className="btn acc" disabled={create.isPending || !username.trim() || !password || !displayName.trim()}>
          {create.isPending ? 'Создание…' : 'Создать'}
        </button>
      </div>
    </form>
  );
}

function StaffPasswordForm({ user, onDone }: { user: AdminUser; onDone: () => void }) {
  const setPw = useSetStaffPassword(user.id);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (setPw.isPending) return;
    setError('');
    if (password.length < 6) {
      setError('Пароль должен быть не короче 6 символов');
      return;
    }
    setPw.mutate({ password }, { onSuccess: onDone, onError: (err) => setError(err.message || 'Ошибка') });
  };

  return (
    <form onSubmit={submit} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <input
        className="in"
        type="password"
        autoFocus
        autoComplete="new-password"
        placeholder="Новый пароль"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ width: 180 }}
      />
      <button type="submit" className="btn acc sm" disabled={setPw.isPending || !password}>Сохранить</button>
      <button type="button" className="btn ghost sm" onClick={onDone}>Отмена</button>
      {error && <span style={{ font: '500 12.5px/1.3 var(--ui)', color: 'var(--live)' }}>{error}</span>}
    </form>
  );
}

function StaffEditForm({ user, onDone }: { user: AdminUser; onDone: () => void }) {
  const patchStaff = usePatchStaff();
  const toast = useToast();
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState<'manager' | 'admin'>(user.role === 'admin' ? 'admin' : 'manager');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (patchStaff.isPending || !name.trim()) return;
    patchStaff.mutate(
      { id: user.id, displayName: name.trim(), role },
      { onSuccess: () => { toast.ok('Сотрудник обновлён'); onDone(); }, onError: (err) => toast.error(err.message) },
    );
  };

  return (
    <form onSubmit={submit} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <input className="in" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Имя" style={{ width: 160 }} />
      <select className="in" value={role} onChange={(e) => setRole(e.target.value as 'manager' | 'admin')} style={{ width: 130 }}>
        <option value="manager">Менеджер</option>
        <option value="admin">Админ</option>
      </select>
      <button type="submit" className="btn acc sm" disabled={patchStaff.isPending || !name.trim()}>Сохранить</button>
      <button type="button" className="btn ghost sm" onClick={onDone}>Отмена</button>
    </form>
  );
}

function StaffPanel() {
  // Фильтр 'manager' на бэке = role in (manager, admin) = ровно штат
  const { data } = useUsers('manager');
  const staff = data?.items ?? [];
  const [creating, setCreating] = useState(false);
  const [pwFor, setPwFor] = useState<string | null>(null);
  const [editFor, setEditFor] = useState<string | null>(null);

  return (
    <div className="pcard">
      <div className="ph" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><h3>Персонал</h3><div className="sub">менеджеры и администраторы салона</div></div>
        {!creating && (
          <button className="btn acc sm" onClick={() => setCreating(true)}>Добавить сотрудника</button>
        )}
      </div>
      {creating && <StaffCreateForm onDone={() => setCreating(false)} />}
      <table className="tb">
        <thead><tr><th>Сотрудник</th><th>Логин</th><th>Роль</th><th></th></tr></thead>
        <tbody>
          {staff.length === 0 ? (
            <tr><td className="empty" colSpan={4}>Сотрудников нет</td></tr>
          ) : (
            staff.map((u) => (
              <tr className="row" key={u.id}>
                <td>
                  <div className="lotcell">
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-soft)', display: 'grid', placeItems: 'center', font: '700 14px/1 var(--num)', color: 'var(--accent)', flex: 'none' }}>
                      {u.name[0]}
                    </div>
                    <div><div className="nm">{u.name}</div></div>
                  </div>
                </td>
                <td className="num" style={{ color: 'var(--dim)' }}>{u.username ?? '—'}</td>
                <td>
                  <span className="sb" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>{ROLE_LABEL[u.role]}</span>
                </td>
                <td>
                  {editFor === u.id ? (
                    <StaffEditForm user={u} onDone={() => setEditFor(null)} />
                  ) : pwFor === u.id ? (
                    <StaffPasswordForm user={u} onDone={() => setPwFor(null)} />
                  ) : (
                    <div className="row-actions">
                      <button className="btn ghost sm" onClick={() => { setEditFor(u.id); setPwFor(null); }}>Изменить</button>
                      <button className="btn ghost sm" onClick={() => { setPwFor(u.id); setEditFor(null); }}>Сменить пароль</button>
                    </div>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function UsersPage() {
  const { data: me } = useMe();
  const isAdmin = me?.role === 'admin';
  const delUser = useDeleteUser();
  const removeUser = (u: AdminUser) => {
    if (u.id === me?.id) return;
    if (!window.confirm(`Удалить пользователя ${u.name}? Действие необратимо.`)) return;
    delUser.mutate(u.id, { onError: (e) => window.alert(e.message) });
  };
  const [f, setF] = useState<UsersFilter>('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const { data } = useUsers(f, page);
  const users = data?.items ?? [];
  const blockedN = useUsers('blocked').data?.total ?? 0;
  const setFilter = (nf: UsersFilter) => {
    setF(nf);
    setPage(1);
  };
  const tabs: Array<[UsersFilter, string]> = [['all', 'Все'], ['buyer', 'Покупатели'], ['manager', 'Команда'], ['blocked', 'Заблокированные']];

  if (selected) {
    return (
      <div className="content fade">
        <UserCard key={selected.id} user={selected} onBack={() => setSelected(null)} />
      </div>
    );
  }

  return (
    <div className="content fade" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {isAdmin && <StaffPanel />}
      <div className="pcard">
        <div className="ph">
          <div style={{ display: 'flex', gap: 7 }}>
            {tabs.map(([k, l]) => (
              <button
                key={k}
                className="btn sm"
                onClick={() => setFilter(k)}
                style={f === k ? { background: 'var(--accent-soft)', color: 'var(--accent)' } : { background: 'transparent', border: '1px solid var(--line2)' }}
              >
                {l}{k === 'blocked' && blockedN ? ` · ${blockedN}` : ''}
              </button>
            ))}
          </div>
        </div>
        <table className="tb">
          <thead><tr><th>Пользователь</th><th>Телефон</th><th>Роль</th><th>Статус</th><th>Ставок / побед</th><th></th></tr></thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td className="empty" colSpan={6}>Пользователей нет</td></tr>
            ) : (
              users.map((u) => {
                const blocked = isBlocked(u);
                return (
                  <tr className="row" key={u.id} style={blocked ? { background: 'color-mix(in srgb, var(--live) 5%, transparent)' } : undefined}>
                    <td>
                      <div className="lotcell">
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: blocked ? 'var(--live-soft)' : 'var(--panel3)', display: 'grid', placeItems: 'center', font: '700 14px/1 var(--num)', color: blocked ? 'var(--live)' : 'var(--accent)', flex: 'none' }}>
                          {u.name[0]}
                        </div>
                        <div>
                          <div className="nm">{u.name}</div>
                          <div className="meta">{u.email ?? '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="num" style={{ color: 'var(--dim)' }}>{u.phone ?? '—'}</td>
                    <td>
                      <span className="sb" style={{ background: u.role === 'buyer' ? 'var(--panel3)' : 'var(--accent-soft)', color: u.role === 'buyer' ? 'var(--dim)' : 'var(--accent)' }}>
                        {ROLE_LABEL[u.role]}
                      </span>
                    </td>
                    <td>
                      {blocked ? (
                        <span className="sb" style={{ background: 'var(--live-soft)', color: 'var(--live)' }}>
                          <Ic d={AI.ban} s={12} /> {blockLabel(u)}
                        </span>
                      ) : u.verified ? (
                        <span className="sb sold">✓ вериф.</span>
                      ) : (
                        <span className="sb fin">не пройдена</span>
                      )}
                    </td>
                    <td className="num">{u.bids} / {u.wins}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="iconbtn2"
                          title={blocked ? 'Разблокировать' : 'Заблокировать'}
                          onClick={() => setSelected(u)}
                          style={blocked ? { color: 'var(--live)', borderColor: 'color-mix(in srgb, var(--live) 40%, var(--line2))' } : undefined}
                        >
                          {AI.ban}
                        </button>
                        <button className="iconbtn2" title="Карточка" onClick={() => setSelected(u)}>{AI.eye}</button>
                        {isAdmin && u.id !== me?.id && (
                          <button
                            className="iconbtn2"
                            title="Удалить пользователя"
                            disabled={delUser.isPending}
                            onClick={() => removeUser(u)}
                            style={{ color: 'var(--live)', borderColor: 'color-mix(in srgb, var(--live) 40%, var(--line2))' }}
                          >
                            <Ic d={AI.trash} s={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        <Pagination total={data?.total ?? 0} limit={PAGE_LIMITS.admin} page={page} onPage={setPage} />
      </div>
    </div>
  );
}
