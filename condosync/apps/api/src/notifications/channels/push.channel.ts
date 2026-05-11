import { pushService } from '../../modules/push/push.service';
import { logger } from '../../config/logger';
import { NotificationPayload } from '../types';
import { env } from '../../config/env';

const log = logger.child({ module: 'push.channel' });

const ICON_MAP: Record<string, string> = {
  PARCEL: '/pwa-192x192.png',
  VISITOR: '/pwa-192x192.png',
  FINANCIAL: '/pwa-192x192.png',
  MAINTENANCE: '/pwa-192x192.png',
  COMMUNICATION: '/pwa-192x192.png',
  RESERVATION: '/pwa-192x192.png',
  OCCURRENCE: '/pwa-192x192.png',
  ASSEMBLY: '/pwa-192x192.png',
};

const PATH_MAP: Record<string, string> = {
  PARCEL: '/minha-portaria/encomendas',
  VISITOR: '/minha-portaria/visitantes',
  FINANCIAL: '/minhas-cobrancas',
  MAINTENANCE: '/manutencao',
  COMMUNICATION: '/comunicados',
  RESERVATION: '/areas-comuns',
  OCCURRENCE: '/ocorrencias',
  ASSEMBLY: '/assembleias',
};

export class PushChannel {
  static async send(payload: NotificationPayload) {
    try {
      const url = (PATH_MAP[payload.type as string] ?? '/');
      const result = await pushService.sendToUser(payload.userId, {
        title: payload.title,
        body: payload.message,
        icon: ICON_MAP[payload.type as string] ?? '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        url: `${env.FRONTEND_URL.replace(/\/$/, '')}${url}`,
        tag: `${payload.type}:${payload.userId}`,
        data: payload.data,
      });
      log.debug(
        { userId: payload.userId, type: payload.type, ...result },
        'Push enviado',
      );
    } catch (error) {
      log.error('Falha no canal push', {
        userId: payload.userId,
        error: error instanceof Error ? error.message : String(error),
      });
      // Não relança — outros canais não devem falhar por causa do push
    }
  }
}
