# Runbook — Sprint P2/P3 (Plataforma & Escalabilidade)

> Promoção da fase "produção estável" → "plataforma escalável e
> sustentável". Mudanças são incrementais, sem big-bang refactor.
> Cada item pode ser promovido independentemente; ordem
> recomendada minimiza fricção.

## Resumo das mudanças

| Item | Tipo | Migration | Risco | Esforço |
|---|---|---|---|---|
| Partição audit_logs (EXPAND only) | DB | Sim | Baixo | 30min |
| OpenTelemetry SDK | Code | Não | Baixo | 1h |
| Split notification workers (inapp/email) | Code | Não | Médio | 2h |
| Cache balance + invalidação | Code | Não | Baixo | 1h |
| Feature flags Redis | Code | Não | Baixo | 30min |
| k6 load test | DevOps | Não | — | DX |

## Ordem de promoção

### 1. Partição audit_logs (EXPAND only)

```bash
cd apps/api
npx prisma migrate deploy
# aplica 20260508200000_partition_audit_logs
```

**Cria** `audit_logs_partitioned` + 6 partições mensais + default.
**Não toca** `audit_logs` legacy. App continua escrevendo na legacy.

**Após promoção, agendar:**
- Cron mensal para `npm run partitions:create -- --months-ahead=3`.
- CONTRACT em sprint dedicada: backfill da legacy → swap via VIEW.

### 2. OpenTelemetry SDK

Definir env no Railway:
```
OTEL_EXPORTER_OTLP_ENDPOINT=<honeycomb|tempo|datadog>
OTEL_EXPORTER_OTLP_HEADERS=x-honeycomb-team=<key>
OTEL_SERVICE_NAME=condosync-api
OTEL_TRACES_SAMPLER_ARG=0.1
```

Se ausente, SDK não inicializa — zero overhead. Liga depois com
deploy normal (env vars são reload-on-start).

**Validação:**
- Faz 1 request para `/api/v1/auth/login`.
- Honeycomb/Tempo: deve aparecer trace com spans:
  http (express middleware) → ioredis (rate-limit) → prisma
  (user.findUnique) → bcrypt (compare).

### 3. Split notification workers

Sem mudança de schema. Deploy normal:
1. Worker antigo `notifications` continua processando jobs
   pendentes existentes durante o deploy.
2. Service novo enfileira em `notifications-inapp` /
   `notifications-email`.
3. Após drenar legacy queue (BullMQ UI mostra count=0),
   próxima sprint remove o worker legacy.

**Tuning recomendado em prod:**
```
INAPP_CONCURRENCY=50
EMAIL_CONCURRENCY=10
EMAIL_LIMITER_MAX=100   # ajustar por plano Resend (free=100/day)
EMAIL_LIMITER_DURATION=86400000  # 24h se for plano free
```

**Validação:**
- POST notification com channels=['inapp','email'].
- BullMQ UI: 1 job em `notifications-inapp` + 1 em `notifications-email`.
- Métricas: `bullmq_queue_depth{queue="notifications-inapp"}` etc.

### 4. Cache balance + invalidação

Sem migration. Deploy normal.

**Validação:**
- GET /api/v1/finance/accounts/<id>/balance — primeira chamada
  popula cache; segunda em <30s deve ter latência ~2-5ms (cache
  hit).
- POST nova transaction → próximo balance reflete imediatamente
  (invalidação write-through).

**Métricas a observar:**
- Latência p95 de listagens financeiras: deve cair drasticamente
  em condos com muitas transactions.
- Redis: `redis-cli MONITOR | grep "cache:v1:account"` mostra
  cache keys sendo populadas.

### 5. Feature flags

Sem migration. Deploy normal.

**Cookbook operacional:**
```bash
# Ligar nova feature globalmente
redis-cli HSET feature_flags new_billing_flow true

# Canary 10% das tentativas
redis-cli HSET feature_flags new_billing_flow:percent 10

# Override por condomínio piloto
redis-cli HSET feature_flags new_billing_flow:condo:abc-123 true

# Kill switch imediato
redis-cli HSET feature_flags new_billing_flow false

# Listar flags ativas
redis-cli HGETALL feature_flags
```

