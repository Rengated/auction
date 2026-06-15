import { useState } from 'react';
import { AI, Ic } from '../components/icons';
import { useToast } from '../components/toast';
import {
  useArchiveUser,
  useCreateStaff,
  useMe,
  usePatchStaff,
  useSetStaffPassword,
  useUsers,
  type AdminUser,
} from '../lib/queries';

const ROLE_LABEL: Record<'manager' | 'admin', string> = { manager: 'Менеджер', admin: 'Админ' };

/** Форма создания сотрудника. */
function CreateForm({ onDone }: { onDone: () => void }) {
  const create = useCreateStaff();
  const toast = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<'manager' | 'admin'>('manager');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (create.isPending) return;
    if (password.length < 6) return toast.error('Пароль должен быть не короче 6 символов');
    create.mutate(
      { username: username.trim(), password, displayName: displayName.trim(), role },
      {
        onSuccess: () => { toast.ok('Сотрудник создан'); onDone(); },
        onError: (err) => toast.error(err.message || 'Не удалось создать сотрудника'),
      },
    );
  };

  return (
    <form onSubmit={submit} style={{ padding: 20 }}>
      <div className="form-grid">
        <div><label className="fld-l">Имя</label><input className="in" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Иван Петров" /></div>
        <div><label className="fld-l">Логин</label><input className="in" autoComplete="off" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="ivan" /></div>
        <div><label className="fld-l">Пароль</label><input className="in" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="не короче 6 символов" /></div>
        <div>
          <label className="fld-l">Роль</label>
          <select className="in" value={role} onChange={(e) => setRole(e.target.value as 'manager' | 'admin')}>
            <option value="manager">Менеджер</option>
            <option value="admin">Админ</option>
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        <button type="button" className="btn ghost" onClick={onDone}>Отмена</button>
        <button type="submit" className="btn acc" disabled={create.isPending || !username.trim() || !password || !displayName.trim()}>
          {create.isPending ? 'Создание…' : 'Создать'}
        </button>
      </div>
    </form>
  );
}

