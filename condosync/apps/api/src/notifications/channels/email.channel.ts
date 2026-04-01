import { prisma } from '../../config/prisma';
import { sendMail } from '../../config/mail';
import { logger } from '../../config/logger';
import { env } from '../../config/env';
import { NotificationPayload } from '../types';

const log = logger.child({ module: 'email.channel' });

const ICON_MAP: Record<string, string> = {
  PARCEL: '📦',
  VISITOR: '🚪',
  FINANCIAL: '💰',
  MAINTENANCE: '🔧',
  COMMUNICATION: '📢',
  RESERVATION: '🏊',
  OCCURRENCE: '⚠️',
  ASSEMBLY: '🗳️',
};

function buildEmailHtml(name: string, title: string, message: string, type: string): string {
  const icon = ICON_MAP[type] ?? '🔔';
  const portalUrl = env.FRONTEND_URL;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#3b82f6,#6366f1);padding:28px 32px;text-align:center;">
            <p style="margin:0;font-size:28px;">${icon}</p>
            <h1 style="margin:8px 0 0;color:#ffffff;font-size:20px;font-weight:700;">CondoSync</h1>
            <p style="margin:4px 0 0;color:#bfdbfe;font-size:13px;">Gestão Inteligente de Condomínios</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 8px;color:#475569;font-size:14px;">Olá, <strong>${name}</strong>!</p>
            <h2 style="margin:0 0 16px;color:#1e293b;font-size:18px;">${title}</h2>
            <p style="margin:0 0 24px;color:#64748b;font-size:15px;line-height:1.6;">${message}</p>
            <div style="text-align:center;margin:24px 0;">
              <a href="${portalUrl}" style="background:#3b82f6;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block;">
                Acessar Portal CondoSync
              </a>
            </div>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="margin:0;color:#94a3b8;font-size:11px;">
              Este é um e-mail automático do CondoSync &mdash; por favor, não responda.<br>
              <a href="${portalUrl}" style="color:#3b82f6;text-decoration:none;">condosync.com.br</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export class EmailChannel {
  static async send(payload: NotificationPayload) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { email: true, name: true },
      });

      if (!user?.email) {
        log.warn(`Usuário ${payload.userId} sem e-mail — notificação por e-mail ignorada`);
        return;
      }

      const html = buildEmailHtml(user.name, payload.title, payload.message, payload.type as string);
      await sendMail(user.email, `${payload.title} — CondoSync`, html);
      log.info(`E-mail enviado para ${user.email} (userId: ${payload.userId}, type: ${payload.type})`);
    } catch (error) {
      log.error(`Falha ao enviar e-mail para usuário ${payload.userId}`, { error });
      // Não re-lança — falha de e-mail não deve interromper outros canais
    }
  }
}
