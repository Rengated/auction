import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AddressDto, DealStatus, LotDto, MeDto, Page } from '@hermes/shared';
import { PAGE_LIMITS } from '@hermes/shared';
import { ApiError, del, get, patch, post, postForm, putJson } from './api';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      refetchOnReconnect: true,
      retry: (count, err) => !(err instanceof ApiError && err.status < 500) && count < 2,
    },
  },
});

/* ---------- типы админ-API ---------- */

export type AdminLot = LotDto & {
  published: boolean;
  lotBidStep: number | null;
  /** Своя комиссия лота (доля 0..1), null → глобальная */
  lotFeeRate: number | null;
  /** Выбранный адрес (точка осмотра/выдачи), null → без адреса */
  addressId: string | null;
};

/** Адрес из справочника (точка осмотра/выдачи). */
export type AdminAddress = AddressDto;

export interface LotFormPayload {
  make: string;
  family?: string;
  model: string;
  year: number;
  mileage: number;
  engine: string;
  power: number;
  fuel: string;
  transmission: string;
  drive: string;
  body: string;
  color: string;
  vin?: string;
  description?: string;
  options?: string[];
  addressId?: string | null;
  startPrice: number;
  reservePrice: number;
  bidStep?: number | null;
  /** Комиссия лота как доля (0.015 = 1.5%); null → глобальная */
  feeRate?: number | null;
  startsAt: string; // ISO
  endsAt: string; // ISO
  published?: boolean;
}

export interface AdminDeal {
  id: string;
  lotId: string;
  lotTitle: string;
  photo: string | null;
  winner: { id: string; name: string; phone: string | null; email: string | null };
  amount: number;
  feeRate: number;
  feeAmount: number;
  status: DealStatus;
  note: string;
  createdAt: string;
  closedAt: string | null;
}

export interface AdminUser {
  id: string;
  name: string;
  username: string | null;
  isStaff: boolean;
  phone: string | null;
  email: string | null;
  role: 'buyer' | 'manager' | 'admin';
  verified: boolean;
  blockedUntil: string | null;
  blockPermanent: boolean;
  blockReason: string | null;
  bids: number;
  wins: number;
  joined: string;
}

export interface AdminSettings {
  feeRate: number;
  defaultBidStep: number;
  antisnipeEnabled: boolean;
  antisnipeWindowSec: number;
  antisnipeExtensionSec: number;
  managerContacts: Record<string, string>;
  notificationToggles: Record<string, boolean>;
  telegramBotToken: string;
  telegramChannelId: string;
  telegramContact: string;
  tgEventToggles: Record<string, boolean>;
}

export interface DashboardData {
  from: string;
  to: string;
  liveCount: number;
  upcomingCount: number;
  bidsToday: number;
  commissionTotal: number;
  dealsCount: number;
  week: number[];
  activity: Array<{ type: string; title: string; detail: string; at: string }>;
  serverNow: string;
  /** Оборот (сумма сделок не cancelled), в рублях */
  totalTurnover: number;
  /** Средний чек сделки, рублей */
  avgDeal: number;
  /** Комиссия за 30 дней, рублей */
  commissionMonth: number;
  /** Оборот по дням за неделю (тренд) */
  turnoverWeek: number[];
  /** % конверсии в продажу (sold / (sold+finished+withdrawn)) */
  conversionRate: number;
  /** % взятого резерва (sold / (sold+finished)) */
  reserveRate: number;
  /** % отклонённых ставок за неделю */
  rejectionRate: number;
  /** Новых покупателей сегодня */
  newRegistrations: number;
  /** Регистрации по дням за неделю */
  registrationsWeek: number[];
}

export interface Participant {
  userId: string;
  name: string;
  phone: string | null;
  email: string | null;
  maxBid: number;
  bids: number;
  isLeader: boolean;
}

export interface AdminFeedRow {
  id: string;
  amount: number;
  createdAt: string;
  name: string;
}

/* ---------- запросы ---------- */

export const useMe = () =>
  useQuery<MeDto | null>({
    queryKey: ['me'],
    queryFn: () => get<MeDto>('/auth/me').catch(() => null),
    staleTime: 60_000,
  });

export const useDashboard = (from?: string, to?: string) =>
  useQuery<DashboardData>({
    queryKey: ['dashboard', from ?? '', to ?? ''],
    queryFn: () => {
      const qs = new URLSearchParams();
      if (from) qs.set('from', from);
      if (to) qs.set('to', to);
      const q = qs.toString();
      return get(`/admin/dashboard${q ? `?${q}` : ''}`);
    },
    refetchInterval: 30_000,
  });

