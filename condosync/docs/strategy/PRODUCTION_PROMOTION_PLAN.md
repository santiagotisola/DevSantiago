# Plano de Promoção em Produção — CondoSync Enterprise

> Plano operacional completo para promover ~80 commits de hardening
> e evolução para produção, com **dados reais**, **multi-tenant**,
> **risco financeiro real** e **zero-downtime obrigatório**.
>
> **Status:** Plano. Execução iniciada apenas após aprovação do
> CTO + GO/NO-GO desta página verde.

## Sumário executivo

### O que será promovido

| Categoria | Itens | Risco |
|---|---|---|
| **Críticos resolvidos** | Webhook outbox, Redis adapter Socket.IO, bullConnection isolation, leader lock atômico, fail-closed metrics, seeds env-driven, IDOR sweep | **Médio** — comportamento muda |
| **Encryption** | gatewayKey/Config AES-256-GCM (EXPAND) | **Alto** — dado financeiro |
| **DB schema** | Webhook outbox, fin_tx_charge_income unique, stock CHECK, FK 13 modelos NOT VALID, drop balance, partition audit_logs, EXCLUDE GIST reservations, gateway encrypt | **Alto** — irrevogável após CONTRACT |
| **Workers** | Filas separadas (inapp/email/webhook/balancete), concurrency tunável, métricas hidratadas | **Médio** — comportamento de fila muda |
| **Observability** | OpenTelemetry, request-id, structured logs, SLOs, /metrics fail-closed | **Baixo** — additive |
| **Bounded contexts** | Finance accounts + transactions + charges (parcial) | **Baixo** — facade preserva API |
| **DX/Governance** | ESLint arch rules, plop, CI bloqueante, ADRs | **Nenhum** — operacional |

### Premissas de segurança

- Backup PG completo ≤24h antes de cada janela.
- Janela primária: domingo 22:00-04:00 BRT (baixa atividade).
- Janela secundária: terça 02:00-04:00 BRT.
- Rollback testado em staging em **cada** fase.
- Comunicação Slack #incidents + #status-page durante toda janela.

### Riscos críticos identificados

1. **Webhook Asaas em transição**: outbox novo lê WebhookEvent
   já gravadas pelo schema antigo. Compat verificada em staging.
2. **Encryption EXPAND**: `APP_ENCRYPTION_KEY` perdida = perda
   total de gatewayKey cifradas. Backup duplo obrigatório.
3. **FK NOT VALID → VALIDATE**: órfãos podem existir. Cleanup
   obrigatório antes de VALIDATE.
4. **Socket.IO adapter**: clientes conectados na hora do deploy
   fazem reconnect. Aceitável se janela for fora de pico.
5. **bullConnection isolation**: workers existentes pegam jobs
   da fila antiga + nova durante transição.

---

## Fase 0 — Pré-flight (T-7 dias)

### Pré-requisitos absolutos

```
[ ] Backup PG full < 24h, validado via restore em staging.
[ ] APP_ENCRYPTION_KEY gerada e armazenada em 2 vaults distintos:
    - 1Password vault da empresa (admin acesso).
    - GPG-encrypted file em S3 com object-lock GLACIER_IR.
[ ] METRICS_TOKEN gerado e configurado em Prometheus + Railway.
[ ] OTEL_EXPORTER_OTLP_ENDPOINT + token configurados em Honeycomb/Tempo.
[ ] SEED_SUPER_ADMIN_PASSWORD setada no Railway (mesma senha já em produção).
[ ] Branch protection ATIVA no GitHub (BRANCH_PROTECTION.md).
[ ] CI verde nas últimas 5 mudanças para main.
[ ] Test:it suite verde com testcontainers.
[ ] CHAOS-1 (Redis down) já executado em staging com sucesso.
[ ] Drill backup já executado em staging com sucesso.
[ ] Runbook de cada fase impresso (papel).
[ ] On-call primário e secundário confirmados.
[ ] Comunicação clientes preparada (status page + email se SEV2+).
```

### Smoke test em staging

