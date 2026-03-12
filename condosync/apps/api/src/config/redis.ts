import Redis from 'ioredis';
import { env } from './env';
import { logger } from './logger';

const log = logger.child({ module: 'redis' });

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('connect', () => {
  log.info('Redis conectado com sucesso');
});

redis.on('error', (error) => {
  log.error('Erro na conexão com Redis:', error);
});
