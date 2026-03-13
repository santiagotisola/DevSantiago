/**
 * Utilitários simples para cache distribuído via Redis.
 */
export declare const cache: {
    /**
     * Obtém um valor do cache.
     */
    get<T>(key: string): Promise<T | null>;
    /**
     * Define um valor no cache com TTL opcional.
     */
    set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
    /**
     * Remove um item do cache.
     */
    del(key: string): Promise<void>;
    /**
     * Remove múltiplos itens que casam com um padrão (ex: "dashboard:*").
     */
    invalidatePattern(pattern: string): Promise<void>;
};
//# sourceMappingURL=cache.d.ts.map