```bash
# 1. Stack completo está saudável
curl https://staging.condosync.example/health
# Esperado: 200 com NODE_ENV=production-staging

# 2. Webhook idempotente
for i in {1..5}; do
  curl -X POST https://staging.condosync.example/api/v1/webhooks/asaas \
    -H "asaas-access-token: $STAGING_ASAAS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"id":"smoke-1","event":"PAYMENT_RECEIVED","payment":{"id":"smoke-pay","value":100}}'
done
# Esperado: 5x 200, 1 webhook_event no DB, 0 ou 1 financial_transaction

# 3. Multi-tenant isolation
psql staging -c "SELECT COUNT(*) FROM webhook_events WHERE provider='asaas' AND processedAt IS NOT NULL"
# Esperado: > 0 após processar

# 4. Métricas
curl -H "X-Metrics-Token: $METRICS_TOKEN" https://staging.condosync.example/metrics | grep -E "bullmq_queue_depth|webhook_asaas|http_request_duration"
# Esperado: todas séries presentes com valores reais

# 5. Tracing
# Honeycomb/Tempo dashboard: trace de POST /webhooks/asaas tem spans
# Express → Prisma webhook_event.create → BullMQ enqueue
```

**Critério GO:** todos passam. **NO-GO:** qualquer falha → fix em staging primeiro.

---

## Fase 1 — Foundation (Janela 1, ~3h)

**Tema:** rotação de segredos + observability ativa + branch protection.

### Itens promovidos
- Rotacionar `JWT_SECRET` + `JWT_REFRESH_SECRET` (gera invalidação de sessões — comunicar antes).
- `APP_ENCRYPTION_KEY` setada (sem rotação — primeira vez).
- `METRICS_TOKEN` em Prometheus + endpoint fail-closed.
- `OTEL_EXPORTER_OTLP_ENDPOINT` ativo.
- Sentry `beforeSend` redact (já em código; só validar coleta).
- Branch protection ATIVA no GitHub.

### Sequência

```bash
# T+0:00 — Comunicar início no Slack #incidents.

# T+0:05 — Definir env vars no Railway (não restartar ainda).
railway variables set APP_ENCRYPTION_KEY="$(cat /vault/app-key.b64)" --service api
railway variables set APP_ENCRYPTION_KEY="$(cat /vault/app-key.b64)" --service worker
railway variables set METRICS_TOKEN="$(openssl rand -hex 16)"
railway variables set OTEL_EXPORTER_OTLP_ENDPOINT="https://api.honeycomb.io"
railway variables set OTEL_EXPORTER_OTLP_HEADERS="x-honeycomb-team=$HONEYCOMB_KEY"
railway variables set OTEL_SERVICE_NAME="condosync-api"
railway variables set OTEL_TRACES_SAMPLER_ARG="0.1"

# T+0:15 — Comunicar usuários "manutenção em andamento; pode haver
#         relogin necessário".

# T+0:20 — Rotacionar JWT secrets (invalida tokens ativos).
NEW_JWT=$(openssl rand -base64 48)
NEW_REFRESH=$(openssl rand -base64 48)
railway variables set JWT_SECRET="$NEW_JWT"
railway variables set JWT_REFRESH_SECRET="$NEW_REFRESH"

# T+0:25 — Deploy do código atual (pega novas envs).
railway redeploy api
railway redeploy worker

# T+0:35 — Smoke tests.
./scripts/smoke-prod.sh
# - /health 200
# - /metrics retorna 401 sem token, 200 com token
# - Honeycomb recebe primeiro trace
# - Login funciona com JWT novo
# - Sentry recebe evento de teste

# T+0:50 — Configurar branch protection no GitHub conforme
#         apps/api/docs/BRANCH_PROTECTION.md.

# T+1:00 — Verificar SLO dashboard funciona.
```

### Critério GO
- 5xx rate < 0.1% por 30min sustained.
- Login funciona (rotação JWT bem-sucedida).
- Trace de qualquer rota aparece em Honeycomb.
- /metrics responde 401 sem token, 200 com token.

### Critério NO-GO → Rollback
- 5xx > 1% em qualquer rota.
- Login quebrado.
- Sentry mostra erros novos > baseline+50%.

