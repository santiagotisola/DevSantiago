/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import {
  StaleWhileRevalidate,
  NetworkFirst,
} from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope;

// __WB_MANIFEST é injetado pelo vite-plugin-pwa em build com a lista
// de assets para precache (HTML, JS, CSS, ícones). O cast cobre uma
// incompatibilidade entre as definições de Workbox e DOM lib sobre
// SharedArrayBuffer vs ArrayBuffer no Manifest entries.
precacheAndRoute((self as any).__WB_MANIFEST);

// Imagens — stale-while-revalidate
registerRoute(
  ({ request }) => request.destination === 'image',
  new StaleWhileRevalidate({ cacheName: 'images' }),
);

// API GET — network-first com fallback cache curto (visitantes,
// encomendas, etc. seguem funcionando offline em modo leitura).
registerRoute(
  ({ url, request }) => request.method === 'GET' && url.pathname.startsWith('/api/v1/'),
  new NetworkFirst({
    cacheName: 'api-get',
    networkTimeoutSeconds: 5,
    plugins: [
      {
        cacheWillUpdate: async ({ response }) =>
          response && response.status === 200 ? response : null,
      },
    ],
  }),
);

// ─── PUSH ────────────────────────────────────────────────────────
interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

self.addEventListener('push', (event: PushEvent) => {
  let payload: PushPayload = { title: 'CondoSync', body: 'Você tem uma nova notificação' };
  try {
    if (event.data) payload = { ...payload, ...(event.data.json() as PushPayload) };
  } catch {
    // Push sem JSON válido — usa default
  }

  // renotify cast em any: existe na Notifications API (re-toca som/vibra
  // quando uma notification de mesma `tag` substitui outra), mas o
  // typedef do lib.dom ainda não inclui na assinatura.
  const promise = self.registration.showNotification(payload.title, {
    body: payload.body,
    icon: payload.icon ?? '/pwa-192x192.png',
    badge: payload.badge ?? '/pwa-192x192.png',
    tag: payload.tag,
    data: { url: payload.url ?? '/', ...payload.data },
    ...(payload.tag ? { renotify: true } : {}),
  } as NotificationOptions);
  event.waitUntil(promise);
});

// Clique na notificação — foca janela existente ou abre nova
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const targetUrl = (event.notification.data as { url?: string })?.url ?? '/';

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      for (const client of allClients) {
        const url = new URL(client.url);
        // Foca aba já aberta do CondoSync e navega para a rota alvo
        if (url.origin === self.location.origin && 'focus' in client) {
          await (client as WindowClient).focus();
          if ('navigate' in client) {
            await (client as WindowClient).navigate(targetUrl).catch(() => undefined);
          }
          return;
        }
      }
      await self.clients.openWindow(targetUrl);
    })(),
  );
});

// Skip waiting via mensagem (registerType: autoUpdate dispara isso)
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
