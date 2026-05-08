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
 *
 * Retorna o "fingerprint" (string única) se o caller venceu a eleição;
 * `null` caso outra réplica já detenha a lock. O fingerprint deve ser
 * passado para `renewLeaderLock` periodicamente — sem ele a renovação
 * não consegue distinguir o dono atual de um terceiro tentando
 * tomá-la, e perderia leadership silenciosamente.
 *
 * TTL longo (default 5min) cobre boots simultâneos de réplicas.
 */
export async function tryAcquireLeaderLock(
  key: string,
  ttlSeconds = 300,
): Promise<string | null> {
  const fingerprint = `${process.pid}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  const result = await redis.set(
    `leader:${key}`,
    fingerprint,
    'EX',
    ttlSeconds,
    'NX',
  );
  return result === 'OK' ? fingerprint : null;
}

/**
 * Renova a lock se — e somente se — o caller ainda é o dono atual.
 *
 * Implementação Lua atômica: GET → comparar com fingerprint → EXPIRE.
 * Sem isso, usar `SET NX EX` para renovar falha (NX só seta se a chave
 * NÃO existe), e a chave acaba expirando em background.
 *
 * Retorna `true` se renovou com sucesso, `false` se a lock foi
 * tomada por outro processo (caller deveria reagir — geralmente
 * reiniciar para re-eleger).
 */
const RENEW_LUA = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("EXPIRE", KEYS[1], ARGV[2])
else
  return 0
end
`;

export async function renewLeaderLock(
  key: string,
  fingerprint: string,
  ttlSeconds = 300,
): Promise<boolean> {
  const result = (await redis.eval(
    RENEW_LUA,
    1,
    `leader:${key}`,
    fingerprint,
    String(ttlSeconds),
  )) as number;
  return result === 1;
}

/**
 * Libera a lock APENAS se ainda for nossa. Usar em shutdown gracioso
 * para acelerar a re-eleição em outra réplica.
 */
const RELEASE_LUA = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
else
  return 0
end
`;

export async function releaseLeaderLock(
  key: string,
  fingerprint: string,
): Promise<boolean> {
  const result = (await redis.eval(
    RELEASE_LUA,
    1,
    `leader:${key}`,
    fingerprint,
  )) as number;
  return result === 1;
}
