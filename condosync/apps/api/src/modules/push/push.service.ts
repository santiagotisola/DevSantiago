import webpush from 'web-push';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { pushDeliveriesTotal } from '../../config/metrics';

const log = logger.child({ module: 'push' });

let vapidConfigured = false;
function ensureVapid(): boolean {
  if (vapidConfigured) return true;
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
    return false;
  }
  webpush.setVapidDetails(
    env.VAPID_SUBJECT,
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY,
  );
  vapidConfigured = true;
  return true;
}

export function pushEnabled(): boolean {
  return ensureVapid();
}

export function getVapidPublicKey(): string | null {
  return env.VAPID_PUBLIC_KEY ?? null;
}

export interface SubscriptionPayload {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  /** Tag agrupa notificações que se substituem (ex: encomendas da mesma unidade). */
  tag?: string;
  data?: Record<string, unknown>;
}

export const pushService = {
  /**
   * Registra ou atualiza uma subscription do dispositivo do usuário.
   * Idempotente por endpoint — se o mesmo endpoint chega novamente para
   * outro usuário (ex: dispositivo passou de mão), reatribui ao novo dono.
   */
  async subscribe(userId: string, sub: SubscriptionPayload, userAgent?: string) {
    const data = {
      userId,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      userAgent: userAgent ?? null,
      lastSeenAt: new Date(),
    };
    return prisma.pushSubscription.upsert({
      where: { endpoint: sub.endpoint },
      create: data,
      update: data,
    });
  },

  async unsubscribe(userId: string, endpoint: string) {
    return prisma.pushSubscription.deleteMany({
      where: { userId, endpoint },
    });
  },

  async listByUser(userId: string) {
    return prisma.pushSubscription.findMany({
      where: { userId },
      select: {
        id: true,
        endpoint: true,
        userAgent: true,
        createdAt: true,
        lastSeenAt: true,
      },
      orderBy: { lastSeenAt: 'desc' },
    });
  },

  /**
   * Envia notification para todos os endpoints de um usuário.
   * Falhas individuais são logadas; subscriptions com 404/410 são removidas
   * (dispositivo desinstalou o app ou revogou a permissão).
   */
  async sendToUser(userId: string, payload: NotificationPayload): Promise<{ sent: number; failed: number; pruned: number }> {
    if (!ensureVapid()) {
      log.debug('VAPID não configurado — push desligado', { userId });
      return { sent: 0, failed: 0, pruned: 0 };
    }
    const subs = await prisma.pushSubscription.findMany({ where: { userId } });
    if (subs.length === 0) return { sent: 0, failed: 0, pruned: 0 };
    return this._sendBatch(subs, payload);
  },

  /**
   * Envia para múltiplos usuários (broadcast). Útil para comunicados.
   */
  async sendToUsers(userIds: string[], payload: NotificationPayload) {
    if (!ensureVapid() || userIds.length === 0) {
      return { sent: 0, failed: 0, pruned: 0 };
    }
    const subs = await prisma.pushSubscription.findMany({
      where: { userId: { in: userIds } },
    });
    return this._sendBatch(subs, payload);
  },

  async _sendBatch(subs: Array<{ id: string; endpoint: string; p256dh: string; auth: string }>, payload: NotificationPayload) {
    const json = JSON.stringify(payload);
    let sent = 0;
    let failed = 0;
    let pruned = 0;

    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            json,
          );
          sent++;
          pushDeliveriesTotal.labels('sent').inc();
        } catch (err: any) {
          const statusCode = err?.statusCode;
          if (statusCode === 404 || statusCode === 410) {
            // Subscription expirada/desinstalada — limpar
            await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
            pruned++;
            pushDeliveriesTotal.labels('expired_subscription').inc();
          } else {
            failed++;
            pushDeliveriesTotal.labels('failed').inc();
            log.warn('Falha ao enviar push', {
              subscriptionId: sub.id,
              statusCode,
              error: err?.message,
            });
          }
        }
      }),
    );

    return { sent, failed, pruned };
  },

  /**
   * Resolve usuários de uma unidade ativa (RESIDENT/owner) para notificar.
   */
  async getUserIdsOfUnit(unitId: string): Promise<string[]> {
    const rows = await prisma.condominiumUser.findMany({
      where: { unitId, isActive: true },
      select: { userId: true },
    });
    return rows.map((r) => r.userId);
  },

  /**
   * Resolve todos os moradores ativos de um condomínio (para comunicados).
   */
  async getResidentIdsOfCondominium(condominiumId: string): Promise<string[]> {
    const rows = await prisma.condominiumUser.findMany({
      where: {
        condominiumId,
        isActive: true,
        role: { in: ['RESIDENT', 'COUNCIL_MEMBER', 'SYNDIC', 'CONDOMINIUM_ADMIN'] as any },
      },
      select: { userId: true },
    });
    // Dedup (um usuário pode aparecer em múltiplas unidades por algum motivo)
    return Array.from(new Set(rows.map((r) => r.userId)));
  },
};
