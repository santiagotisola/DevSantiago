import { prisma } from '../../config/prisma';
import { sendMail } from '../../config/mail';
import { logger } from '../../config/logger';
import { NotificationPayload } from '../types';

const log = logger.child({ module: 'email.channel' });

export class EmailChannel {
  static async send(payload: NotificationPayload) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { email: true, name: true }
      });

      if (!user?.email) {
        log.warn(`User ${payload.userId} has no email, skipping email notification`);
        return;
      }

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>${payload.title}</h2>
          <p>${payload.message}</p>
          <hr>
          <p style="font-size: 12px; color: #888;">Este é um e-mail automático do CondoSync, por favor não responda.</p>
        </div>
      `;

      await sendMail(user.email, payload.title, htmlContent);
      log.info(`Email sent to ${user.email} (User: ${payload.userId})`);
    } catch (error) {
      log.error(`Failed to send email to user ${payload.userId}`, { error });
      throw error;
    }
  }
}
