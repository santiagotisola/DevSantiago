import { NotificationType, Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import type { NotificationChannel } from '../../notifications/types';

const ALL_TYPES: NotificationType[] = [
  'VISITOR',
  'PARCEL',
  'MAINTENANCE',
  'FINANCIAL',
  'COMMUNICATION',
  'RESERVATION',
  'OCCURRENCE',
  'ASSEMBLY',
];

export const preferenceService = {
  /**
   * Devolve todas as preferências do usuário (uma linha por NotificationType).
   * Tipos sem linha gravada usam o default opt-in (todos canais ativos).
   */
  async listAll(userId: string) {
    const rows = await prisma.notificationPreference.findMany({
      where: { userId },
    });
    const byType = new Map(rows.map((r) => [r.type, r]));
    return ALL_TYPES.map((t) => {
      const r = byType.get(t);
      return {
        type: t,
        inapp: r?.inapp ?? true,
        email: r?.email ?? true,
        push: r?.push ?? true,
      };
    });
  },

  async upsert(
    userId: string,
    type: NotificationType,
    patch: { inapp?: boolean; email?: boolean; push?: boolean },
  ) {
    return prisma.notificationPreference.upsert({
      where: { userId_type: { userId, type } },
      create: {
        userId,
        type,
        inapp: patch.inapp ?? true,
        email: patch.email ?? true,
        push: patch.push ?? true,
      },
      update: patch,
    });
  },

  /**
   * Para o dispatcher: dado userId + type, retorna o subset de canais
   * permitidos (intersecção entre os solicitados pelo emissor e os
   * opt-ins do usuário). Default: tudo permitido se não há linha.
   */
  async filterChannels(
    userId: string,
    type: NotificationType,
    requested: NotificationChannel[],
  ): Promise<NotificationChannel[]> {
    const pref = await prisma.notificationPreference.findUnique({
      where: { userId_type: { userId, type } },
    });
    if (!pref) return requested;
    const allowed = new Set<NotificationChannel>();
    if (pref.inapp) allowed.add('inapp');
    if (pref.email) allowed.add('email');
    if (pref.push) allowed.add('push');
    return requested.filter((c) => allowed.has(c));
  },
};
