import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { LotDto, MeDto } from '@hermes/shared';
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

export type AdminLot = LotDto & { published: boolean; lotBidStep: number | null };

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
  startPrice: number;
  reservePrice: number;
  bidStep?: number | null;
  startsAt: string; // ISO
  endsAt: string; // ISO
  autoteka?: Record<string, unknown>;
  published?: boolean;
}

export interface AdminDeal {
  id: string;
  lotId: string;
  lotTitle: string;
  photo: string | null;
  winner: { id: string; name: string; phone: string | null; email: string | null; city: string | null };
  amount: number;
  feeRate: number;
  feeAmount: number;
  status: 'pending' | 'contract' | 'closed';
  note: string;
  createdAt: string;
  closedAt: string | null;
}

export interface AdminUser {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  city: string | null;
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
}

export interface DashboardData {
  liveCount: number;
  upcomingCount: number;
  bidsToday: number;
  commissionTotal: number;
  dealsCount: number;
  week: number[];
  activity: Array<{ type: string; title: string; detail: string; at: string }>;
  serverNow: string;
}

export interface Participant {
  userId: string;
  name: string;
  phone: string | null;
  email: string | null;
  city: string | null;
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

export const useDashboard = () =>
  useQuery<DashboardData>({ queryKey: ['dashboard'], queryFn: () => get('/admin/dashboard'), refetchInterval: 30_000 });

export type AdminLotsFilter = 'all' | 'live' | 'soon' | 'done' | 'draft';

export const useAdminLots = (filter: AdminLotsFilter = 'all') =>
  useQuery<AdminLot[]>({ queryKey: ['admin-lots', filter], queryFn: () => get(`/admin/lots?filter=${filter}`) });

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

export const useDeals = () => useQuery<AdminDeal[]>({ queryKey: ['deals'], queryFn: () => get('/admin/deals') });

export const useDeal = (id: string | undefined) =>
  useQuery<AdminDeal>({ queryKey: ['deal', id], queryFn: () => get(`/admin/deals/${id}`), enabled: Boolean(id) });

export type UsersFilter = 'all' | 'buyer' | 'manager' | 'blocked';

export const useUsers = (filter: UsersFilter = 'all') =>
  useQuery<AdminUser[]>({ queryKey: ['users', filter], queryFn: () => get(`/admin/users?filter=${filter}`) });

export const useSettings = () =>
  useQuery<AdminSettings>({ queryKey: ['settings'], queryFn: () => get('/admin/settings') });

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

/** Действия управления торгом: extend/close-early/withdraw/reject-last-bid/start-now/step. */
export function useAuctionAction(lotId: string) {
  const qc = useQueryClient();
  return useMutation<
    unknown,
    ApiError,
    | { action: 'extend'; seconds: number }
    | { action: 'close-early' }
    | { action: 'withdraw' }
    | { action: 'reject-last-bid' }
    | { action: 'start-now' }
    | { action: 'step'; step: number }
  >({
    mutationFn: (v) =>
      v.action === 'step'
        ? patch(`/admin/lots/${lotId}/step`, { step: v.step })
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
      city?: string;
      verified?: boolean;
    }
  >({
    mutationFn: ({ id, ...data }) => patch(`/admin/users/${id}`, data),
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

export async function logout(): Promise<void> {
  await post('/auth/logout');
  queryClient.clear();
}
