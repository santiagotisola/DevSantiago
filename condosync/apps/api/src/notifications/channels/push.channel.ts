import webpush from 'web-push';
import { prisma } from '../../config/prisma';
import { logger } from '../../config/logger';
import { env } from '../../config/env';
import { NotificationPayload } from '../types';

const log = logger.child({ module: 'push.channel' });

// Configura VAPID apenas se as chaves estiverem disponíveis
function configureVapid() {
  if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      `mailto:${env.VAPID_EMAIL}`,
      env.VAPID_PUBLIC_KEY,
      env.VAPID_PRIVATE_KEY,
    );
    return true;
  }
  return false;
}

const vapidConfigured = configureVapid();

export class PushChannel {
  static async send(payload: NotificationPayload) {
    if (!vapidConfigured) {
      log.warn('VAPID keys não configuradas — push ignorado');
      return;
    }

    try {
      const subscriptions = await prisma.pushSubscription.findMany({
        where: { userId: payload.userId },
      });

      if (subscriptions.length === 0) {
        log.debug(`Sem push subscriptions para userId ${payload.userId}`);
        return;
      }

      const pushPayload = JSON.stringify({
        title: payload.title,
        body: payload.message,
        icon: '/app/pwa-192x192.png',
        badge: '/app/pwa-192x192.png',
        data: { ...payload.data, type: payload.type, userId: payload.userId },
        tag: `${payload.type}-${payload.userId}`,
        renotify: true,
      });

      await Promise.allSettled(
        subscriptions.map(async (sub) => {
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              pushPayload,
            );
            log.info(`Push enviado para userId ${payload.userId} (endpoint: ${sub.endpoint.slice(-20)})`);
          } catch (err: any) {
            // Subscription expirada — remover automaticamente
            if (err.statusCode === 404 || err.statusCode === 410) {
              log.warn(`Subscription expirada, removendo: ${sub.id}`);
              await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
            } else {
              log.error(`Falha ao enviar push para subscription ${sub.id}`, { error: err });
            }
          }
        }),
      );
    } catch (error) {
      log.error(`Falha no PushChannel para userId ${payload.userId}`, { error });
    }
  }
}
