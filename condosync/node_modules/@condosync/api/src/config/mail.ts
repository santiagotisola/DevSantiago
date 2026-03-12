import nodemailer from 'nodemailer';
import { env } from './env';
import { logger } from './logger';

export const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(env.SMTP_PORT),
  secure: parseInt(env.SMTP_PORT) === 465,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

export const sendMail = async (to: string, subject: string, html: string) => {
  try {
    const info = await transporter.sendMail({
      from: env.SMTP_FROM,
      to,
      subject,
      html,
    });
    
    logger.info(`Message sent: ${info.messageId}`);
    // If using ethereal email for testing
    if (env.SMTP_HOST === 'smtp.ethereal.email') {
      logger.info(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
    return info;
  } catch (error) {
    logger.error('Error sending email:', error);
    throw error;
  }
};
