-- H3: drop da coluna `balance` em financial_accounts.
--
-- Motivo: coluna era stored com default 0 mas NUNCA atualizada na
-- escrita. getAccountBalance() em finance.service.ts:127 sempre
-- recalculava via aggregate. Mantê-la teria sido armadilha (race
-- entre transactions concorrentes faria balance divergir).
--
-- Drop é safe — nenhum código TS lê a coluna após o commit que
-- remove o campo do schema Prisma. BI externo eventualmente
-- lendo a coluna direto deve migrar para chamar a API (que sempre
-- foi a source-of-truth correta).

ALTER TABLE "financial_accounts" DROP COLUMN "balance";
