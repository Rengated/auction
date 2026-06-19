import type { ReactNode } from 'react';

const S = ({ children, sw = 1.8 }: { children: ReactNode; sw?: number }) => (
  <svg viewBox="0 0 24 24" style={{ width: '100%', height: '100%', display: 'block' }} stroke="currentColor" fill="none" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

/* Иконки админки (AI из admin-app.jsx) */
export const AI = {
  dash: <S><rect x="3" y="3" width="8" height="8" rx="2" /><rect x="13" y="3" width="8" height="5" rx="2" /><rect x="13" y="11" width="8" height="10" rx="2" /><rect x="3" y="13" width="8" height="8" rx="2" /></S>,
  lots: <S><path d="M3 7l9-4 9 4-9 4-9-4Z" /><path d="M3 7v6l9 4 9-4V7" /><path d="M12 11v10" /></S>,
  gavel: <S><path d="m14 6 4 4M9 11l4 4" /><path d="M3 21h8" /><path d="m6.5 13.5 4 4M12 8l5-5 4 4-5 5" /></S>,
  deals: <S><path d="M4 7h16v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7Z" /><path d="M4 7l2-3h12l2 3" /><path d="m9 13 2 2 4-4" /></S>,
  gear: <S><circle cx="12" cy="12" r="3.2" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /></S>,
  plus: <S><path d="M12 5v14M5 12h14" /></S>,
  back: <S><path d="M15 5 8 12l7 7" /></S>,
  edit: <S><path d="M4 20h4L19 9l-4-4L4 16v4Z" /><path d="M14 6l4 4" /></S>,
  eye: <S><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></S>,
  trash: <S><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></S>,
  camera: <S><path d="M4 8h3l1.5-2.5h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" /><circle cx="12" cy="13" r="3.2" /></S>,
  stop: <S><rect x="6" y="6" width="12" height="12" rx="2" /></S>,
  plusclock: <S><circle cx="12" cy="12" r="9" /><path d="M12 8v4l3 2" /></S>,
  relist: <S><path d="M21 12a9 9 0 1 1-2.6-6.4" /><path d="M21 3v5h-5" /></S>,
  users: <S><circle cx="9" cy="8" r="3.4" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><path d="M16 4.5a3.4 3.4 0 0 1 0 7M18 20c0-3.3-1-5-2.5-6" /></S>,
  phone: <S><path d="M5 4h4l2 5-3 2a12 12 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" /></S>,
  mail: <S><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></S>,
  msg: <S><path d="M21 12a8 8 0 0 1-8 8H7l-4 3v-7a8 8 0 0 1 5-11 8 8 0 0 1 13 7Z" /></S>,
  ban: <S><circle cx="12" cy="12" r="9" /><path d="m6 6 12 12" /></S>,
  pin: <S><path d="M12 21s-7-5.7-7-11a7 7 0 0 1 14 0c0 5.3-7 11-7 11Z" /><circle cx="12" cy="10" r="2.5" /></S>,
  doc: <S><path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" /><path d="M14 3v4h4M8 13h8M8 17h5" /></S>,
  check: <S><path d="m4 12 5 5L20 6" /></S>,
  bolt: <S><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" /></S>,
  clock: <S><circle cx="12" cy="12" r="9" /><path d="M12 8v4l3 2" /></S>,
} satisfies Record<string, ReactNode>;

export function Ic({ d, s = 16 }: { d: ReactNode; s?: number }) {
  return <span style={{ width: s, height: s, display: 'inline-flex', flex: 'none' }}>{d}</span>;
}

export function HermesH({ size = 34 }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" style={{ display: 'block' }} aria-label="Auction Germes">
      <defs>
        <linearGradient id="ag-tile-admin" x1="16" y1="0" x2="104" y2="120" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ef7438" />
          <stop offset="1" stopColor="#c44e1d" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="120" height="120" rx="27" ry="27" fill="url(#ag-tile-admin)" />
      <text
        x="60"
        y="60"
        fontFamily="'Onest', sans-serif"
        fontWeight={800}
        fontSize="64"
        fill="#16140f"
        textAnchor="middle"
        dominantBaseline="central"
        letterSpacing="-3"
      >
        AG
      </text>
    </svg>
  );
}

/** Статус-бейдж админки (.sb). */
export function Sb({ s }: { s: string }) {
  const SB: Record<string, string> = { live: 'В ЭФИРЕ', ending: 'В ЭФИРЕ', upcoming: 'ОЖИДАЕТ', sold: 'ПРОДАН', finished: 'НЕ ВЗЯТ РЕЗЕРВ', withdrawn: 'СНЯТ', draft: 'ЧЕРНОВИК' };
  const SBC: Record<string, string> = { live: 'live', ending: 'live', upcoming: 'up', sold: 'sold', finished: 'fin', withdrawn: 'fin', draft: 'up' };
  return (
    <span className={`sb ${SBC[s] ?? 'fin'}`}>
      {SBC[s] === 'live' && <span className="dot" />}
      {SB[s] ?? s}
    </span>
  );
}