/** Карточка сотрудника: имя/роль редактируются инлайн, смена пароля, архивация. */
function StaffCard({ user, me }: { user: AdminUser; me?: { id: string } }) {
  const patchStaff = usePatchStaff();
  const setPw = useSetStaffPassword(user.id);
  const archive = useArchiveUser();
  const toast = useToast();
  const [mode, setMode] = useState<'view' | 'edit' | 'password'>('view');
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState<'manager' | 'admin'>(user.role === 'admin' ? 'admin' : 'manager');
  const [password, setPassword] = useState('');
  const isSelf = me?.id === user.id;

  const saveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (patchStaff.isPending || !name.trim()) return;
    patchStaff.mutate(
      { id: user.id, displayName: name.trim(), role },
      { onSuccess: () => { toast.ok('Сохранено'); setMode('view'); }, onError: (err) => toast.error(err.message) },
    );
  };
  const savePw = (e: React.FormEvent) => {
    e.preventDefault();
    if (setPw.isPending) return;
    if (password.length < 6) return toast.error('Пароль должен быть не короче 6 символов');
    setPw.mutate({ password }, { onSuccess: () => { toast.ok('Пароль изменён'); setPassword(''); setMode('view'); }, onError: (err) => toast.error(err.message) });
  };
  const toggleArchive = () =>
    archive.mutate(
      { id: user.id, archived: !user.archived },
      { onSuccess: () => toast.ok(user.archived ? 'Разархивирован' : 'Архивирован'), onError: (err) => toast.error(err.message) },
    );

  return (
    <div className="pcard" style={user.archived ? { opacity: 0.7 } : undefined}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px' }}>
        <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--accent-soft)', display: 'grid', placeItems: 'center', font: '700 16px/1 var(--num)', color: 'var(--accent)', flex: 'none' }}>
          {user.name[0]?.toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ font: '700 15px/1.2 var(--ui)' }}>{user.name}{isSelf && <span style={{ color: 'var(--faint)', fontWeight: 500 }}> · вы</span>}</div>
          <div className="num" style={{ fontSize: 12.5, color: 'var(--dim)', marginTop: 3 }}>{user.username ?? '—'}</div>
        </div>
        <span className="sb" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>{ROLE_LABEL[user.role === 'admin' ? 'admin' : 'manager']}</span>
        {user.archived && <span className="sb fin">в архиве</span>}
      </div>

      {mode === 'view' && (
        <div style={{ display: 'flex', gap: 8, padding: '0 20px 16px', flexWrap: 'wrap' }}>
          <button className="btn ghost sm" onClick={() => { setName(user.name); setRole(user.role === 'admin' ? 'admin' : 'manager'); setMode('edit'); }}>
            <Ic d={AI.edit} s={14} /> Изменить
          </button>
          <button className="btn ghost sm" onClick={() => setMode('password')}>Сменить пароль</button>
          {!isSelf && (
            <button className="btn ghost sm" onClick={toggleArchive} disabled={archive.isPending} style={{ marginLeft: 'auto' }}>
              {user.archived ? 'Разархивировать' : 'В архив'}
            </button>
          )}
        </div>
      )}

      {mode === 'edit' && (
        <form onSubmit={saveEdit} style={{ padding: '0 20px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="form-grid">
            <div><label className="fld-l">Имя</label><input className="in" autoFocus value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div>
              <label className="fld-l">Роль</label>
              <select className="in" value={role} onChange={(e) => setRole(e.target.value as 'manager' | 'admin')} disabled={isSelf}>
                <option value="manager">Менеджер</option>
                <option value="admin">Админ</option>
              </select>
              {isSelf && <div className="hint">Свою роль изменить нельзя.</div>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn ghost sm" onClick={() => setMode('view')}>Отмена</button>
            <button type="submit" className="btn acc sm" disabled={patchStaff.isPending || !name.trim()}>Сохранить</button>
          </div>
        </form>
      )}

      {mode === 'password' && (
        <form onSubmit={savePw} style={{ padding: '0 20px 18px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <input className="in" type="password" autoFocus autoComplete="new-password" placeholder="Новый пароль" value={password} onChange={(e) => setPassword(e.target.value)} style={{ flex: 1, minWidth: 160 }} />
          <button type="submit" className="btn acc sm" disabled={setPw.isPending || !password}>Сохранить</button>
          <button type="button" className="btn ghost sm" onClick={() => { setPassword(''); setMode('view'); }}>Отмена</button>
        </form>
      )}
    </div>
  );
}

export function StaffPage() {
  const { data: me } = useMe();
  const [creating, setCreating] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const { data } = useUsers(showArchived ? 'archived' : 'manager');
  // На вкладке «Архив» среди всех архивных оставляем только персонал.
  const staff = (data?.items ?? []).filter((u) => u.role !== 'buyer');

  return (
    <div className="content fade" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="pcard">
        <div className="ph" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div><h3>Персонал</h3><div className="sub">менеджеры и администраторы салона</div></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={`btn sm ${showArchived ? '' : 'acc'}`} onClick={() => setShowArchived(false)}>Активные</button>
            <button className={`btn sm ${showArchived ? 'acc' : ''}`} onClick={() => setShowArchived(true)}>Архив</button>
            {!creating && !showArchived && <button className="btn acc sm" onClick={() => setCreating(true)}><Ic d={AI.plus} s={16} /> Добавить</button>}
          </div>
        </div>
        {creating && !showArchived && <CreateForm onDone={() => setCreating(false)} />}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {staff.length === 0 ? (
          <div className="pcard" style={{ padding: '28px 20px', textAlign: 'center', color: 'var(--faint)', gridColumn: '1 / -1' }}>
            {showArchived ? 'В архиве пусто' : 'Сотрудников нет'}
          </div>
        ) : (
          staff.map((u) => <StaffCard key={u.id} user={u} me={me ?? undefined} />)
        )}
      </div>
    </div>
  );
}
