/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

declare let self: ServiceWorkerGlobalScope;

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// Push notification handler
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body as string,
    icon: (data.icon as string) || '/pwa-192x192.png',
    badge: (data.badge as string) || '/pwa-192x192.png',
    data: data.data,
    tag: data.tag as string,
    vibrate: [200, 100, 200] as number[],
  } as NotificationOptions;

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Clique na notificação abre o painel
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList: readonly WindowClient[]) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
