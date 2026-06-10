/** Доменные коды ошибок API. Клиент матчит по code, не по сообщению. */
export const ERROR_CODES = {
  /** Ставка ниже минимума — в payload актуальные currentPrice/minNextBid */
  BID_TOO_LOW: 'BID_TOO_LOW',
  /** Торги не идут (не live / вне временного окна) */
  LOT_NOT_LIVE: 'LOT_NOT_LIVE',
  /** Нужно заполнить контакты для участия */
  CONTACTS_REQUIRED: 'CONTACTS_REQUIRED',
  /** Пользователь заблокирован */
  USER_BLOCKED: 'USER_BLOCKED',
  /** Вы уже лидируете */
  ALREADY_LEADING: 'ALREADY_LEADING',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export interface ApiErrorBody {
  code: ErrorCode | string;
  message: string;
  /** Для BID_TOO_LOW: { currentPrice, minNextBid, endsAt, serverNow } */
  details?: Record<string, unknown>;
}
