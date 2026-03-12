"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailChannel = void 0;
const prisma_1 = require("../../config/prisma");
const mail_1 = require("../../config/mail");
const logger_1 = require("../../config/logger");
const log = logger_1.logger.child({ module: 'email.channel' });
class EmailChannel {
    static async send(payload) {
        try {
            const user = await prisma_1.prisma.user.findUnique({
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
            await (0, mail_1.sendMail)(user.email, payload.title, htmlContent);
            log.info(`Email sent to ${user.email} (User: ${payload.userId})`);
        }
        catch (error) {
            log.error(`Failed to send email to user ${payload.userId}`, { error });
            throw error;
        }
    }
}
exports.EmailChannel = EmailChannel;
//# sourceMappingURL=email.channel.js.map