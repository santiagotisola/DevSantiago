-- Outbox pattern para webhook_events.
--
-- Adiciona colunas para processamento assíncrono separado da
-- gravação. Webhook handler grava (rápido, atômico, idempotente);
-- BullMQ worker `webhookProcessor` processa charge.update +
-- financial_transaction.create transacionalmente, com retry
-- automático em falha. Row fica como "pendente" até processamento
-- bem-sucedido — sem perda de pagamento por falha do DB durante
-- o $transaction original.

ALTER TABLE "webhook_events"
    ADD COLUMN "processedAt" TIMESTAMP(3),
    ADD COLUMN "processingError" TEXT,
    ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;

-- Índice composto para o pickup do worker:
--   SELECT * FROM webhook_events WHERE provider='asaas' AND processedAt IS NULL
CREATE INDEX "webhook_events_provider_processedAt_idx"
    ON "webhook_events"("provider", "processedAt");