```bash
# Rollback fase 1: reverter env vars JWT.
railway variables set JWT_SECRET="$OLD_JWT"
railway variables set JWT_REFRESH_SECRET="$OLD_REFRESH"
railway redeploy api
# Tokens antigos voltam a funcionar. Métricas/OTel ficam (additive).
```

---

## Fase 2 — Schema EXPAND (Janela 2, ~2h)

**Tema:** todas as migrations ADDITIVE em uma janela. Sem mudança de comportamento ainda.

### Migrations promovidas

```
20260508120000_add_webhook_events_and_charge_income_unique
20260508130000_stock_quantity_nonneg_check
20260508140000_add_critical_indexes
20260508150000_reservations_exclude_overlap        ← requer btree_gist
20260508160000_gateway_encrypt_expand
20260508170000_drop_financial_account_balance      ← destructive mas safe
20260508180000_fk_condominium_expand
20260508190000_webhook_outbox
20260508200000_partition_audit_logs
```

### Sequência

```bash
# T+0:00 — Backup full do PG ANTES da janela.
./scripts/backup-pg.sh --label "pre-fase-2"

# T+0:30 — Validar backup íntegro.
./scripts/validate-backup.sh --latest

# T+0:45 — Aplicar btree_gist extension (Reservations EXCLUDE).
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS btree_gist;"

# T+0:50 — Aplicar migrations.
cd apps/api
DATABASE_URL=$PROD_DATABASE_URL npx prisma migrate deploy
# Esperado: 9 migrations aplicadas em ~30s.
# IMPORTANTE: drop_balance é instant em PG ≥11; FK NOT VALID
# também é instant.

# T+1:20 — Validar schema.
psql $DATABASE_URL <<EOF
\d financial_accounts          -- gatewayKeyEnc, gatewayConfigEnc presentes; balance ausente
\d webhook_events              -- processedAt, processingError, attempts presentes
\d audit_logs_partitioned      -- particionada
SELECT conname, convalidated FROM pg_constraint WHERE conname LIKE '%_condominiumId_fkey' LIMIT 5;
-- 13+ rows com convalidated=false (esperado — VALIDATE em fase posterior).
SELECT COUNT(*) FROM webhook_events;          -- 0
SELECT COUNT(*) FROM financial_accounts WHERE "gatewayKey" IS NOT NULL;  -- N (legacy)
SELECT COUNT(*) FROM financial_accounts WHERE "gatewayKeyEnc" IS NOT NULL; -- 0
EOF

# T+1:40 — Smoke tests críticos.
./scripts/smoke-prod.sh --finance
# Garantir: listagens financeiras continuam funcionando, leituras
# normais (código atual ainda lê gatewayKey legacy).
```

### Critério GO
- Todas migrations aplicadas sem erro.
- 5xx rate continua < 0.1%.
- Leituras financeiras retornam dados (cache continua válido).
- Webhook continua aceitando POSTs (rota antiga ainda em código).

### Critério NO-GO → Rollback

```bash
# Rollback parcial — drop das colunas EXPAND novas.
psql $DATABASE_URL <<EOF
ALTER TABLE financial_accounts DROP COLUMN gatewayKeyEnc, DROP COLUMN gatewayConfigEnc;
ALTER TABLE webhook_events DROP COLUMN processedAt, DROP COLUMN processingError, DROP COLUMN attempts;
ALTER TABLE stock_items DROP CONSTRAINT IF EXISTS stock_quantity_nonneg;
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_no_overlap;
-- FK NOT VALID drops (13×):
ALTER TABLE chat_conversations DROP CONSTRAINT IF EXISTS chat_conversations_condominiumId_fkey;
-- ... etc
DROP TABLE IF EXISTS audit_logs_partitioned CASCADE;
EOF

# Restaurar coluna balance (perdemos DEFAULT 0 em rows novos):
psql $DATABASE_URL -c "ALTER TABLE financial_accounts ADD COLUMN balance DECIMAL(12,2) DEFAULT 0;"

# Restore from backup se necessário (último recurso):
./scripts/restore-pg.sh --label pre-fase-2
```

---

## Fase 3 — Re-encrypt + Cleanup (Janela 3, ~1h, off-peak)

**Tema:** preencher gatewayKeyEnc e identificar órfãos FK.

