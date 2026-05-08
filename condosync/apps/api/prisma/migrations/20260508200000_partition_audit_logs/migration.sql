-- Particionamento de audit_logs por mês (PARTITION BY RANGE).
--
-- Estratégia EXPAND-only: criamos a NOVA tabela particionada
-- audit_logs_p* e migramos progressivamente. A tabela antiga
-- audit_logs continua sendo lida durante a transição.
--
-- Migração de dados existentes acontece em sprint de janela
-- (script: prisma/migrate-audit-logs-partitioned.ts) — esta
-- migration apenas cria a estrutura.
--
-- Estimativa: ~25k rows/dia/condo. 100 condos × 12 meses = 30M
-- rows. Sem partição, queries de filtro por createdAt + VACUUM
-- crescem linearmente; partição mensal mantém cada slice
-- gerenciável (~2.5M rows/mês).
--
-- Após CONTRACT (próxima sprint), aplicação aponta para
-- audit_logs_partitioned via VIEW renomeada.

-- 1. Tabela mãe particionada (sem dados ainda).
CREATE TABLE IF NOT EXISTS "audit_logs_partitioned" (
    "id"            TEXT NOT NULL,
    "userId"        TEXT,
    "condominiumId" TEXT,
    "action"        TEXT NOT NULL,
    "module"        TEXT NOT NULL,
    "entityType"    TEXT,
    "entityId"      TEXT,
    "description"   TEXT NOT NULL,
    "metadata"      JSONB,
    "ipAddress"     TEXT,
    "userAgent"     TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- PRIMARY KEY composto inclui o partition key (Postgres requer).
    PRIMARY KEY ("id", "createdAt")
) PARTITION BY RANGE ("createdAt");

-- 2. Índices em todas as partições (declarados na mãe; herdados).
CREATE INDEX "audit_logs_partitioned_condominiumId_createdAt_idx"
    ON "audit_logs_partitioned" ("condominiumId", "createdAt");
CREATE INDEX "audit_logs_partitioned_entityType_entityId_idx"
    ON "audit_logs_partitioned" ("entityType", "entityId");
CREATE INDEX "audit_logs_partitioned_userId_createdAt_idx"
    ON "audit_logs_partitioned" ("userId", "createdAt");

-- 3. Partições mensais para os próximos 6 meses + default catch-all.
--    pg_partman adicionaria automaticamente; mas como Railway
--    managed PG não tem extensão, criamos explicitamente.
CREATE TABLE IF NOT EXISTS "audit_logs_2026_05" PARTITION OF "audit_logs_partitioned"
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE IF NOT EXISTS "audit_logs_2026_06" PARTITION OF "audit_logs_partitioned"
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE IF NOT EXISTS "audit_logs_2026_07" PARTITION OF "audit_logs_partitioned"
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE IF NOT EXISTS "audit_logs_2026_08" PARTITION OF "audit_logs_partitioned"
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE IF NOT EXISTS "audit_logs_2026_09" PARTITION OF "audit_logs_partitioned"
    FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE IF NOT EXISTS "audit_logs_2026_10" PARTITION OF "audit_logs_partitioned"
    FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');

-- Default catch-all: rows com createdAt fora dos ranges declarados
-- caem aqui. Usar SELECT count(*) FROM audit_logs_default em alerta
-- mensal — se >0, partição faltando.
CREATE TABLE IF NOT EXISTS "audit_logs_default" PARTITION OF "audit_logs_partitioned" DEFAULT;

-- 4. NÃO mexer em audit_logs (legacy) ainda. CONTRACT (próximo
--    sprint) renomeia tabelas e aponta o app.
