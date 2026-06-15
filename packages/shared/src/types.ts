// Доменные типы Hermes Trade — общие для api/web/admin.

export type Role = 'buyer' | 'manager' | 'admin';

/** Статус лота в БД. `ending` не хранится — см. displayStatus(). */
export type LotStatus = 'draft' | 'upcoming' | 'live' | 'sold' | 'finished' | 'withdrawn';

/** Статус для отображения (как в дизайне): live с endsAt ≤ 300с → ending. */
export type DisplayStatus = Exclude<LotStatus, 'draft'> | 'ending';

export type MediaKind = 'photo' | 'video';

export interface LotPhotoDto {
  id: string;
  kind: MediaKind;
  /** URL вариантов: card 360w, md 800w, lg 1600w. Для видео все три — один raw-URL файла. */
  card: string;
  md: string;
  lg: string;
  sort: number;
}

/** Публичная карточка лота (каталог + страница лота). Без PII и без reserve_price. */
export interface LotDto {
  id: string;
  make: string;
  family: string;
  model: string;
  year: number;
  status: LotStatus;
  /** Текущая макс. ставка, либо стартовая цена если ставок нет. ₽ */
  currentPrice: number;
  startPrice: number;
  bidStep: number;
  reserveMet: boolean;
  /** Резерв публично показывается в дизайне (карточка лота) */
  reservePrice: number;
  startsAt: string; // ISO
  endsAt: string; // ISO
  bidCount: number;
  watchersCount: number;
  photos: LotPhotoDto[];
  mileage: number;
  engine: string;
  power: number;
  fuel: string;
  transmission: string;
  drive: string;
  body: string;
  color: string;
  vin: string | null;
  description: string;
  options: string[];
  /** Адрес осмотра/выдачи (снимок из справочника), если задан */
  address: string | null;
  /** PDF-отчёт Автотеки, если загружен администратором */
  autotekaPdfUrl: string | null;
  /** Эффективная комиссия: своя у лота либо глобальная из настроек */
  feeRate: number;
  isFavorite?: boolean;
  /** Моя позиция в торгах (если авторизован) */
  my?: { isLeading: boolean; lastBid: number | null };
}

/** Строка публичной ленты ставок — имена маскированы. */
export interface BidRowDto {
  id: string;
  amount: number;
  createdAt: string;
  /** «Участник 77» либо реальное имя для своих ставок */
  bidderLabel: string;
  isMine: boolean;
}

export interface PlaceBidRequest {
  amount: number;
  /** UUID, генерируется клиентом на каждое нажатие — идемпотентность ретраев */
  clientBidId: string;
}

export interface PlaceBidResponse {
  bid: BidRowDto;
  lot: LotTickDto;
}

/** Лёгкий срез лота для real-time обновлений */
export interface LotTickDto {
  id: string;
  status: LotStatus;
  currentPrice: number;
  bidCount: number;
  reserveMet: boolean;
  endsAt: string;
  serverNow: string;
}

export interface MeDto {
  id: string;
  role: Role;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  contactsFilled: boolean;
  contacts: {
    fullName: string | null;
    phone: string | null;
    email: string | null;
  };
  /** Активная блокировка (истёкшая → null) */
  blockedUntil: string | null;
  blockReason: string | null;
  /** Слитые с дефолтами персональные настройки уведомлений */
  notificationPrefs: NotificationPrefs;
}

export type NotificationType =
  | 'outbid'
  | 'won'
  | 'lot_starting'
  | 'lot_ending'
  | 'lot_extended'
  | 'lot_withdrawn'
  | 'deal_update'
  | 'system';

/** События, настраиваемые пользователем (system доставляется всегда). */
export const NOTIFICATION_EVENTS = [
  'outbid',
  'won',
  'lot_starting',
  'lot_ending',
  'lot_extended',
  'lot_withdrawn',
  'deal_update',
] as const;
export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number];

export type NotificationChannel = 'inApp' | 'push';
export type NotificationPrefs = Record<NotificationEvent, Record<NotificationChannel, boolean>>;

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  outbid: { inApp: true, push: true },
  won: { inApp: true, push: true },
  lot_starting: { inApp: true, push: true },
  lot_ending: { inApp: true, push: true },
  lot_extended: { inApp: true, push: false },
  lot_withdrawn: { inApp: true, push: true },
  deal_update: { inApp: true, push: true },
};

/** Базовый payload уведомления о лоте; спец-поля по типам:
 *  outbid: + yourAmount, newAmount; won: + amount, dealId;
 *  lot_starting: + startsAt, phase 'soon'|'live'; lot_ending: + endsAt;
 *  lot_extended: + endsAt, reason 'antisnipe'|'manual'; deal_update: + dealId, status. */
export interface NotifLotPayload {
  lotId: string;
  lotTitle: string;
  [k: string]: unknown;
}

export interface NotificationDto {
  id: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export interface UnreadCountDto {
  count: number;
}

export type DealStatus = 'in_progress' | 'completed' | 'cancelled';

export interface DealDto {
  id: string;
  lotId: string;
  lotTitle: string;
  amount: number;
  feeRate: number;
  feeAmount: number;
  status: DealStatus;
  createdAt: string;
  closedAt: string | null;
}

/** Строка списка «Мои ставки» — активные/выигранные. Поля сделки только для won. */
export interface MyBidRow {
  lot: LotDto;
  myLastBid: number;
  isLeading: boolean;
  /** Для выигранных: id сделки */
  dealId?: string;
  /** Статус сделки (только won) */
  dealStatus?: DealStatus;
  /** Снимок комиссии из сделки */
  feeRate?: number;
  feeAmount?: number;
  /** amount + feeAmount */
  amountDue?: number;
  /** Заметка менеджера (только непустая) */
  dealNote?: string;
  closedAt?: string | null;
}

export interface AuctionSettingsDto {
  feeRate: number;
  defaultBidStep: number;
  antisnipeEnabled: boolean;
  antisnipeWindowSec: number;
  antisnipeExtensionSec: number;
}

export interface ManagerContacts {
  name?: string;
  role?: string;
  phone?: string;
  email?: string;
  telegram?: string;
  whatsapp?: string;
  max?: string;
}

/** Публичный срез настроек для клиента */
export interface PublicConfigDto {
  feeRate: number;
  defaultBidStep: number;
  vapidPublicKey: string | null;
  managerContacts: ManagerContacts;
}

/** Точка осмотра/выдачи авто — справочник адресов в админке. */
export interface AddressDto {
  id: string;
  label: string;
  fullAddress: string;
  city: string | null;
  sortOrder: number;
}

/** Универсальная страница списка (offset-based). */
export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

/** Дефолтные лимиты страниц по типу списка. */
export const PAGE_LIMITS = {
  catalog: 24,
  myBids: 20,
  admin: 20,
} as const;

/** Жёсткий потолок размера страницы (чтобы клиент не запросил гигантскую). */
export const MAX_PAGE_LIMIT = 100;
