import winston from 'winston';
import { env } from './env';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  env.NODE_ENV === 'production'
    ? winston.format.json()
    : winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, module: mod, ...meta }) => {
          const prefix = mod ? `[${mod}] ` : '';
          const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
          return `[${timestamp}] ${level}: ${prefix}${message}${metaStr}`;
        })
      )
);

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880,
      maxFiles: 5,
    }),
  ],
});

/**
 * Cria um logger com contexto de módulo (ex: "finance", "portaria").
 * Uso: const log = createModuleLogger('finance');
 *      log.info('Cobrança criada', { chargeId, amount });
 */
export function createModuleLogger(moduleName: string) {
  return logger.child({ module: moduleName });
}