```bash
# T+0:00 — Re-encrypt rows existentes.
cd apps/api
npm run encrypt:gateway-keys -- --dry-run
# Confere quantas rows + amostra. Aprovação manual antes de --apply.

npm run encrypt:gateway-keys -- --apply
# Idempotente, batches 50, pause 100ms. Estimativa: <5min para 100 condos.

# T+0:10 — Validar.
psql $DATABASE_URL -c "
  SELECT
    COUNT(*) FILTER (WHERE gatewayKey IS NOT NULL) AS plaintext_remaining,
    COUNT(*) FILTER (WHERE gatewayKeyEnc IS NOT NULL) AS encrypted_count
  FROM financial_accounts;
"
# Esperado: encrypted_count >= antes; plaintext_remaining = 0.

# T+0:20 — Identificar órfãos FK (read-only).
npm run cleanup:orphans -- --report > /tmp/orphans.csv
wc -l /tmp/orphans.csv

# Decisão de produto sobre cada categoria de órfã:
#  - Tickets órfãos antigos > 2 anos → deletar.
#  - Photos sem condomínio → audit + decidir.
#  - StockItem órfão → restaurar condomínio se identificável.

# T+0:40 — Aprovação documental (PR fechado com revisão de produto).

# T+0:50 — Cleanup dos órfãs aprovadas.
npm run cleanup:orphans -- --apply-delete
```

### Critério GO
- 100% das gatewayKey cifradas.
- Órfãs identificadas e tratadas (deletadas ou justificadas).
- Webhook Asaas continua funcionando (decryption fallback OK).

---

## Fase 4 — Code com Shadow Mode (Janela 4, ~3h)

**Tema:** código novo deployed em SHADOW MODE — escreve no novo path mas lê do legacy.

### Estratégia

Code novo (outbox webhook, bullConnection, encryption read) é
deployed mas com feature flags em modo "shadow" para 7 dias antes
de virar source-of-truth.

### Sequência

```bash
# T+0:00 — Definir feature flags em modo SHADOW.
redis-cli HSET feature_flags webhook_outbox_mode shadow
redis-cli HSET feature_flags gateway_encrypt_read_mode dual
redis-cli HSET feature_flags socket_io_redis_adapter true

# T+0:10 — Deploy do código.
git tag -a "production-fase-4-$(date +%Y%m%d)" -m "Fase 4 promotion"
git push origin --tags
# Railway auto-deploya OU comando explícito:
railway redeploy api
railway redeploy worker

# T+0:30 — Validar SHADOW mode.
# Webhook continua processando inline (legacy) MAS também grava
# WebhookEvent (novo schema) em paralelo. Worker NÃO processa
# ainda — apenas observa.
psql $DATABASE_URL -c "SELECT provider, COUNT(*), COUNT(processedAt) AS processed FROM webhook_events GROUP BY provider;"
# Esperado: count crescendo, processedAt = 0 (worker em shadow).

# T+0:50 — Validar bullConnection.
# Workers usando conexões dedicadas. Verificar no Redis:
redis-cli CLIENT LIST | wc -l
# Antes: ~5. Depois: ~15-20 (conexões dedicadas por worker).

# T+1:10 — Validar Socket.IO adapter.
# Conectar 2 clientes em réplicas diferentes (load balancer
# round-robin). Disparar broadcast de uma. Outra recebe.

# T+1:30 — Smoke tests financeiros (CRÍTICO).
./scripts/smoke-prod.sh --financial
# - GET balance retorna número correto (cache + decryption OK).
# - POST charge gera cobrança (configureGateway com encrypt OK).
# - Webhook simulado (sandbox Asaas) processa.

# T+2:00 — 30min de observação ativa.
# Alertas Prometheus, Sentry, Honeycomb.
```

### Critério GO (saída da janela)
- Webhook outbox grava em paralelo SEM falhar.
- Workers em conexões dedicadas (Redis CLIENT LIST mostra >15).
- Socket.IO multi-réplica funciona.
- 5xx rate < 0.1%.
- p95 latency dentro de baseline +20%.

### Critério NO-GO → Rollback

```bash
# Toggle feature flags off — código novo desabilitado.
redis-cli HSET feature_flags socket_io_redis_adapter false
# Webhook outbox: rollback do código (não tem flag).
git revert <last-tag>
railway redeploy api
```

