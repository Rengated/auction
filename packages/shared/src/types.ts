// Доменные типы Hermes Trade — общие для api/web/admin.

export type Role = 'buyer' | 'manager' | 'admin';

/** Статус лота в БД. `ending` не хранится — см. displayStatus(). */
export type LotStatus = 'draft' | 'upcoming' | 'live' | 'sold' | 'finished' | 'withdrawn';

/** Статус для отображения (как в дизайне): live с endsAt ≤ 300с → ending. */
export type DisplayStatus = Exclude<LotStatus, 'draft'> | 'ending';

export interface AutotekaReport {
  attached: boolean;
  date?: string;
  owners?: number;
  accidents?: number;
  restrictions?: boolean;
  pledge?: boolean;
  mileageOk?: boolean;
  taxi?: boolean;
  summary?: string;
}

export interface LotPhotoDto {
  id: string;
  /** URL вариантов: card 360w, md 800w, lg 1600w */
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
  autoteka: AutotekaReport | null;
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
  avatarUrl: string | null;
  contactsFilled: boolean;
  contacts: {
    fullName: string | null;
    phone: string | null;
    email: string | null;
    city: string | null;
  };
}

export type NotificationType =
  | 'outbid'
  | 'won'
  | 'lot_starting'
  | 'lot_ending'
  | 'deal_update'
  | 'system';

export interface NotificationDto {
  id: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export type DealStatus = 'pending' | 'contract' | 'closed';

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

export interface AuctionSettingsDto {
  feeRate: number;
  defaultBidStep: number;
  antisnipeEnabled: boolean;
  antisnipeWindowSec: number;
  antisnipeExtensionSec: number;
}

/** Публичный срез настроек для клиента */
export interface PublicConfigDto {
  feeRate: number;
  defaultBidStep: number;
  vapidPublicKey: string | null;
}

export type SellRequestStatus = 'new' | 'in_review' | 'accepted' | 'rejected';

export interface CreateSellRequest {
  make: string;
  model: string;
  year: number;
  mileage: number;
  phone: string;
  comment?: string;
}
