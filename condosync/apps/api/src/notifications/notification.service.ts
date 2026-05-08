import { emailQueue, inappQueue } from './notification.queue';
import { NotificationPayload } from './types';
import { logger } from '../config/logger';

const log = logger.child({ module: 'notification.service' });

/**
 * Distribui o payload nas filas certas com base em payload.channels.
 *
 * Cada canal vira UM job próprio com seu próprio retry/backoff.
 * Antes: 1 job processava inapp+email serializado; falha em email
 * agora não retém inapp.
 *
 * jobId opcional permite dedupe externo (ex: notificação por
 * cobrança X — passar jobId=`charge:${id}:reminder`).
 */
export class NotificationService {
  static async enqueue(payload: NotificationPayload, jobId?: string) {
    const promises: Promise<unknown>[] = [];

    if (payload.channels.includes('inapp')) {
      promises.push(
        inappQueue.add(
          'notification:inapp',
          { ...payload, channels: ['inapp'] },
          jobId ? { jobId: `${jobId}:inapp` } : undefined,
        ),
      );
    }

    if (payload.channels.includes('email')) {
      promises.push(
        emailQueue.add(
          'notification:email',
          { ...payload, channels: ['email'] },
          jobId ? { jobId: `${jobId}:email` } : undefined,
        ),
      );
    }

    // sms futuro: smsQueue.add(...)

    if (promises.length === 0) {
      log.warn(`Notification para user ${payload.userId} sem canais válidos`);
      return;
    }

    await Promise.all(promises);
    log.info(
      { userId: payload.userId, type: payload.type, channels: payload.channels },
      'Notification enfileirada',
    );
  }
}
