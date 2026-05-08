import { Worker, Job } from 'bullmq';
import { bullConnection } from '../config/redis';
import { logger } from '../config/logger';
import { NotificationPayload } from './types';
import { InAppChannel } from './channels/inapp.channel';
import { EmailChannel } from './channels/email.channel';

const log = logger.child({ module: 'notification.worker' });

/**
 * 2 workers independentes:
 *  - inappWorker: alta concurrency (default 50), latência baixa
 *    (Prisma + Socket.IO emit < 50ms).
 *  - emailWorker: concurrency moderada (default 10), tolera SMTP
 *    lento, retry exponencial mais agressivo.
 *
 * Concurrency individual via env: INAPP_CONCURRENCY, EMAIL_CONCURRENCY.
 *
 * Antes: 1 worker serializando inapp+email no mesmo job.
 * Saturação SMTP (Resend rate-limit) bloqueava todas as notificações
 * inapp em fila. Em pico de cobrança (5k jobs), atraso real-time
 * de 1.4h.
 *
 * Agora: jobs paralelos, cada canal independente. Pico de email
 * fila enche notifications-email mas inapp continua fluindo.
 */

export const inappWorker = new Worker<NotificationPayload>(
  'notifications-inapp',
  async (job: Job<NotificationPayload>) => {
    log.debug({ jobId: job.id, userId: job.data.userId }, 'Processing inapp');
    await InAppChannel.send(job.data);
  },
  {
    connection: bullConnection(),
    concurrency: Number(process.env.INAPP_CONCURRENCY ?? 50),
  },
);

inappWorker.on('failed', (job, err) => {
  log.error(
    { jobId: job?.id, userId: job?.data?.userId, attempts: job?.attemptsMade },
    `inapp falhou: ${err.message}`,
  );
});

export const emailWorker = new Worker<NotificationPayload>(
  'notifications-email',
  async (job: Job<NotificationPayload>) => {
    log.debug({ jobId: job.id, userId: job.data.userId }, 'Processing email');
    await EmailChannel.send(job.data);
  },
  {
    connection: bullConnection(),
    concurrency: Number(process.env.EMAIL_CONCURRENCY ?? 10),
    // Email tem SMTP-side rate-limit; expor BullMQ rate-limit
    // protege contra ban de provedor (Resend free: 100/day, paid:
    // configurável).
    limiter: {
      max: Number(process.env.EMAIL_LIMITER_MAX ?? 100),
      duration: Number(process.env.EMAIL_LIMITER_DURATION ?? 60_000),
    },
  },
);

emailWorker.on('failed', (job, err) => {
  log.error(
    { jobId: job?.id, userId: job?.data?.userId, attempts: job?.attemptsMade },
    `email falhou: ${err.message}`,
  );
});

// Compat: worker legacy continua drenando a fila antiga até zerar
// (deletar em sprint posterior após confirmação).
export const notificationWorker = new Worker<NotificationPayload>(
  'notifications',
  async (job: Job<NotificationPayload>) => {
    const payload = job.data;
    if (payload.channels.includes('inapp')) {
      await InAppChannel.send(payload).catch((err) =>
        log.error('InApp Channel failed (legacy queue)', err),
      );
    }
    if (payload.channels.includes('email')) {
      await EmailChannel.send(payload).catch((err) =>
        log.error('Email Channel failed (legacy queue)', err),
      );
    }
  },
  {
    connection: bullConnection(),
    concurrency: Number(process.env.NOTIFICATION_CONCURRENCY ?? 20),
  },
);
notificationWorker.on('failed', (job, err) => {
  log.error(`Legacy notification job ${job?.id} failed`, { error: err.message });
});
