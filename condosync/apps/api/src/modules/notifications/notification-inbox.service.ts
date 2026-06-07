import { prisma } from '../../config/prisma';
import { NotificationType } from '@prisma/client';
import { NotificationService } from '../../notifications/notification.service';

export class NotificationInboxService {
  async list(
    userId: string,
    filters?: { isRead?: boolean; type?: NotificationType; page?: number; limit?: number },
  ) {
    const { page = 1, limit = 20, isRead, type } = filters || {};

    const where = {
      userId,
      ...(isRead !== undefined && { isRead }),
      ...(type && { type }),
    };

    const [notifications, total, unreadCount] = await prisma.$transaction([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return { notifications, total, unreadCount, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({ where: { userId, isRead: false } });
  }

  async markAsRead(id: string, userId: string) {
    return prisma.notification.update({
      where: { id, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async delete(id: string, userId: string) {
    await prisma.notification.delete({ where: { id, userId } });
  }

  /**
   * Envia notificação para um usuário (salva no DB via BullMQ + envia push se inscrito)
   */
  async send(params: {
    condominiumId: string;
    userId: string;
    title: string;
    body: string;
    type: NotificationType;
    referenceId?: string;
    referenceType?: string;
  }) {
    await NotificationService.enqueue({
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.body,
      data: {
        condominiumId: params.condominiumId,
        referenceId: params.referenceId,
        referenceType: params.referenceType,
      },
      channels: ['inapp', 'push'],
    });
  }

  /**
   * Broadcast para múltiplos usuários
   */
  async broadcast(params: {
    condominiumId: string;
    userIds: string[];
    title: string;
    body: string;
    type: NotificationType;
    referenceId?: string;
    referenceType?: string;
  }) {
    await Promise.all(
      params.userIds.map((userId) =>
        this.send({ ...params, userId }),
      ),
    );
  }

  /**
   * Broadcast para todos os usuários ativos de um condomínio
   */
  async broadcastToCondominium(
    condominiumId: string,
    params: { title: string; body: string; type: NotificationType; referenceId?: string; referenceType?: string },
  ) {
    const members = await prisma.condominiumUser.findMany({
      where: { condominiumId, isActive: true },
      select: { userId: true },
    });

    await this.broadcast({
      condominiumId,
      userIds: members.map((m) => m.userId),
      ...params,
    });
  }
}

export const notificationInboxService = new NotificationInboxService();
