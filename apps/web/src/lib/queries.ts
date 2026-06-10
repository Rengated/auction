import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  BidRowDto,
  LotDto,
  MeDto,
  NotificationDto,
  PlaceBidResponse,
  PublicConfigDto,
} from '@hermes/shared';
import { get, patch, post, put, del, ApiError } from './api';
import { useTimeStore } from './time';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      refetchOnReconnect: true,
      retry: (count, err) => !(err instanceof ApiError && err.status < 500) && count < 2,
    },
  },
});

export interface MyBidRow {
  lot: LotDto;
  myLastBid: number;
  isLeading: boolean;
  dealId?: string;
}

export type CatalogFilter = 'all' | 'live' | 'soon' | 'done' | 'fav';

export const useMe = () =>
  useQuery<MeDto | null>({
    queryKey: ['me'],
    queryFn: () => get<MeDto>('/auth/me').catch(() => null),
    staleTime: 60_000,
  });

export const useConfig = () =>
  useQuery<PublicConfigDto>({
    queryKey: ['config'],
    queryFn: () => get('/config'),
    staleTime: 5 * 60_000,
  });

export const useCatalog = (filter: CatalogFilter, q: string) =>
  useQuery<LotDto[]>({
    queryKey: ['lots', filter, q],
    queryFn: () => get(`/lots?filter=${filter}${q ? `&q=${encodeURIComponent(q)}` : ''}`),
  });

export const useLot = (id: string | undefined) =>
  useQuery<LotDto>({
    queryKey: ['lot', id],
    queryFn: () => get(`/lots/${id}`),
    enabled: Boolean(id),
  });

export const useBidsFeed = (lotId: string | undefined) =>
  useQuery<BidRowDto[]>({
    queryKey: ['bids', lotId],
    queryFn: () => get(`/lots/${lotId}/bids`),
    enabled: Boolean(lotId),
  });

export const useMyBids = (tab: 'active' | 'won') =>
  useQuery<MyBidRow[]>({
    queryKey: ['my-bids', tab],
    queryFn: () => get(`/me/bids?tab=${tab}`),
  });

export const useNotifications = (enabled: boolean) =>
  useQuery<NotificationDto[]>({
    queryKey: ['notifications'],
    queryFn: () => get('/me/notifications'),
    enabled,
  });

export function usePlaceBid(lotId: string) {
  const qc = useQueryClient();
  return useMutation<PlaceBidResponse, ApiError, { amount: number; clientBidId: string }>({
    mutationFn: (vars) => post(`/lots/${lotId}/bids`, vars),
    onSuccess: (res) => {
      useTimeStore.getState().syncServerNow(res.lot.serverNow);
      qc.setQueryData<LotDto>(['lot', lotId], (old) =>
        old
          ? {
              ...old,
              currentPrice: res.lot.currentPrice,
              bidCount: res.lot.bidCount,
              reserveMet: res.lot.reserveMet,
              endsAt: res.lot.endsAt,
              my: { isLeading: true, lastBid: res.bid.amount },
            }
          : old,
      );
      qc.invalidateQueries({ queryKey: ['bids', lotId] });
      qc.invalidateQueries({ queryKey: ['my-bids'] });
    },
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ lotId, on }: { lotId: string; on: boolean }) =>
      on ? put(`/lots/${lotId}/favorite`) : del(`/lots/${lotId}/favorite`),
    onSuccess: (_, { lotId, on }) => {
      qc.setQueryData<LotDto>(['lot', lotId], (old) => (old ? { ...old, isFavorite: on } : old));
      qc.invalidateQueries({ queryKey: ['lots'] });
    },
  });
}

export function useSaveContacts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { fullName: string; phone: string; email?: string; city?: string }) =>
      patch('/me/contacts', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
  });
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => post('/me/notifications/read'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useCreateSellRequest() {
  return useMutation<{ id: string }, ApiError, {
    make: string;
    model: string;
    year: number;
    mileage: number;
    phone: string;
    comment?: string;
  }>({
    mutationFn: (data) => post('/sell-requests', data),
  });
}

export async function logout(): Promise<void> {
  await post('/auth/logout');
  queryClient.setQueryData(['me'], null);
  queryClient.clear();
}
