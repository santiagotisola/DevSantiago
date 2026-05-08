import { Queue } from 'bullmq';
import { bullConnection } from '../config/redis';
import { NotificationPayload } from './types';

/**
 * Filas separadas por canal — isola throughput e contenção.
 *
 * Antes: 1 fila `notifications` processava inapp + email + sms
 * em série dentro do worker. Pico de email (SMTP 500ms cada)
 * bloqueava notifications inapp instantâneas; saturação SMTP
 * derrubava UX de notificações em-tempo-real.
 *
 * Agora:
 *  - inapp: jobs leves (Prisma + Socket.IO emit). Concurrency
 *    alta. Falha rara.
 *  - email: jobs IO-bound externos (SMTP/Resend). Concurrency
 *    moderada. Retry policy distinta.
 *  - sms: reservado para o futuro; mesma estratégia.
 *
 * Cada fila tem DLQ implícita via removeOnFail (rows ficam em
 * `failed` para drain via UI BullMQ ou alerta Prometheus).
 *
 * Backward compat: NotificationService.enqueue distribui para a
 * fila correta com base em payload.channels.
 */
export const inappQueue = new Queue<NotificationPayload>('notifications-inapp', {
  connection: bullConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2_000 }, // rápido, IO-bound interno
    removeOnComplete: { age: 3600, count: 1000 },
    removeOnFail: 500,
  },
});

export const emailQueue = new Queue<NotificationPayload>('notifications-email', {
  connection: bullConnection(),
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 30_000 }, // SMTP pode ter rate-limit
    removeOnComplete: { age: 7 * 86400, count: 5000 }, // forensics
    removeOnFail: 1000,
  },
});

// Compat: queue legacy mantida para drainar jobs já enfileirados
// no momento do deploy. Remover em sprint subsequente após
// confirmação de que está vazia (BullMQ UI ou queue.getJobCounts).
export const notificationQueue = new Queue<NotificationPayload, void, string>(
  'notifications',
  { connection: bullConnection() },
);
