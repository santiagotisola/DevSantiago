# Runbook — Sprints 1-2-3 (consolidado)

> Promoção em produção das mudanças estruturais: testcontainers no
> CI, hardening de schedulers, FK conversion C4 fase EXPAND, e
> observabilidade Prometheus. **Cada sprint pode ser promovida
> independentemente** mas é recomendável seguir a ordem para
> aproveitar a base de testes antes das mudanças mais arriscadas.

## Sprint 1 — Hardening Crítico

### Pré-requisitos
- Sprint 0 já promovida (leader lock, IDOR sweep, gatewayKey EXPAND).
- Backup recente do DB.

### Mudanças

| Item | Arquivo principal | Tipo |
|---|---|---|
| H7 | schedulers/ + workers/schedulerHelpers.ts | Code-only |
| H11 | docs/MIGRATIONS.md, .github/workflows/ci.yml | Code-only |
| H5 | collection.worker.ts | Code-only |
| H6 | finance.service.ts (raw SQL) | Code-only |
| H3 | schema.prisma + migration drop balance | **Migration** |
| A7 | communication.routes.ts (notifications) | Code-only |
| C5 | vitest.it.config.ts + test/it/* | Code-only |

### Ordem de execução

1. **Deploy Sprint 1 código** (pode ser deploy comum).
2. **Migration H3 (drop balance):**
   ```bash
   cd apps/api && npx prisma migrate deploy
   # aplica 20260508170000_drop_financial_account_balance
   ```
   Rollback: revert do commit + manual `ALTER TABLE financial_accounts
   ADD COLUMN balance Decimal(12,2) NOT NULL DEFAULT 0`.

### Validação

- `npm run test:it` passa (precisa Docker engine).
- `getMonthlyBalance` p95 < 200ms em condomínio com 5k charges.
- `GET /api/v1/communication/notifications?cursor=<id>&limit=20`
  retorna `{ notifications, unreadCount, nextCursor }`.
- Schedulers em Railway: logs mostram apenas 1 réplica como líder
  com renovação a cada 60s. Após mudar `repeat.pattern` em algum
  scheduler em commit futuro, testar que o antigo é removido
  automaticamente (sem dois crons por dia).

### Sem janela de manutenção
H3 é destrutivo mas zero código lê a coluna após o deploy. Migration
roda em ~ms.

---

## Sprint 2 — FK Conversion C4 fase EXPAND

### Pré-requisitos
- Sprint 1 promovida e estável por ≥3 dias.
- Backup recente do DB.
- `npm run test:it` verde no CI.

### Mudanças

| Item | Arquivo principal |
|---|---|
| C4 EXPAND | schema.prisma + migration FK NOT VALID |
| Cleanup script | prisma/cleanup-condominium-orphans.ts |

### Ordem de execução

1. **Deploy do código** (schema Prisma com `condominium @relation`
   adicionado em 12 modelos).
2. **Migration EXPAND:**
   ```bash
   cd apps/api && npx prisma migrate deploy
   # aplica 20260508180000_fk_condominium_expand
   ```
   FKs criadas com NOT VALID — sem table lock significativo. Pode
   rodar a qualquer hora.
3. **Relatório de órfãs (sem deletar):**
   ```bash
   npm run cleanup:orphans -- --report > /tmp/orphans.csv
   wc -l /tmp/orphans.csv  # confere total
   head /tmp/orphans.csv    # amostra
   ```
4. **Decisão de produto:** revisar `orphans.csv`. Cada row representa
   dados que não têm Condominium correspondente. Opções:
   - Deletar (rows realmente lixo histórico) → `--apply-delete`.
   - Restaurar Condominium (se foi deletado por engano) →
     manual no DB.
   - Reatribuir condominiumId (se identificável) → manual.
5. **Após órfãs zeradas, VALIDATE:**
   ```bash
   npm run cleanup:orphans -- --validate
   # ou manual: ALTER TABLE ... VALIDATE CONSTRAINT ...
   ```
6. **Aguardar 7 dias em prod.** Monitorar:
   - Sentry: zero `PrismaClientKnownRequestError P2003` (FK violation).
   - Métricas DB: zero increase em error rate.

### Rollback

**Antes do VALIDATE:** trivial — drop dos FKs.
```sql
ALTER TABLE chat_conversations DROP CONSTRAINT chat_conversations_condominiumId_fkey;
-- repetir para os 11 outros
```
Schema Prisma volta com revert do commit.

**Depois do VALIDATE:** ainda safe — drop CONSTRAINT é cheap. Mas
implica que dados gravados durante a janela podem violar a FK ao
re-VALIDATE no futuro.

### Janela de manutenção

EXPAND não precisa. VALIDATE em tabela com 100k+ rows pode levar
1-3min com lock leve — preferível em horário de baixa atividade.

---

## Sprint 3 — Observabilidade Prometheus

### Pré-requisitos
- Sprints 1-2 promovidas.
- Acesso à infra Prometheus/Grafana ou plano de configurar
  (Railway Metrics, Grafana Cloud, Honeycomb).

### Mudanças

| Item | Arquivo |
|---|---|
| A5 | src/config/metrics.ts + endpoint /metrics + plug em webhook + leader + idor_guard + bullmq_jobs |

### Ordem de execução

1. **Definir env vars (opcional mas recomendado):**
   ```
   METRICS_TOKEN=<openssl rand -hex 16>
   ```
   Sem isso, `/metrics` é aberto — proteger via whitelist no proxy
   ou via firewall do Railway.

2. **Deploy.**

3. **Configurar scraper:**
   - **Railway**: usar Railway Metrics (já tem alguns) ou expor via
     Prometheus Pushgateway externo.
   - **Grafana Cloud**: novo Prometheus data source + scrape job
     apontando para `https://api.prod/metrics` com header
     `X-Metrics-Token`.
   - **k8s**: ServiceMonitor com `path: /metrics` + secret token.

4. **Importar dashboards Grafana base** (a criar — sugestão na
   issue de tracking):
   - API Overview: RPS, p50/p95/p99 por rota, taxa de 5xx.
   - BullMQ: jobs/min por queue, failed rate, leader renewals.
   - Segurança: idor_guard_decisions_total — alertar deny spike.
   - Negócio: webhook_asaas_events_total por result.

### Alertas críticos (configurar no Prometheus)

```yaml
groups:
  - name: condosync-critical
    rules:
      - alert: APIHigh5xx
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.01
        for: 5m
        annotations:
          summary: "5xx > 1% por 5min"

      - alert: LeaderLockLost
        expr: increase(bullmq_leader_renewal_total{result="lost"}[1m]) > 0
        for: 1m
        annotations:
          summary: "Leader lock perdida — possível bug ou rede instável"

      - alert: WebhookAsaasErrors
        expr: rate(webhook_asaas_events_total{result="error"}[5m]) > 0.083
        annotations:
          summary: "Webhook Asaas erro > 5/min"

      - alert: IDORDenySpike
        expr: rate(idor_guard_decisions_total{result=~"deny.*"}[5m]) > 0.166
        annotations:
          summary: "IDOR deny > 10/min — possível ataque"
```

### Validação

- `curl -H 'X-Metrics-Token: <token>' https://api.prod/metrics |
  grep http_request_duration` retorna histograma.
- Provocar uma falha de webhook (token errado): métrica
  `webhook_asaas_events_total` não muda (401 antes do counter) —
  esperado.
- Provocar uma deny IDOR (acesso cross-tenant): métrica
  `idor_guard_decisions_total{result="deny_cross_tenant"}` incrementa.

### Rollback

Trivial: revert do commit. `prom-client` é uma dependência leve
sem migrations associadas. Endpoint /metrics some, scraper retorna
404 — sem impacto funcional.

---

## Validação consolidada pós-Sprints 1-3

```bash
# 1. Suite IT
npm run test:it
# Esperado: verde, com cenários cross-tenant + webhook idempotente.

# 2. Métricas
curl -H 'X-Metrics-Token: ${METRICS_TOKEN}' https://api.prod/metrics \
  | grep -E "http_request_duration|bullmq_leader|idor_guard"

# 3. Validação FK
psql -c "
  SELECT conname, convalidated
  FROM pg_constraint
  WHERE conname LIKE '%_condominiumId_fkey'
  ORDER BY conname;
"
# Esperado: 12+ rows, todas com convalidated=true após --validate.

# 4. Schedulers únicos
# Em ambiente multi-réplica:
redis-cli GET leader:schedulers
redis-cli TTL leader:schedulers
# Esperado: TTL entre 1-240s sempre (renovação a cada 60s).
```

---

## Sprint 4+ (deixado para sessões dedicadas)

- **Splittar god-pages**: ParcelsPage (1253), UnitsPage (1086),
  VisitorsPage (897). Refactor que beneficia de revisão visual
  por sprint dedicado.
- **Padronizar 1º god-route** (`condominiums/`) no template
  `routes/controller/service/repository`.
- **TS estrito ondas 1-2**: `noUncheckedIndexedAccess`, etc.
- **axe-core/playwright** em e2e/.
- **C4 fase CONTRACT** — após 7 dias de SET NOT NULL OK em prod.
- **C3 CONTRACT** — DROP gatewayKey/gatewayConfig plaintext após
  validação que todas as rows têm Enc preenchida.
- **OpenTelemetry tracing** — quando o stack de observabilidade
  estiver maduro.
