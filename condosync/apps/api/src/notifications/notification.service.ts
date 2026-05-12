import { emailQueue, inappQueue, pushQueue } from './notification.queue';
import { NotificationPayload } from './types';
import { logger } from '../config/logger';
import { preferenceService } from '../modules/notification-preferences/preference.service';

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

    // Aplica preferências do usuário (opt-out por tipo×canal).
    // Falha em ler preferências não bloqueia a notificação — assume
    // default opt-in (canais originais).
    let allowedChannels = payload.channels;
    try {
      allowedChannels = await preferenceService.filterChannels(
        payload.userId,
        payload.type,
        payload.channels,
      );
    } catch (err) {
      log.warn(
        { err: err instanceof Error ? err.message : err, userId: payload.userId },
        'Falha lendo preferências; usando canais originais',
      );
    }

    if (allowedChannels.length === 0) {
      log.debug(
        { userId: payload.userId, type: payload.type },
        'Usuário optou por não receber este tipo em nenhum canal',
      );
      return;
    }

    if (allowedChannels.includes('inapp')) {
      promises.push(
        inappQueue.add(
          'notification:inapp',
          { ...payload, channels: ['inapp'] },
          jobId ? { jobId: `${jobId}:inapp` } : undefined,
        ),
      );
    }

    if (allowedChannels.includes('email')) {
      promises.push(
        emailQueue.add(
          'notification:email',
          { ...payload, channels: ['email'] },
          jobId ? { jobId: `${jobId}:email` } : undefined,
        ),
      );
    }

    if (allowedChannels.includes('push')) {
      promises.push(
        pushQueue.add(
          'notification:push',
          { ...payload, channels: ['push'] },
          jobId ? { jobId: `${jobId}:push` } : undefined,
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
