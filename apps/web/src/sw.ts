/// <reference lib="webworker" />
/* Service worker: precache app-shell + Web Push. Live-данные торгов НЕ кэшируются. */
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision: string | null }> };

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// Фото лотов и шрифты — CacheFirst
registerRoute(
  ({ url }) => url.hostname.includes('fonts.g') || url.pathname.endsWith('.webp') || url.hostname.includes('unsplash'),
  new CacheFirst({
    cacheName: 'media',
    plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 7 * 24 * 3600 })],
  }),
);

// Каталог — NetworkFirst (офлайн-просмотр последнего состояния); ставки/лоты live — только сеть
registerRoute(
  ({ url, request }) => request.method === 'GET' && url.pathname === '/api/lots',
  new NetworkFirst({ cacheName: 'catalog', networkTimeoutSeconds: 4 }),
);

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload: { title?: string; body?: string; url?: string; tag?: string } = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Hermes Trade', body: event.data.text() };
  }
  event.waitUntil(
    self.registration.showNotification(payload.title ?? 'Hermes Trade', {
      body: payload.body,
      tag: payload.tag,
      icon: '/pwa-192.png',
      badge: '/pwa-192.png',
      data: { url: payload.url ?? '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string })?.url ?? '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const c of clients) {
        if ('focus' in c) {
          c.navigate(url);
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
