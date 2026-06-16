import type { LotStatus, LotTickDto } from './types';

/** Имена WS-событий — единственный источник истины. */
export const WS_EVENTS = {
  /** server → lot:{id}, catalog */
  BID_PLACED: 'bid:placed',
  /** server → lot:{id}, catalog (антиснайпинг или ручное продление) */
  LOT_EXTENDED: 'lot:extended',
  /** server → lot:{id}, catalog (смена статуса: live/sold/finished/withdrawn) */
  LOT_STATUS: 'lot:status',
  /** server → lot:{id} (менеджер отклонил последнюю ставку — откат цены) */
  BID_REJECTED: 'bid:rejected',
  /** server → user:{id} */
  OUTBID: 'outbid',
  /** server → user:{id} */
  LOT_WON: 'lot:won',
  /** server → user:{id} (новая нотификация — бейдж) */
  NOTIFICATION: 'notification',
  /** client → server: подписка на комнату лота */
  JOIN_LOT: 'lot:join',
  LEAVE_LOT: 'lot:leave',
} as const;

export interface BidPlacedEvent {
  lot: LotTickDto;
  bid: {
    id: string;
    amount: number;
    createdAt: string;
    bidderLabel: string;
    bidderId: string;
  };
}

export interface LotExtendedEvent {
  lotId: string;
  endsAt: string;
  serverNow: string;
}

export interface LotStatusEvent {
  lot: LotTickDto;
  finalPrice?: number;
}

export interface BidRejectedEvent {
  lot: LotTickDto;
  rejectedBidId: string;
  /** id владельца отклонённой ставки — чтобы клиент понял, не его ли ставку сняли */
  rejectedBidderId: string;
  /** id нового лидера после пересчёта (null, если активных ставок не осталось) */
  newLeaderId: string | null;
}

export interface OutbidEvent {
  lotId: string;
  lotTitle: string;
  yourAmount: number;
  newAmount: number;
}

export interface LotWonEvent {
  lotId: string;
  lotTitle: string;
  amount: number;
  dealId: string;
}

export type LotStatusChange = Extract<LotStatus, 'live' | 'sold' | 'finished' | 'withdrawn'>;
