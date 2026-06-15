import { useNavigate } from 'react-router-dom';
import { I } from '../components/icons';

/** Страница 404 — лот не найден/снят с публикации или несуществующий маршрут. */
export function NotFoundPage({ title = 'Страница не найдена', text }: { title?: string; text?: string }) {
  const navigate = useNavigate();
  return (
    <div
      className="viewfade"
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 18,
        padding: '48px 24px',
      }}
    >
      <div className="num" style={{ font: '800 84px/1 var(--num)', color: 'var(--text-faint)', letterSpacing: '-0.04em' }}>404</div>
      <div style={{ font: '800 22px/1.2 var(--ui)' }}>{title}</div>
      <div style={{ font: '500 14px/1.5 var(--ui)', color: 'var(--text-dim)', maxWidth: 360 }}>
        {text ?? 'Возможно, лот снят с публикации или ссылка устарела.'}
      </div>
      <button
        className="wbtn accent"
        style={{ marginTop: 6, padding: '13px 22px' }}
        onClick={() => navigate('/')}
      >
        <span style={{ width: 16, height: 16 }}>{I.back}</span> В каталог
      </button>
    </div>
  );
}
