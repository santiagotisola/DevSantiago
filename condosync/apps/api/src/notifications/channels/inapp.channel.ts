import { prisma } from '../../config/prisma';
import { logger } from '../../config/logger';
import { NotificationPayload } from '../types';

const log = logger.child({ module: 'inapp.channel' });

export class InAppChannel {
  static async send(payload: NotificationPayload) {
    log.info(`Sending in-app notification to user ${payload.userId}`);
    
    try {
      await prisma.notification.create({
        data: {
          userId: payload.userId,
          type: payload.type,
          title: payload.title,
          message: payload.message,
          data: payload.data ? payload.data : undefined,
        },
      });
      
      // TODO: Emit Socket.IO event here
      log.info(`In-app notification created for ${payload.userId}`);
    } catch (error) {
      log.error(`Failed to create in-app notification`, { userId: payload.userId, error });
      throw error;
    }
  }
}
