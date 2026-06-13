-- Fase EXPAND do Panic SOS. Apenas colunas nullable + índices.
-- Sem NOT NULL / DROP / RENAME / enum (compatível com squawk/migrations-lint).
-- Status do alerta é derivado em runtime (resolvedAt > acknowledgedAt >
-- escalatedAt > ACTIVE); nenhuma coluna de status persistida.
-- Tipos físicos seguem as colunas existentes em panic_alerts:
-- String->TEXT, DateTime->TIMESTAMP(3), Float->DOUBLE PRECISION.

ALTER TABLE "panic_alerts" ADD COLUMN IF NOT EXISTS "acknowledgedBy" TEXT;
ALTER TABLE "panic_alerts" ADD COLUMN IF NOT EXISTS "acknowledgedAt" TIMESTAMP(3);
ALTER TABLE "panic_alerts" ADD COLUMN IF NOT EXISTS "escalatedAt"    TIMESTAMP(3);
ALTER TABLE "panic_alerts" ADD COLUMN IF NOT EXISTS "unitId"         TEXT;
ALTER TABLE "panic_alerts" ADD COLUMN IF NOT EXISTS "latitude"       DOUBLE PRECISION;
ALTER TABLE "panic_alerts" ADD COLUMN IF NOT EXISTS "longitude"      DOUBLE PRECISION;

CREATE INDEX IF NOT EXISTS "panic_alerts_condominium_created_at_idx"
    ON "panic_alerts" ("condominiumId", "createdAt");
CREATE INDEX IF NOT EXISTS "panic_alerts_condominium_triggered_resolved_idx"
    ON "panic_alerts" ("condominiumId", "triggeredBy", "resolvedAt");
CREATE INDEX IF NOT EXISTS "panic_alerts_condominium_resolved_created_idx"
    ON "panic_alerts" ("condominiumId", "resolvedAt", "createdAt");