Cache local de 60s — efeito imediato em ~1min.

### 6. k6 load test

Roda manualmente contra staging. Não há automação CI ainda
(carga consome quota Honeycomb/Tempo).

```bash
k6 run --env BASE_URL=https://staging --env TOKEN=<x> \
  e2e/load/webhook-asaas.k6.js
```

## Checklist de promoção

```
[ ] APP_ENCRYPTION_KEY, JWT_SECRET, ASAAS_WEBHOOK_TOKEN, METRICS_TOKEN setados
[ ] OTEL_EXPORTER_OTLP_ENDPOINT (opcional) setado se quiser tracing
[ ] Backup recente do PG (Sprint 0/1 runbook)
[ ] Branch protection ativa em main (BRANCH_PROTECTION.md)
[ ] CI verde em todos os jobs
[ ] prisma migrate deploy bem-sucedido em staging
[ ] Smoke test em staging:
    [ ] Login + dashboard p95 (cache balance ativa)
    [ ] Webhook Asaas com 10 hits idempotentes
    [ ] Notification multi-canal (inapp + email)
    [ ] Feature flag toggle em runtime
[ ] Métricas Prometheus visíveis (queue_depth populado)
[ ] Sentry recebendo erros com request-id correlato
[ ] OpenTelemetry traces aparecem no backend (se ativado)
```

## Limites confirmados de escala

| Carga | Status | Gargalo principal |
|---|---|---|
| 2× tráfego atual | OK sem mudanças | — |
| 5× | OK com `connection_limit=20` | Prisma pool |
| 10× | OK com Redis dedicado + read replica | Redis connections, dashboards |
| 50× (100 condos) | Requer partição audit_logs em CONTRACT, sharding por tenant | DB write contention |

## Estratégia de incidentes — pós-platform

### Métricas a monitorar (alertar)

```yaml
# Plataforma
bullmq_queue_depth{queue="webhook-processor", state="waiting"} > 100  # 5min
bullmq_jobs_total{result="failed"}[5m] > 10  # qualquer queue
bullmq_leader_renewal_total{result="lost"}  # imediato
http_request_duration_seconds{route!~".*health.*", quantile="0.95"} > 1  # 10min

# Cache
# (sem métrica direta, alerta indireto via latência sustained acima do baseline)

# Feature flags
# Cardinality explosion check: COUNT(redis HKEYS feature_flags) > 50

# OpenTelemetry
# Se traceExporter rejeita, processo log warn — alertar em Sentry
```

### Rollback por componente

- **Partição audit_logs**: drop tables. `audit_logs` legacy intacta.
- **OpenTelemetry**: unset OTEL_EXPORTER_OTLP_ENDPOINT, restart.
  SDK não inicializa.
- **Workers split**: kill emailWorker/inappWorker, jobs caem na
  legacy queue (worker legacy continua rodando).
- **Cache**: redis-cli `KEYS "cache:v1:*" | xargs redis-cli DEL`.
  getOrCompute fallback degrada para factory direta.
- **Feature flags**: redis-cli `DEL feature_flags`. Tudo cai em
  default (geralmente false).

## Próximos sprints (não cobertos aqui)

1. **Split finance.service.ts** em 4 services (charges, accounts,
   transactions, ratios). Esforço: 1 sprint.
2. **Repository layer** para finance/maintenance/commonArea.
3. **Splittar god-pages frontend** (ParcelsPage 1253, UnitsPage,
   VisitorsPage) — refactor visual com revisão UI.
4. **CONTRACT phases**:
   - C3: drop plaintext gateway columns após validação 7d.
   - C4: SET NOT NULL nas FKs após VALIDATE estável.
5. **Partição vehicle_access_logs, notifications, webhook_events**
   (mesma estratégia do audit_logs).
6. **Métricas de cache**: cache_hit_ratio, cache_compute_duration.
7. **Métricas de circuit breaker**: opossum em prom-client.
8. **Read replica PG** para dashboards / relatórios.