---

## Fase 5 — Shadow → Active (T+7 dias após Fase 4)

**Tema:** ativar webhook outbox como source-of-truth + dual-read encryption.

### Pré-requisito

7 dias contínuos com:
- Webhook outbox shadow gravando 100% dos eventos.
- Zero discrepância entre legacy + outbox.
- Sentry sem erros novos.
- bullmq_queue_depth{queue=webhook-processor} sustentado em 0
  (não deve haver backlog em shadow — worker não processa).

### Sequência

```bash
# T+0:00 — Verificação de paridade.
psql $DATABASE_URL <<EOF
WITH legacy AS (
  SELECT COUNT(*) AS total
  FROM financial_transactions
  WHERE createdBy = 'SYSTEM_WEBHOOK'
    AND createdAt > NOW() - INTERVAL '7 days'
),
outbox AS (
  SELECT COUNT(DISTINCT externalId) AS total
  FROM webhook_events
  WHERE provider = 'asaas'
    AND eventType IN ('PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED')
    AND receivedAt > NOW() - INTERVAL '7 days'
)
SELECT legacy.total AS legacy_count, outbox.total AS outbox_count,
       CASE WHEN legacy.total = outbox.total THEN 'OK' ELSE 'DIVERGENT' END AS status
FROM legacy, outbox;
EOF
# Esperado: status = OK. Se DIVERGENT, NÃO PROSSEGUIR.

# T+0:10 — Ativar processamento outbox.
redis-cli HSET feature_flags webhook_outbox_mode active

# T+0:15 — Migrate código para usar outbox como primário.
# (Já está deployed; flag ativa o caminho correto.)

# T+0:30 — Drenar legacy queue (compatibilidade).
# Webhooks que chegaram na fila legacy (notifications) continuam
# processando até zerar.

# T+1:00 — Confirmar processamento outbox ativo.
psql $DATABASE_URL -c "
  SELECT COUNT(*) AS pending
  FROM webhook_events
  WHERE provider='asaas' AND processedAt IS NULL
    AND receivedAt < NOW() - INTERVAL '5 minutes';
"
# Esperado: 0. Se > 0, redrive: npm run redrive:webhooks --apply.
```

### Validação financeira CRÍTICA

```sql
-- Reconciliação: para cada charge PAID nas últimas 24h, deve
-- existir EXATAMENTE 1 financial_transaction de INCOME.
WITH paid_charges AS (
  SELECT id, paidAmount FROM charges
  WHERE status='PAID' AND paidAt > NOW() - INTERVAL '24 hours'
),
incomes AS (
  SELECT chargeId, COUNT(*) AS cnt, SUM(amount) AS total
  FROM financial_transactions
  WHERE type='INCOME' AND chargeId IS NOT NULL
    AND paidAt > NOW() - INTERVAL '24 hours'
  GROUP BY chargeId
)
SELECT
  pc.id,
  pc.paidAmount,
  COALESCE(i.cnt, 0) AS income_records,
  COALESCE(i.total, 0) AS income_total,
  CASE
    WHEN i.cnt IS NULL THEN 'MISSING'
    WHEN i.cnt > 1 THEN 'DUPLICATE'
    WHEN i.total != pc.paidAmount THEN 'AMOUNT_MISMATCH'
    ELSE 'OK'
  END AS status
FROM paid_charges pc
LEFT JOIN incomes i ON i.chargeId = pc.id
WHERE COALESCE(i.cnt, 0) != 1
   OR COALESCE(i.total, 0) != pc.paidAmount;
-- ESPERADO: 0 rows. Qualquer linha aqui é ALARME — escalonar.
```

### Critério GO
- Reconciliação 0 discrepâncias.
- webhook_events.processedAt populado < 60s após receivedAt p95.
- Sentry sem novos erros do webhook.processor.

---

## Fase 6 — VALIDATE FK + Bounded Contexts (Janela 6, ~2h)

