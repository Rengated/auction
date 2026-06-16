import { useState } from 'react';
import { PAGE_LIMITS } from '@hermes/shared';
import { AI, Ic } from '../components/icons';
import { Pagination } from '../components/pagination';
import {
  useArchiveUser,
  useDeleteUser,
  useMe,
  usePatchUser,
  useUsers,
  type AdminUser,
  type UsersFilter,
} from '../lib/queries';
import { useToast } from '../components/toast';

const ROLE_LABEL: Record<AdminUser['role'], string> = { buyer: 'Покупатель', manager: 'Менеджер', admin: 'Админ', director: 'Директор' };

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
      <div className="form-head" style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
        <button className="iconbtn2" onClick={onBack} style={{ width: 38, height: 38 }}>{AI.back}</button>
        <div className="form-head-title">
          <div className="crumb">Пользователи / Карточка</div>
          <h1 style={{ font: '800 22px/1 var(--ui)', margin: 0, letterSpacing: '-0.02em' }}>{user.name}</h1>
        </div>
        <div className="form-head-actions" style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          <button className="btn ghost" onClick={onBack}>Отмена</button>
          <button className="btn acc" disabled={!canSave} onClick={save}>Сохранить</button>
        </div>
      </div>

      <div className="col2-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>
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

export function UsersPage() {
  const { data: me } = useMe();
  const isAdmin = me?.role === 'admin';
  const delUser = useDeleteUser();
  const archive = useArchiveUser();
  const toast = useToast();
  const removeUser = (u: AdminUser) => {
    if (u.id === me?.id) return;
    if (!window.confirm(`Удалить пользователя ${u.name}? Действие необратимо.`)) return;
    delUser.mutate(u.id, { onSuccess: () => toast.ok('Пользователь удалён'), onError: (e) => toast.error(e.message) });
  };
  const toggleArchive = (u: AdminUser) =>
    archive.mutate(
      { id: u.id, archived: !u.archived },
      { onSuccess: () => toast.ok(u.archived ? 'Разархивирован' : 'Архивирован'), onError: (e) => toast.error(e.message) },
    );
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
  const tabs: Array<[UsersFilter, string]> = [['all', 'Все'], ['buyer', 'Покупатели'], ['blocked', 'Заблокированные'], ['archived', 'Архив']];

  if (selected) {
    return (
      <div className="content fade">
        <UserCard key={selected.id} user={selected} onBack={() => setSelected(null)} />
      </div>
    );
  }

  return (
    <div className="content fade" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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
                    <td data-label="Телефон" className="num" style={{ color: 'var(--dim)' }}>{u.phone ?? '—'}</td>
                    <td data-label="Роль">
                      <span className="sb" style={{ background: u.role === 'buyer' ? 'var(--panel3)' : 'var(--accent-soft)', color: u.role === 'buyer' ? 'var(--dim)' : 'var(--accent)' }}>
                        {ROLE_LABEL[u.role]}
                      </span>
                    </td>
                    <td data-label="Статус">
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
                    <td data-label="Ставок / побед" className="num">{u.bids} / {u.wins}</td>
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
                        {u.id !== me?.id && (
                          <button
                            className="btn ghost sm"
                            title={u.archived ? 'Разархивировать' : 'В архив'}
                            disabled={archive.isPending}
                            onClick={() => toggleArchive(u)}
                          >
                            {u.archived ? 'Из архива' : 'В архив'}
                          </button>
                        )}
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