export type AdminLotsFilter = 'all' | 'live' | 'soon' | 'done' | 'draft';

export const useAdminLots = (filter: AdminLotsFilter = 'all', page = 1) =>
  useQuery<Page<AdminLot>>({
    queryKey: ['admin-lots', filter, page],
    queryFn: () => get(`/admin/lots?filter=${filter}&limit=${PAGE_LIMITS.admin}&offset=${(page - 1) * PAGE_LIMITS.admin}`),
    placeholderData: (prev) => prev,
  });

export const useAdminLot = (id: string | undefined) =>
  useQuery<AdminLot>({ queryKey: ['admin-lot', id], queryFn: () => get(`/admin/lots/${id}`), enabled: Boolean(id) });

export const useParticipants = (lotId: string | undefined) =>
  useQuery<Participant[]>({
    queryKey: ['participants', lotId],
    queryFn: () => get(`/admin/lots/${lotId}/participants`),
    enabled: Boolean(lotId),
  });

export const useAdminFeed = (lotId: string | undefined) =>
  useQuery<AdminFeedRow[]>({
    queryKey: ['admin-feed', lotId],
    queryFn: () => get(`/admin/lots/${lotId}/feed`),
    enabled: Boolean(lotId),
  });

export const useDeals = (page = 1) =>
  useQuery<Page<AdminDeal>>({
    queryKey: ['deals', page],
    queryFn: () => get(`/admin/deals?limit=${PAGE_LIMITS.admin}&offset=${(page - 1) * PAGE_LIMITS.admin}`),
    placeholderData: (prev) => prev,
  });

export const useDeal = (id: string | undefined) =>
  useQuery<AdminDeal>({ queryKey: ['deal', id], queryFn: () => get(`/admin/deals/${id}`), enabled: Boolean(id) });

export type UsersFilter = 'all' | 'buyer' | 'manager' | 'blocked';

export const useUsers = (filter: UsersFilter = 'all', page = 1) =>
  useQuery<Page<AdminUser>>({
    queryKey: ['users', filter, page],
    queryFn: () => get(`/admin/users?filter=${filter}&limit=${PAGE_LIMITS.admin}&offset=${(page - 1) * PAGE_LIMITS.admin}`),
    placeholderData: (prev) => prev,
  });

export const useSettings = () =>
  useQuery<AdminSettings>({ queryKey: ['settings'], queryFn: () => get('/admin/settings') });

export const useAddresses = () =>
  useQuery<AdminAddress[]>({ queryKey: ['addresses'], queryFn: () => get('/admin/addresses') });

/* ---------- мутации ---------- */

function invalidateLots(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['admin-lots'] });
  qc.invalidateQueries({ queryKey: ['admin-lot'] });
  qc.invalidateQueries({ queryKey: ['dashboard'] });
}

export function useCreateLot() {
  const qc = useQueryClient();
  return useMutation<{ id: string }, ApiError, LotFormPayload>({
    mutationFn: (data) => post('/admin/lots', data),
    onSuccess: () => invalidateLots(qc),
  });
}

/** Снятие лота с публикации: PATCH с полным payload и published:false → возврат в черновик. */
export function useUnpublishLot() {
  const qc = useQueryClient();
  return useMutation<{ id: string }, ApiError, { id: string; payload: LotFormPayload }>({
    mutationFn: ({ id, payload }) => patch(`/admin/lots/${id}`, payload),
    onSuccess: () => invalidateLots(qc),
  });
}

export function useCreateAddress() {
  const qc = useQueryClient();
  return useMutation<{ id: string }, ApiError, { label: string; fullAddress: string; city?: string; sortOrder?: number }>({
    mutationFn: (data) => post('/admin/addresses', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['addresses'] }),
  });
}

