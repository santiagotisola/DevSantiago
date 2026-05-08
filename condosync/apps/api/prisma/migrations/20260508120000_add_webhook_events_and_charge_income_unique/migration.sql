-- WebhookEvent: idempotência de webhooks externos
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "webhook_events_provider_externalId_key"
    ON "webhook_events"("provider", "externalId");

CREATE INDEX "webhook_events_provider_receivedAt_idx"
    ON "webhook_events"("provider", "receivedAt");

-- Garante que cada Charge só pode ter UMA transação financeira
-- do tipo INCOME — bloqueia dupla contabilização por webhook duplicado.
-- Em produção, aplicar com CONCURRENTLY (este DDL não suporta CONCURRENTLY
-- em Prisma migrate deploy automático; rodar manualmente em prod):
--
--   CREATE UNIQUE INDEX CONCURRENTLY fin_tx_charge_income_unique
--   ON financial_transactions("chargeId") WHERE type = 'INCOME';
CREATE UNIQUE INDEX "fin_tx_charge_income_unique"
    ON "financial_transactions"("chargeId")
    WHERE "type" = 'INCOME';
