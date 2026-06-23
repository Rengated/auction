import type { ReactNode } from 'react';

/* Линейные SVG-иконки из hifi-shared.jsx (stroke: currentColor) */
const S = ({ children }: { children: ReactNode }) => (
  <svg viewBox="0 0 24 24" style={{ width: '100%', height: '100%', display: 'block' }} stroke="currentColor" fill="none" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

export const I = {
  catalog: <S><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></S>,
  live: <S><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" /></S>,
  bids: <S><path d="M3 7h13l-1.5 9a2 2 0 0 1-2 1.7H6.5a2 2 0 0 1-2-1.7L3 7Z" /><path d="M16 10h3.5a1.5 1.5 0 0 1 0 3H16" /><path d="M7 7V5.5A2.5 2.5 0 0 1 9.5 3h0A2.5 2.5 0 0 1 12 5.5V7" /></S>,
  user: <S><circle cx="12" cy="8" r="4" /><path d="M5 21c0-3.9 3.1-7 7-7s7 3.1 7 7" /></S>,
  back: <S><path d="M15 5 8 12l7 7" /></S>,
  close: <S><path d="M6 6l12 12M18 6 6 18" /></S>,
  search: <S><circle cx="11" cy="11" r="7" /><path d="m21 21-4-4" /></S>,
  clock: <S><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></S>,
  bookmark: <S><path d="M6 4h12v16l-6-4-6 4V4Z" /></S>,
  share: <S><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.5 10.5 7-4M8.5 13.5l7 4" /></S>,
  check: <S><path d="m4 12 5 5L20 6" /></S>,
  road: <S><path d="M6 3 4 21M18 3l2 18M12 4v3M12 11v3M12 18v2" /></S>,
  fuel: <S><path d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h14" /><path d="M15 9h2.5a2 2 0 0 1 2 2v6a1.5 1.5 0 0 0 3 0V9l-3-3" /></S>,
  engine: <S><circle cx="12" cy="12" r="3.2" /><path d="M12 4v2M12 18v2M4 12h2M18 12h2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M17.7 6.3l-1.4 1.4M7.7 16.3l-1.4 1.4" /></S>,
  plus: <S><path d="M12 5v14M5 12h14" /></S>,
  phone: <S><rect x="6" y="2.5" width="12" height="19" rx="3" /><path d="M10.5 18.5h3" /></S>,
  camera: <S><path d="M4 8h3l1.5-2.5h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" /><circle cx="12" cy="13" r="3.2" /></S>,
  edit: <S><path d="M4 20h4L19 9l-4-4L4 16v4Z" /><path d="M14 6l4 4" /></S>,
  eye: <S><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></S>,
  shield: <S><path d="M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></S>,
  doc: <S><path d="M6 2h8l4 4v16H6V2Z" /><path d="M14 2v4h4" /><path d="M9 13h6M9 17h6M9 9h2" /></S>,
  cross: <S><path d="M6 6l12 12M18 6 6 18" /></S>,
  alert: <S><path d="M12 3 2 20h20L12 3Z" /><path d="M12 10v4M12 17v.5" /></S>,
  bell: <S><path d="M18 9.5a6 6 0 0 0-12 0c0 6-2.5 7.5-2.5 7.5h17S18 15.5 18 9.5Z" /><path d="M10.3 20.5a2 2 0 0 0 3.4 0" /></S>,
  sun: <S><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6" /></S>,
  moon: <S><path d="M20.5 13.2A8.5 8.5 0 1 1 10.8 3.5a7 7 0 0 0 9.7 9.7Z" /></S>,
  mail: <S><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m3.5 7.5 8.5 6 8.5-6" /></S>,
  telegram: <S><path d="M21.5 3.5 10.8 14.2" /><path d="M21.5 3.5 14.5 21l-3.7-6.8L4 10.5l17.5-7Z" /></S>,
  whatsapp: <S><path d="M12 3a9 9 0 0 0-7.8 13.4L3 21l4.7-1.2A9 9 0 1 0 12 3Z" /><path d="M9.2 8.4c-.6.3-.9.9-.8 1.6.4 2.8 2.8 5.2 5.6 5.6.7.1 1.3-.2 1.6-.8l.4-.9-2.2-1.1-.9 1c-1.2-.5-2.2-1.5-2.7-2.7l1-.9-1.1-2.2-.9.4Z" /></S>,
  maxIcon: <S><path d="M12 3a9 9 0 0 1 9 9 9 9 0 0 1-9 9c-1.6 0-3.1-.4-4.4-1.1L3 21l1.1-4.6A9 9 0 0 1 12 3Z" /><path d="M8 10.5h8M8 14h5" /></S>,
  pin: <S><path d="M12 21s7-5.6 7-11a7 7 0 0 0-14 0c0 5.4 7 11 7 11Z" /><circle cx="12" cy="10" r="2.6" /></S>,
  expand: <S><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></S>,
  minimize: <S><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" /></S>,
} satisfies Record<string, ReactNode>;

/** Иконка фиксированного размера в inline-флоу. */
export function Ic({ d, s = 17 }: { d: ReactNode; s?: number }) {
  return <span style={{ width: s, height: s, display: 'inline-flex', flex: 'none' }}>{d}</span>;
}