```bash
# T+0:00 — Cleanup órfãs (se ainda houver após Fase 3).
npm run cleanup:orphans -- --report  # confirmar 0
# Se não-zero: --apply-delete OU adiar.

# T+0:10 — VALIDATE CONSTRAINT (cheap após cleanup).
npm run cleanup:orphans -- --validate
# Roda 13 ALTER TABLE VALIDATE CONSTRAINT em sequência.
# Cada um: scan da tabela, lock leve, sem rewrite.
# Total: 5-15min em DB com 1-10M rows total.

# T+0:30 — Validar.
psql $DATABASE_URL -c "
  SELECT conname, convalidated
  FROM pg_constraint
  WHERE conname LIKE '%_condominiumId_fkey'
  ORDER BY conname;
"
# Esperado: 13 rows, todas convalidated=true.
```

---

## Fase 7 — CONTRACT (Janela 7, T+30 dias após Fase 5)

**Tema:** drop colunas plaintext + SET NOT NULL FKs.

### Pré-requisitos

- 30 dias com gatewayKeyEnc populado em 100% das contas ativas.
- Zero leituras de fallback nos logs (`gateway_decrypt_total{result="fallback"}` = 0).
- Zero código tocando colunas plaintext (grep no codebase).
- 30 dias com FK convalidated=true sem violations.

### Migrations CONTRACT (gerar agora)

```sql
-- 20260608000000_contract_drop_gateway_plaintext
ALTER TABLE financial_accounts DROP COLUMN gatewayKey;
ALTER TABLE financial_accounts DROP COLUMN gatewayConfig;

-- 20260608000100_contract_fk_set_not_null
-- Para cada um dos 13 modelos com condominiumId String:
ALTER TABLE chat_conversations
  ADD CONSTRAINT chat_conversations_condominiumId_check
  CHECK ("condominiumId" IS NOT NULL) NOT VALID;
ALTER TABLE chat_conversations
  VALIDATE CONSTRAINT chat_conversations_condominiumId_check;
ALTER TABLE chat_conversations
  ALTER COLUMN "condominiumId" SET NOT NULL;
ALTER TABLE chat_conversations
  DROP CONSTRAINT chat_conversations_condominiumId_check;
-- (repetir 13×)
```

### Rollback CONTRACT

`ALTER TABLE ... ALTER COLUMN SET NULL` é rápido. Drop column
plaintext é IRRECUPERÁVEL exceto via backup. Por isso só após
30 dias e validação rigorosa.

---

## Métricas obrigatórias durante toda promoção

```yaml
# Painel Grafana dedicado: "promotion-monitoring"
panels:
  - title: HTTP 5xx rate (target < 0.1%)
    expr: rate(http_requests_total{status=~"5.."}[5m])

  - title: HTTP p95 latency (target < 500ms)
    expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

  - title: Webhook Asaas — events/min by result
    expr: sum by (result) (rate(webhook_asaas_events_total[1m]))

  - title: BullMQ queue depth (alert > 100 sustained)
    expr: bullmq_queue_depth{state="waiting"}

  - title: BullMQ jobs failed/min
    expr: rate(bullmq_jobs_total{result="failed"}[5m])

  - title: Leader lock health
    expr: bullmq_leader_renewal_total

  - title: IDOR deny spike (alert > 10/min sustained)
    expr: rate(idor_guard_decisions_total{result="deny_cross_tenant"}[5m])

  - title: Circuit breaker Asaas state
    expr: opossum_breaker_state{name="asaas"}

  - title: Prisma pool waiting
    expr: prisma_pool_connections{state="waiting"}

  - title: Redis connections by source
    expr: redis_connections_total{client_type=~"app|bullmq|adapter"}
```

Cada fase: dashboard aberto, screenshot ANTES e DEPOIS para
postmortem do próprio rollout.

---

## Validação financeira (rodar após cada fase tocar finance)

