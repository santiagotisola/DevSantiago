import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { env } from './env';
import { logger } from './logger';

const log = logger.child({ module: 'mail' });

// ── Resend (produção) ─────────────────────────────────────────────────────────
const resendClient = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

// ── Nodemailer SMTP (desenvolvimento / fallback) ──────────────────────────────
const smtpTransporter = nodemailer.createTransport({
  host: env.SMTP_HOST || 'localhost',
  port: parseInt(env.SMTP_PORT),
  secure: parseInt(env.SMTP_PORT) === 465,
  auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
});

/**
 * Envia e-mail via Resend em produção ou SMTP local em desenvolvimento.
 * Em ambiente de teste (NODE_ENV=test) não envia nada.
 */
export const sendMail = async (to: string, subject: string, html: string): Promise<void> => {
  if (env.NODE_ENV === 'test') return;

  const from = env.SMTP_FROM;

  // Usar Resend se API key estiver configurada
  if (resendClient) {
    const { error } = await resendClient.emails.send({ from, to, subject, html });
    if (error) {
      log.error('Resend: falha ao enviar e-mail', { to, subject, error });
      throw new Error(`Resend error: ${error.message}`);
    }
    log.info(`Resend: e-mail enviado para ${to}`);
    return;
  }

  // Fallback: SMTP local (Mailpit em dev)
  const info = await smtpTransporter.sendMail({ from, to, subject, html });
  log.info(`SMTP: e-mail enviado para ${to} — messageId: ${info.messageId}`);
  if (env.SMTP_HOST === 'localhost' || env.SMTP_HOST === 'mailpit') {
    log.info(`Mailpit preview: http://localhost:8025`);
  }
};
