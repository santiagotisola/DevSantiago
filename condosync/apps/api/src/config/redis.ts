import Redis from 'ioredis';
import { env } from './env';
import { logger } from './logger';

const log = logger.child({ module: 'redis' });

// Conexão padrão da aplicação (cache, rate-limit, locks).
// maxRetriesPerRequest:null faz a conexão esperar Redis voltar
// indefinidamente — adequado para BullMQ e jobs persistentes.
// Para o app web isso pode mascarar problemas; veja bullConnection
// abaixo para conexões dedicadas a workers.
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

/**
 * Cria uma nova conexão ioredis dedicada para BullMQ.
 *
 * BullMQ recomenda fortemente conexões separadas por Worker
 * (porque emitem comandos blocking BRPOPLPUSH). Compartilhar uma
 * única conexão entre 6 workers + queues + app code pode resultar
 * em "Connection in subscriber mode, only subscriber commands may
 * be used" e bloqueios estranhos.
 *
 * Use este factory ao instanciar Queue/Worker — não a `redis`
 * exportada acima.
 */
export function bullConnection() {
  return new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times) {
      return Math.min(times * 50, 2000);
    },
  });
}

/**
 * Tenta adquirir uma lock distribuída via Redis SET NX EX.
 * Retorna `true` se o caller é o líder (deve registrar repeatables /
 * rodar a tarefa única); `false` caso outra réplica já segura o lock.
 *
 * TTL longo (default 5min) cobre boots simultâneos de réplicas;
 * caller deve renovar a lock periodicamente se a tarefa exceder o TTL.
 */
export async function tryAcquireLeaderLock(
  key: string,
  ttlSeconds = 300,
): Promise<boolean> {
  const value = `${process.pid}:${Date.now()}`;
  const result = await redis.set(`leader:${key}`, value, 'EX', ttlSeconds, 'NX');
  return result === 'OK';
}
