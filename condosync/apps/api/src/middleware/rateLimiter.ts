import rateLimit from 'express-rate-limit';
import { logger } from '../config/logger';

// Tenta usar Redis se disponível; caso contrário usa MemoryStore (free tier)
async function buildStore(prefix: string) {
  if (!process.env.REDIS_URL) return undefined; // MemoryStore
  try {
    const { default: RedisStore } = await import('rate-limit-redis');
    const { redis } = await import('../config/redis');
    return new RedisStore({
      sendCommand: (...args: string[]) => (redis as any).call(...args),
      prefix: `rl:${prefix}:`,
    });
  } catch {
    logger.warn('Redis indisponível — rate limiter usando MemoryStore (single-instance)');
    return undefined; // MemoryStore fallback
  }
}

// Rate limiter geral — carregado de forma assíncrona com fallback
let _generalStore: any;
let _authStore: any;

// Inicializa stores de forma lazy
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 2000,
  standardHeaders: true,
  legacyHeaders: false,
  // store será undefined até Redis inicializar; usa MemoryStore built-in por padrão
  skip: (req) => req.method === 'GET' && !!req.headers.authorization,
  message: {
    status: 429,
    message: 'Muitas requisições. Tente novamente em 15 minutos.',
  },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    status: 429,
    message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
  },
});

// Tenta substituir para RedisStore em background (não bloqueia boot)
if (process.env.REDIS_URL) {
  Promise.all([
    buildStore('general'),
    buildStore('auth'),
  ]).then(([gs, as]) => {
    if (gs) (rateLimiter as any).store = gs;
    if (as) (authRateLimiter as any).store = as;
    logger.info('Rate limiter: Redis store ativado');
  }).catch(() => {
    logger.warn('Rate limiter: mantendo MemoryStore (Redis falhou)');
  });
}
