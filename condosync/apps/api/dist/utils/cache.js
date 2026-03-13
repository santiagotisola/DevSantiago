"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cache = void 0;
const redis_1 = require("../config/redis");
const logger_1 = require("../config/logger");
const log = logger_1.logger.child({ module: 'cache' });
const DEFAULT_TTL = 3600; // 1 hora em segundos
/**
 * Utilitários simples para cache distribuído via Redis.
 */
exports.cache = {
    /**
     * Obtém um valor do cache.
     */
    async get(key) {
        try {
            const data = await redis_1.redis.get(key);
            if (!data)
                return null;
            return JSON.parse(data);
        }
        catch (error) {
            log.error(`Erro ao ler cache [${key}]:`, error);
            return null;
        }
    },
    /**
     * Define um valor no cache com TTL opcional.
     */
    async set(key, value, ttlSeconds = DEFAULT_TTL) {
        try {
            const data = JSON.stringify(value);
            await redis_1.redis.set(key, data, 'EX', ttlSeconds);
        }
        catch (error) {
            log.error(`Erro ao escrever cache [${key}]:`, error);
        }
    },
    /**
     * Remove um item do cache.
     */
    async del(key) {
        try {
            await redis_1.redis.del(key);
        }
        catch (error) {
            log.error(`Erro ao deletar cache [${key}]:`, error);
        }
    },
    /**
     * Remove múltiplos itens que casam com um padrão (ex: "dashboard:*").
     */
    async invalidatePattern(pattern) {
        try {
            const keys = await redis_1.redis.keys(pattern);
            if (keys.length > 0) {
                await redis_1.redis.del(...keys);
            }
        }
        catch (error) {
            log.error(`Erro ao invalidar padrão [${pattern}]:`, error);
        }
    },
};
//# sourceMappingURL=cache.js.map