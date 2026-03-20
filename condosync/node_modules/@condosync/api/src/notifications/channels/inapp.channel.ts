import { prisma } from '../../config/prisma';
import { logger } from '../../config/logger';
import { io } from '../../server';
import { NotificationPayload } from '../types';

const log = logger.child({ module: 'inapp.channel' });

export class InAppChannel {
  static async send(payload: NotificationPayload) {
    log.info(`Sending in-app notification to user ${payload.userId}`);
    
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: payload.userId,
          type: payload.type,
          title: payload.title,
          message: payload.message,
          data: payload.data ? payload.data : undefined,
        },
      });
      
      // Emitir evento em tempo real via Socket.IO
      io.to(`user:${payload.userId}`).emit('notification:new', {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        createdAt: notification.createdAt,
      });

      log.info(`In-app notification created and emitted for ${payload.userId}`);
    } catch (error) {
      log.error(`Failed to create in-app notification`, { userId: payload.userId, error });
      throw error;
    }
  }
}
