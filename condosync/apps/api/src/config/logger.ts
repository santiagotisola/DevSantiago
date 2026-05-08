import winston from 'winston';
import { env } from './env';
// Import lazy para evitar ciclo (logger pode ser usado antes do
// requestContext em alguns paths).
let _getRequestContext: (() => { requestId?: string; userId?: string; condominiumId?: string } | undefined) | null = null;
function getRequestContext() {
  if (!_getRequestContext) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      _getRequestContext = require('../middleware/requestContext').getRequestContext;
    } catch {
      _getRequestContext = () => undefined;
    }
  }
  return _getRequestContext!();
}

// Format que injeta requestId/userId/condominiumId vindo do
// AsyncLocalStorage do request em curso. Funciona em handlers
// HTTP, services chamados deles, e callbacks de Promise no mesmo
// async context.
const injectRequestContext = winston.format((info) => {
  const ctx = getRequestContext();
  if (ctx) {
    if (ctx.requestId && !info.requestId) info.requestId = ctx.requestId;
    if (ctx.userId && !info.userId) info.userId = ctx.userId;
    if (ctx.condominiumId && !info.condominiumId) info.condominiumId = ctx.condominiumId;
  }
  return info;
});

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  injectRequestContext(),
  env.NODE_ENV === 'production'
    ? winston.format.json()
    : winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, module: mod, requestId, ...meta }) => {
          const prefix = mod ? `[${mod}] ` : '';
          const reqTag = requestId ? `[req:${String(requestId).slice(0, 8)}] ` : '';
          const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
          return `[${timestamp}] ${level}: ${reqTag}${prefix}${message}${metaStr}`;
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
