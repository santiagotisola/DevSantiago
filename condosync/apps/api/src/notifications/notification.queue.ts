import { Queue } from 'bullmq';
import { bullConnection } from '../config/redis';
import { NotificationPayload } from './types';

export const notificationQueue = new Queue<NotificationPayload, void, string>('notifications', {
  connection: bullConnection(),
});
