/**
 * Cache helper Redis com proteção contra cache stampede e invalidação.
 *
 * Estratégia:
 *  - read-through: getOrCompute(key, ttl, factory)
 *      cacheia o resultado de factory() por TTL.
 *  - SETNX lock para single-flight: enquanto factory() está
 *    rodando, outras requests para a mesma key esperam (até
 *    lockTimeout).
 *  - invalidate(key | pattern) — invalidação imediata.
 *  - JSON serialize com prefix de versão para evitar
 *    poisoning entre deploys.
 *
 * Usar para:
 *  - aggregates pesados (getAccountBalance) — TTL 30s.
 *  - permissions cache — TTL 60s.
 *  - dashboards reads — TTL 15s.
 *
 * NÃO usar para:
 *  - dados financeiros que precisam ser exatos no instante (use
 *    leitura direta).
 *  - dados multi-tenant sem prefixo de tenant (risco de
 *    cross-tenant via key collision).
 */
import { redis } from "./redis";
import { logger } from "./logger";

const log = logger.child({ module: "cache" });
const VERSION = "v1";

function buildKey(key: string): string {
  return `cache:${VERSION}:${key}`;
}

/**
 * read-through cache com single-flight (evita stampede).
 *
 * Se a key existe, retorna o valor. Se não, tenta adquirir lock
 * de "computação em curso"; se outro processo está computando,
 * faz polling curto até o resultado aparecer (ou timeout).
 */
export async function getOrCompute<T>(
  key: string,
  ttlSeconds: number,
  factory: () => Promise<T>,
  options: { lockTimeoutMs?: number; pollIntervalMs?: number } = {},
): Promise<T> {
  const lockTimeoutMs = options.lockTimeoutMs ?? 5_000;
  const pollIntervalMs = options.pollIntervalMs ?? 50;
  const fullKey = buildKey(key);
  const lockKey = `${fullKey}:lock`;

  // Hit
  const cached = await redis.get(fullKey);
  if (cached !== null) {
    try {
      return JSON.parse(cached) as T;
    } catch {
      // Cache corrompido — invalida e segue para recompute.
      await redis.del(fullKey);
    }
  }

  // Miss — tenta lock
  const acquired = await redis.set(
    lockKey,
    `${process.pid}:${Date.now()}`,
    "EX",
    Math.ceil(lockTimeoutMs / 1000),
    "NX",
  );

  if (acquired === "OK") {
    // Somos o single-flight — computa
    try {
      const value = await factory();
      await redis.setex(fullKey, ttlSeconds, JSON.stringify(value));
      return value;
    } finally {
      await redis.del(lockKey).catch(() => {
        /* ignore */
      });
    }
  }

  // Outro processo está computando — poll curto
  const deadline = Date.now() + lockTimeoutMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, pollIntervalMs));
    const v = await redis.get(fullKey);
    if (v !== null) {
      try {
        return JSON.parse(v) as T;
      } catch {
        break;
      }
    }
  }

  // Timeout — fallback: chama factory direto. Pior caso: 2 chamadas
  // simultâneas em vez de 1, sem stampede massivo.
  log.warn(
    { key },
    "Cache lock timeout — fallback para compute direto (degraded)",
  );
  return factory();
}

/** Invalidação por chave exata. */
export async function invalidate(key: string): Promise<void> {
  await redis.del(buildKey(key));
}

/**
 * Invalidação por pattern (tenant-scoped).
 * Use prefix sempre — `tenant:${condoId}:*`.
 *
 * Cuidado: SCAN em base grande é caro. Para alta cardinalidade,
 * considere tags Redis ou eventos pub/sub.
 */
export async function invalidatePattern(pattern: string): Promise<number> {
  const fullPattern = buildKey(pattern);
  let count = 0;
  let cursor = "0";
  do {
    const [next, keys] = await redis.scan(
      cursor,
      "MATCH",
      fullPattern,
      "COUNT",
      100,
    );
    cursor = next;
    if (keys.length > 0) {
      await redis.del(...keys);
      count += keys.length;
    }
  } while (cursor !== "0");
  return count;
}

/** Helpers de chave para multi-tenant com namespace. */
export const cacheKeys = {
  accountBalance: (accountId: string) => `account:${accountId}:balance`,
  monthlyBalance: (condominiumId: string, year: number) =>
    `condo:${condominiumId}:monthly-balance:${year}`,
  userPermissions: (userId: string, condominiumId: string) =>
    `user:${userId}:permissions:${condominiumId}`,
};
