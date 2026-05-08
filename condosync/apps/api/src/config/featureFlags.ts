/**
 * Feature flags Redis-backed com fallback para env vars.
 *
 * Use cases:
 *  - dark launch: novo código rodando, mas só dispara para %
 *    de tráfego ou condomínios específicos.
 *  - kill switch: desligar feature problemática sem deploy.
 *  - canary deploy: % de tráfego → nova rota / lógica.
 *  - per-tenant gating: liberar feature para condomínios
 *    específicos antes do rollout geral.
 *
 * Hierarquia de resolução (primeiro vencedor ganha):
 *  1. Redis hash `feature_flags` campo `<flag>` — runtime
 *     toggle, sem deploy.
 *  2. env FEATURE_<FLAG> — deploy-time override.
 *  3. Default declarado no código.
 *
 * Cache local (LRU 60s) reduz N round-trips Redis em hot path.
 *
 * Targeting por condominiumId/userId via flag suffix:
 *  feature_flags hash:
 *    new_billing_flow                 = "true"
 *    new_billing_flow:condo:abc-123   = "true"
 *    new_billing_flow:percent          = "10"  (canary)
 *
 * Uso:
 *   if (await isFlagEnabled("new_billing_flow", { condominiumId })) {
 *     // novo fluxo
 *   } else {
 *     // fluxo antigo
 *   }
 */
import { redis } from "./redis";
import { logger } from "./logger";

const log = logger.child({ module: "feature-flags" });
const HASH_KEY = "feature_flags";
const CACHE_TTL_MS = 60_000;

interface CacheEntry {
  value: string | null;
  expiresAt: number;
}
const cache = new Map<string, CacheEntry>();

async function getRaw(field: string): Promise<string | null> {
  const cached = cache.get(field);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }
  try {
    const value = await redis.hget(HASH_KEY, field);
    cache.set(field, { value, expiresAt: Date.now() + CACHE_TTL_MS });
    return value;
  } catch (err) {
    log.warn({ err, field }, "Falha lendo feature flag — fallback env/default");
    return null;
  }
}

interface FlagContext {
  condominiumId?: string;
  userId?: string;
}

/**
 * Determina se uma flag está habilitada no contexto dado.
 *
 * Resolve em ordem:
 *  1. Override por condomínio: `<flag>:condo:<id>` em Redis.
 *  2. Override por usuário: `<flag>:user:<id>` em Redis.
 *  3. Canary percentage: `<flag>:percent` em Redis (0-100). Hash
 *     determinístico do (condominiumId ?? userId ?? "anon")
 *     decide se cai no bucket.
 *  4. Flag global: `<flag>` em Redis ("true"/"false").
 *  5. env FEATURE_<FLAG_UPPER> ("true"/"false").
 *  6. defaultValue (default false).
 */
export async function isFlagEnabled(
  flag: string,
  ctx: FlagContext = {},
  defaultValue = false,
): Promise<boolean> {
  // 1. condomínio
  if (ctx.condominiumId) {
    const v = await getRaw(`${flag}:condo:${ctx.condominiumId}`);
    if (v === "true") return true;
    if (v === "false") return false;
  }
  // 2. usuário
  if (ctx.userId) {
    const v = await getRaw(`${flag}:user:${ctx.userId}`);
    if (v === "true") return true;
    if (v === "false") return false;
  }
  // 3. canary %
  const pct = await getRaw(`${flag}:percent`);
  if (pct !== null) {
    const n = Number(pct);
    if (Number.isFinite(n) && n > 0 && n <= 100) {
      const seed = ctx.condominiumId ?? ctx.userId ?? "anon";
      // Hash determinístico simples (FNV-1a 32-bit) — estável por seed.
      let hash = 2166136261;
      for (let i = 0; i < seed.length; i++) {
        hash ^= seed.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
      }
      const bucket = Math.abs(hash) % 100;
      if (bucket < n) return true;
      // bucket fora do percentual → cai para regra global.
    }
  }
  // 4. global
  const global = await getRaw(flag);
  if (global === "true") return true;
  if (global === "false") return false;
  // 5. env
  const envKey = `FEATURE_${flag.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
  const envValue = process.env[envKey];
  if (envValue === "true") return true;
  if (envValue === "false") return false;
  // 6. default
  return defaultValue;
}

/**
 * Bypassa cache local e force re-read. Útil em rotas de admin
 * que mudam flag e precisam validar imediatamente.
 */
export function clearFlagCache(field?: string) {
  if (field) cache.delete(field);
  else cache.clear();
}

/**
 * Setters runtime (usar em CLI admin OU em rota protegida).
 */
export async function setFlag(flag: string, value: boolean): Promise<void> {
  await redis.hset(HASH_KEY, flag, value ? "true" : "false");
  clearFlagCache(flag);
}

export async function setFlagPercent(flag: string, percent: number): Promise<void> {
  if (percent < 0 || percent > 100) throw new Error("percent must be 0-100");
  await redis.hset(HASH_KEY, `${flag}:percent`, String(percent));
  clearFlagCache(`${flag}:percent`);
}

export async function setFlagForCondominium(
  flag: string,
  condominiumId: string,
  value: boolean,
): Promise<void> {
  await redis.hset(
    HASH_KEY,
    `${flag}:condo:${condominiumId}`,
    value ? "true" : "false",
  );
  clearFlagCache(`${flag}:condo:${condominiumId}`);
}

export async function listAllFlags(): Promise<Record<string, string>> {
  return redis.hgetall(HASH_KEY);
}
