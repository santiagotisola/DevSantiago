import { prisma } from '../../config/prisma';
import { logger } from '../../config/logger';
import { NotificationPayload } from '../types';

const log = logger.child({ module: 'whatsapp.channel' });

export class WhatsAppChannel {
  static async send(payload: NotificationPayload) {
    try {
      // Importação dinâmica para evitar erro se Baileys não inicializado
      const { enviarMensagem, getStatus } = await import('../../modules/whatsapp/services/baileys.service');

      if (getStatus() !== 'conectado') {
        log.warn('WhatsApp não conectado — notificação WA ignorada');
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { phone: true, name: true },
      });

      if (!user?.phone) {
        log.warn(`Usuário ${payload.userId} sem telefone — WA ignorado`);
        return;
      }

      // Normaliza número: remove formatação, adiciona 55 se necessário
      const phone = user.phone.replace(/\D/g, '');
      const normalized = phone.startsWith('55') ? phone : `55${phone}`;

      const message = `*CondoSync* 🏠\n\n*${payload.title}*\n\n${payload.message}\n\n_Acesse o app para mais detalhes._`;

      await enviarMensagem(normalized, message);
      log.info(`WhatsApp enviado para ${normalized} (userId: ${payload.userId})`);
    } catch (error) {
      log.error(`Falha ao enviar WhatsApp para usuário ${payload.userId}`, { error });
      // Não re-lança — falha de WA não deve interromper outros canais
    }
  }
}
