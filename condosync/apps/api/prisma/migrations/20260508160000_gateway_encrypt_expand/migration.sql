-- Fase EXPAND da migração de criptografia de gatewayKey/gatewayConfig.
-- Adiciona colunas cifradas; mantém as plaintext durante o período
-- de dual-write/dual-read. Job de re-cifragem (npm run
-- encrypt:gateway-keys) preenche as novas; CONTRACT (sprint
-- seguinte) drop das antigas.

ALTER TABLE "financial_accounts"
    ADD COLUMN "gatewayKeyEnc" TEXT,
    ADD COLUMN "gatewayConfigEnc" TEXT;