```sql
-- 1. Sanity: totais batem com baseline?
SELECT
  DATE_TRUNC('day', paidAt) AS dia,
  COUNT(*) AS charges_pagas,
  SUM(paidAmount) AS total_recebido
FROM charges
WHERE status='PAID' AND paidAt > NOW() - INTERVAL '30 days'
GROUP BY 1 ORDER BY 1;
-- Comparar com snapshot antes da janela. Variação > 5% = alarme.

-- 2. Idempotência: 0 transações duplicadas?
SELECT chargeId, COUNT(*)
FROM financial_transactions
WHERE type='INCOME' AND chargeId IS NOT NULL
GROUP BY chargeId
HAVING COUNT(*) > 1;
-- ESPERADO: 0 rows.

-- 3. Charges sem transação:
SELECT id, paidAmount FROM charges
WHERE status='PAID'
  AND id NOT IN (
    SELECT chargeId FROM financial_transactions
    WHERE type='INCOME' AND chargeId IS NOT NULL
  );
-- ESPERADO: 0 rows.

-- 4. Webhook events presos:
SELECT COUNT(*) FROM webhook_events
WHERE processedAt IS NULL
  AND receivedAt < NOW() - INTERVAL '15 minutes';
-- ESPERADO: 0.

-- 5. Cobranças com gateway OK pós-encryption:
SELECT COUNT(*) FROM charges
WHERE status='PENDING'
  AND gatewayId IS NOT NULL
  AND createdAt > NOW() - INTERVAL '24 hours';
-- Esperado: > 0 (cobranças sendo criadas no gateway).
```

---

## Comunicação

### Antes da janela (T-24h)
- Email para todos os SYNDIC + CONDOMINIUM_ADMIN: "manutenção
  programada DD/MM HH:MM-HH:MM, sem indisponibilidade prevista".
- Status page: "scheduled maintenance" com janela.

### Durante
- Slack #incidents: thread única durante toda a janela.
- Status page atualizada a cada fase concluída.

### Após
- Status page: "completed".
- Postmortem se SEV1 ou rollback ocorreu.

---

## Critérios GO/NO-GO consolidados

### GO para próxima fase

- [ ] Métricas dentro de baseline (5xx < 0.1%, p95 < +20%).
- [ ] Zero alertas SEV1/SEV2 abertos.
- [ ] Validação financeira sem discrepâncias.
- [ ] Smoke tests da fase passaram.
- [ ] On-call confirma "go" via thread Slack.

### NO-GO → STOP imediato

- [ ] 5xx > 1% por 5min sustained.
- [ ] Reconciliação financeira com discrepância.
- [ ] Sentry com erros novos > baseline+50%.
- [ ] Cliente reportou problema no Slack/email.
- [ ] On-call expressa dúvida ("não sei o que está acontecendo").

NO-GO → Rollback imediato → postmortem em 24h → adiar próxima
janela em ≥7 dias.

---

## Cronograma sugerido

| Semana | Fase | Janela |
|---|---|---|
| 1 | Pré-flight + smoke staging | Não-bloqueante |
| 2 | Fase 1 (Foundation) | Domingo 22h-1h |
| 3 | Fase 2 (Schema EXPAND) | Terça 02h-04h |
| 4 | Fase 3 (Re-encrypt + cleanup) | Off-peak |
| 5 | Fase 4 (Code shadow mode) | Domingo 22h-01h |
| 6 | Observação shadow | — |
| 7 | Observação shadow | — |
| 8 | Fase 5 (Shadow → Active) | Domingo 22h-23h |
| 9 | Fase 6 (VALIDATE FK) | Terça 02h-04h |
| 10-12 | Observação 30 dias | — |
| 13 | Fase 7 (CONTRACT) | Domingo 22h-23h |

**Total: ~3 meses** do início ao CONTRACT completo. Cada fase
isolada, com janela curta, rollback testado, observação real
entre fases.

---

## Documentos relacionados

- `docs/runbooks/sprint-0-emergencial.md` (segredos + Sprint 0).
- `docs/runbooks/sprint-1-2-3.md` (consolidado anterior).
- `docs/runbooks/sprint-p2-p3-platform.md`.
- `docs/runbooks/sprint-p4-p5-enterprise.md`.
- `docs/runbooks/sprint-p6-p7-final.md`.
- `docs/runbooks/backup-restore-dr.md`.
- `docs/MIGRATIONS.md` (política expand/contract).
- `docs/adr/` (decisões arquiteturais).
- `docs/strategy/ROADMAP_12_24M.md`.
- `docs/strategy/AI_PROMOTION_PROMPT.md` (prompt para conduzir
  via IA).
