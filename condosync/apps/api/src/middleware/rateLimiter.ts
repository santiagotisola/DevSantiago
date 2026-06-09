import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import crypto from 'node:crypto';
import { redis } from '../config/redis';
import { logger } from '../config/logger';

// Hash curto e estável do email — evita armazenar PII em chaves
// Redis (que aparecem em MONITOR, replicação, backups, métricas).
function hashEmail(email: string): string {
  return crypto
    .createHash('sha256')
    .update(email.trim().toLowerCase())
    .digest('hex')
    .slice(0, 16);
}

const redisStore = new RedisStore({
  // ioredis não expõe `.call()` diretamente — usa sendCommand wrapper
  sendCommand: (...args: string[]) => (redis as any).call(...args),
});

// Tenta usar Redis se disponível; caso contrário usa MemoryStore (free tier)
async function buildStore(prefix: string) {
  if (!process.env.REDIS_URL) return undefined; // MemoryStore
  try {
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
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args: string[]) => (redis as any).call(...args),
    prefix: 'rl:auth:',
  }),
  message: {
    status: 429,
    message: 'Muitas tentativas. Tente novamente em 15 minutos.',
  },
});

// Rate-limit dedicado para o módulo AI: chamadas externas (OpenAI)
// custam $$ e podem ser abusadas por usuário autenticado.
// Bucket por usuário (não por IP) — 10 chamadas/min por user.
export const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.userId ?? req.ip ?? 'anon',
  store: new RedisStore({
    sendCommand: (...args: string[]) => (redis as any).call(...args),
    prefix: 'rl:ai:',
  }),
  message: {
    status: 429,
    message: 'Limite de uso do assistente IA atingido. Aguarde 1 minuto.',
  },
});

// Rate-limit por (email + ip) para forgot-password — evita
// enumeração e spam para a caixa de uma vítima específica.
export const forgotPasswordRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = String(req.body?.email ?? '');
    return `${hashEmail(email)}:${req.ip ?? ''}`;
  },
  store: new RedisStore({
    sendCommand: (...args: string[]) => (redis as any).call(...args),
    prefix: 'rl:forgot:',
  }),
  message: {
    status: 429,
    message: 'Muitas solicitações de redefinição. Tente novamente em 1 hora.',
  },
});

// Rate limiter para operações sensíveis (finance, password reset, broadcast)
export const sensitiveRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 50,
  message: {
    status: 429,
    message: 'Limite de operações sensíveis atingido. Tente novamente em 1 hora.',
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
