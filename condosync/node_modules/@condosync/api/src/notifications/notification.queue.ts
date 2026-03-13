import { Queue } from 'bullmq';
import { redis } from '../config/redis';
import { NotificationPayload } from './types';

export const notificationQueue = new Queue<NotificationPayload, void, string>('notifications', {
  connection: redis as any,
});
