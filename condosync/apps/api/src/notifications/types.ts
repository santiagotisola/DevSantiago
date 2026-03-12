import { NotificationType } from '@prisma/client';

export type NotificationChannel = 'inapp' | 'email' | 'push';

export interface NotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  channels: NotificationChannel[];
}
