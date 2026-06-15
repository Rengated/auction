import { QueryClient, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  BidRowDto,
  LotDto,
  MeDto,
  MyBidRow,
  NotificationDto,
  NotificationEvent,
  Page,
  PlaceBidResponse,
  PublicConfigDto,
  UnreadCountDto,
} from '@hermes/shared';
import { PAGE_LIMITS } from '@hermes/shared';
import { get, patch, post, put, del, ApiError } from './api';
import { useTimeStore } from './time';
import { useUiStore } from './ui-store';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      refetchOnReconnect: true,
      retry: (count, err) => !(err instanceof ApiError && err.status < 500) && count < 2,
    },
  },
});

export type { MyBidRow } from '@hermes/shared';

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

/** Каталог: infinite-пагинация. select → плоский { items, total }. */
export const useCatalog = (filter: CatalogFilter, q: string) =>
  useInfiniteQuery({
    queryKey: ['lots', filter, q],
    queryFn: ({ pageParam }) =>
      get<Page<LotDto>>(
        `/lots?filter=${filter}&limit=${PAGE_LIMITS.catalog}&offset=${pageParam}${q ? `&q=${encodeURIComponent(q)}` : ''}`,
      ),
    initialPageParam: 0,
    getNextPageParam: (last, all) => {
      const loaded = all.reduce((n, p) => n + p.items.length, 0);
      return loaded < last.total ? loaded : undefined;
    },
    select: (d) => ({ items: d.pages.flatMap((p) => p.items), total: d.pages[0]?.total ?? 0 }),
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

/** Мои ставки: infinite-пагинация. select → плоский { items, total }. */
export const useMyBids = (tab: 'active' | 'won') =>
  useInfiniteQuery({
    queryKey: ['my-bids', tab],
    queryFn: ({ pageParam }) =>
      get<Page<MyBidRow>>(`/me/bids?tab=${tab}&limit=${PAGE_LIMITS.myBids}&offset=${pageParam}`),
    initialPageParam: 0,
    getNextPageParam: (last, all) => {
      const loaded = all.reduce((n, p) => n + p.items.length, 0);
      return loaded < last.total ? loaded : undefined;
    },
    select: (d) => ({ items: d.pages.flatMap((p) => p.items), total: d.pages[0]?.total ?? 0 }),
  });

export const useNotifications = (enabled: boolean) =>
  useQuery<NotificationDto[]>({
    queryKey: ['notifications'],
    queryFn: () => get('/me/notifications'),
    enabled,
  });

/** Счётчик непрочитанных уведомлений — бейджи в оболочках. */
export function useUnreadCount() {
  const { data: me } = useMe();
  return useQuery<UnreadCountDto>({
    queryKey: ['notifications-unread'],
    queryFn: () => get('/me/notifications/unread-count'),
    enabled: Boolean(me),
  });
}

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
  const { data: me } = useMe();
  const openAuthPrompt = useUiStore((s) => s.openAuthPrompt);
  const m = useMutation({
    mutationFn: ({ lotId, on }: { lotId: string; on: boolean }) =>
      on ? put(`/lots/${lotId}/favorite`) : del(`/lots/${lotId}/favorite`),
    onSuccess: (_, { lotId, on }) => {
      qc.setQueryData<LotDto>(['lot', lotId], (old) => (old ? { ...old, isFavorite: on } : old));
      qc.invalidateQueries({ queryKey: ['lots'] });
    },
  });
  // Гость → модалка входа вместо 401 (одна точка для каталога/лота/live)
  const mutate = (vars: { lotId: string; on: boolean }) => {
    if (!me) {
      openAuthPrompt('добавлять в избранное');
      return;
    }
    m.mutate(vars);
  };
  return { ...m, mutate };
}

export function useSaveContacts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { fullName: string; phone: string; email: string }) =>
      patch('/me/contacts', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
  });
}

/** Пометить все уведомления прочитанными. */
export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => post('/me/notifications/read'),
    onSuccess: () => {
      const now = new Date().toISOString();
      qc.setQueryData<NotificationDto[]>(['notifications'], (old) =>
        old?.map((n) => (n.readAt ? n : { ...n, readAt: now })),
      );
      qc.setQueryData<UnreadCountDto>(['notifications-unread'], { count: 0 });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

/** Пометить одно уведомление прочитанным (оптимистично: readAt + декремент счётчика). */
export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => post(`/me/notifications/${id}/read`),
    onMutate: (id) => {
      const items = qc.getQueryData<NotificationDto[]>(['notifications']);
      const item = items?.find((n) => n.id === id);
      if (item?.readAt) return; // уже прочитано — счётчик не трогаем
      qc.setQueryData<NotificationDto[]>(['notifications'], (old) =>
        old?.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
      );
      qc.setQueryData<UnreadCountDto>(['notifications-unread'], (old) =>
        old ? { count: Math.max(0, old.count - 1) } : old,
      );
    },
    onError: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });
}

/** Сохранение настроек уведомлений — разреженный патч {event: {inApp?, push?}}. */
export function useSaveNotificationPrefs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Record<NotificationEvent, { inApp?: boolean; push?: boolean }>>) =>
      patch('/me/notification-prefs', data),
    onMutate: (data) => {
      qc.setQueryData<MeDto | null>(['me'], (old) =>
        old
          ? {
              ...old,
              notificationPrefs: Object.fromEntries(
                Object.entries(old.notificationPrefs).map(([ev, p]) => [
                  ev,
                  { ...p, ...data[ev as NotificationEvent] },
                ]),
              ) as MeDto['notificationPrefs'],
            }
          : old,
      );
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['me'] }),
  });
}

export async function logout(): Promise<void> {
  await post('/auth/logout');
  // me → стабильно null (не clear(), иначе ломается состояние и приватные роуты
  // проваливаются на /auth вместо гостевого режима с модалкой)
  queryClient.setQueryData(['me'], null);
  // Точечно убрать приватные пользовательские кэши
  queryClient.removeQueries({ queryKey: ['my-bids'] });
  queryClient.removeQueries({ queryKey: ['notifications'] });
  queryClient.removeQueries({ queryKey: ['notifications-unread'] });
  // Сбросить isFavorite/my у публичных лотов (гость их не имеет)
  queryClient.invalidateQueries({ queryKey: ['lots'] });
  queryClient.invalidateQueries({ queryKey: ['lot'] });
}
