import { redis } from '../config/redis';
import { logger } from '../config/logger';

const log = logger.child({ module: 'cache' });

const DEFAULT_TTL = 3600; // 1 hora em segundos

/**
 * Utilitários simples para cache distribuído via Redis.
 */
export const cache = {
  /**
   * Obtém um valor do cache.
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redis.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (error) {
      log.error(`Erro ao ler cache [${key}]:`, error);
      return null;
    }
  },

  /**
   * Define um valor no cache com TTL opcional.
   */
  async set(key: string, value: unknown, ttlSeconds: number = DEFAULT_TTL): Promise<void> {
    try {
      const data = JSON.stringify(value);
      await redis.set(key, data, 'EX', ttlSeconds);
    } catch (error) {
      log.error(`Erro ao escrever cache [${key}]:`, error);
    }
  },

  /**
   * Remove um item do cache.
   */
  async del(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      log.error(`Erro ao deletar cache [${key}]:`, error);
    }
  },

  /**
   * Remove múltiplos itens que casam com um padrão (ex: "dashboard:*").
   */
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      log.error(`Erro ao invalidar padrão [${pattern}]:`, error);
    }
  },
};