export function useDeleteAddress() {
  const qc = useQueryClient();
  return useMutation<unknown, ApiError, string>({
    mutationFn: (id) => del(`/admin/addresses/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['addresses'] }),
  });
}

export function useUpdateLot(id: string) {
  const qc = useQueryClient();
  return useMutation<{ id: string }, ApiError, LotFormPayload>({
    mutationFn: (data) => patch(`/admin/lots/${id}`, data),
    onSuccess: () => invalidateLots(qc),
  });
}

export function usePublishLot() {
  const qc = useQueryClient();
  return useMutation<{ id: string }, ApiError, string>({
    mutationFn: (id) => post(`/admin/lots/${id}/publish`),
    onSuccess: () => invalidateLots(qc),
  });
}

export function useRelistLot(srcId: string) {
  const qc = useQueryClient();
  return useMutation<{ id: string }, ApiError, LotFormPayload>({
    mutationFn: (data) => post(`/admin/lots/${srcId}/relist`, data),
    onSuccess: () => invalidateLots(qc),
  });
}

export function useUploadPhotos(lotId: string) {
  const qc = useQueryClient();
  return useMutation<unknown, ApiError, File[]>({
    mutationFn: (files) => {
      const form = new FormData();
      files.forEach((f) => form.append('files', f));
      return postForm(`/admin/lots/${lotId}/photos`, form);
    },
    onSuccess: () => invalidateLots(qc),
  });
}

export function useDeletePhoto(lotId: string) {
  const qc = useQueryClient();
  return useMutation<unknown, ApiError, string>({
    mutationFn: (photoId) => del(`/admin/lots/${lotId}/photos/${photoId}`),
    onSuccess: () => invalidateLots(qc),
  });
}

export function useUploadAutoteka(lotId: string) {
  const qc = useQueryClient();
  return useMutation<{ autotekaPdfUrl: string }, ApiError, File>({
    mutationFn: (file) => {
      const form = new FormData();
      form.append('file', file);
      return postForm(`/admin/lots/${lotId}/autoteka`, form);
    },
    onSuccess: () => invalidateLots(qc),
  });
}

export function useDeleteAutoteka(lotId: string) {
  const qc = useQueryClient();
  return useMutation<unknown, ApiError, void>({
    mutationFn: () => del(`/admin/lots/${lotId}/autoteka`),
    onSuccess: () => invalidateLots(qc),
  });
}

/** Действия управления торгом: extend/close-early/withdraw/reject-last-bid/reject-bid/start-now/step. */
export function useAuctionAction(lotId: string) {
  const qc = useQueryClient();
  return useMutation<
    unknown,
    ApiError,
    | { action: 'extend'; seconds: number }
    | { action: 'close-early' }
    | { action: 'withdraw' }
    | { action: 'reject-last-bid' }
    | { action: 'reject-bid'; bidId: string }
    | { action: 'start-now' }
    | { action: 'step'; step: number }
  >({
    mutationFn: (v) =>
      v.action === 'step'
        ? patch(`/admin/lots/${lotId}/step`, { step: v.step })
        : v.action === 'reject-bid'
          ? post(`/admin/lots/${lotId}/bids/${v.bidId}/reject`)
          : post(`/admin/lots/${lotId}/${v.action}`, v.action === 'extend' ? { seconds: v.seconds } : undefined),
    onSuccess: () => {
      invalidateLots(qc);
      qc.invalidateQueries({ queryKey: ['admin-feed', lotId] });
      qc.invalidateQueries({ queryKey: ['participants', lotId] });
    },
  });
}

export function usePatchDeal(id: string) {
  const qc = useQueryClient();
  return useMutation<AdminDeal, ApiError, { status?: AdminDeal['status']; note?: string }>({
    mutationFn: (data) => patch(`/admin/deals/${id}`, data),
    onSuccess: (deal) => {
      qc.setQueryData(['deal', id], deal);
      qc.invalidateQueries({ queryKey: ['deals'] });
    },
  });
}

export function usePatchUser() {
  const qc = useQueryClient();
  return useMutation<
    unknown,
    ApiError,
    {
      id: string;
      role?: AdminUser['role'];
      blockedUntil?: string | null;
      blockReason?: string;
      fullName?: string;
      phone?: string;
      email?: string;
    }
  >({
    mutationFn: ({ id, ...data }) => patch(`/admin/users/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation<{ ok: true }, ApiError, string>({
    mutationFn: (id) => del(`/admin/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useSaveSettings() {
  const qc = useQueryClient();
  return useMutation<AdminSettings, ApiError, Partial<AdminSettings>>({
    mutationFn: (data) => putJson('/admin/settings', data),
    onSuccess: (s) => qc.setQueryData(['settings'], s),
  });
}

export function useLogin() {
  return useMutation<{ ok: true }, ApiError, { username: string; password: string }>({
    mutationFn: (data) => post('/auth/login', data),
  });
}

export function useCreateStaff() {
  const qc = useQueryClient();
  return useMutation<
    { id: string },
    ApiError,
    { username: string; password: string; displayName: string; role: 'manager' | 'admin' }
  >({
    mutationFn: (data) => post('/admin/staff', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useSetStaffPassword(id?: string) {
  return useMutation<{ ok: true }, ApiError, { id?: string; password: string }>({
    mutationFn: ({ id: argId, password }) => patch(`/admin/staff/${argId ?? id}/password`, { password }),
  });
}

export async function logout(): Promise<void> {
  await post('/auth/logout');
  queryClient.clear();
}
