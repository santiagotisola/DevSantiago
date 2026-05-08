import { Worker, Job } from 'bullmq';
import { bullConnection } from '../config/redis';
import { logger } from '../config/logger';
import { NotificationPayload } from './types';
import { InAppChannel } from './channels/inapp.channel';
import { EmailChannel } from './channels/email.channel';

const log = logger.child({ module: 'notification.worker' });

export const notificationWorker = new Worker<NotificationPayload>(
  'notifications',
  async (job: Job<NotificationPayload>) => {
    log.info(`Processing notification job ${job.id}`, { data: job.data });
    
    const payload = job.data;
    
    if (payload.channels.includes('inapp')) {
      await InAppChannel.send(payload).catch(err => {
        log.error('InApp Channel failed', err);
      });
    }

    if (payload.channels.includes('email')) {
      await EmailChannel.send(payload).catch(err => {
        log.error('Email Channel failed', err);
      });
    }

    // if (payload.channels.includes('push')) {
    //   await PushChannel.send(payload); // Not implemented yet
    // }
    
    log.info(`Notification job ${job.id} processed successfully`);
  },
  {
    connection: bullConnection(),
    // Concurrency 20: notifications inapp/email são IO-bound, não
    // têm afinidade por contenção interna (cada job processa um
    // payload independente). Sem concurrency, default=1 → fila
    // serializa em pico (5k cobranças → 1.4h com SMTP de 500ms).
    concurrency: Number(process.env.NOTIFICATION_CONCURRENCY ?? 20),
  },
);

notificationWorker.on('failed', (job, err) => {
  log.error(`Notification job ${job?.id} failed`, { error: err.message, stack: err.stack });
});
