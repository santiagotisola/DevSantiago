import { notificationQueue } from './notification.queue';
import { NotificationPayload } from './types';
import { logger } from '../config/logger';

const log = logger.child({ module: 'notification.service' });

export class NotificationService {
  /**
   * Enqueues a notification to be processed by background workers (BullMQ).
   */
  static async enqueue(payload: NotificationPayload) {
    log.info(`Enqueuing notification for user ${payload.userId} with type ${payload.type}`);
    await notificationQueue.add('notification:send', payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: true,
      removeOnFail: 100, // Keep last 100 failures
    });
  }
}
