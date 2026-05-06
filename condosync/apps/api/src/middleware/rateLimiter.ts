import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../config/redis';

const redisStore = new RedisStore({
  // ioredis não expõe `.call()` diretamente — usa sendCommand wrapper
  sendCommand: (...args: string[]) => (redis as any).call(...args),
});

export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  store: redisStore,
  message: {
    status: 429,
    message: 'Muitas requisições. Tente novamente em 15 minutos.',
  },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  store: new RedisStore({
    sendCommand: (...args: string[]) => (redis as any).call(...args),
    prefix: 'rl:auth:',
  }),
  message: {
    status: 429,
    message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
  },
});
