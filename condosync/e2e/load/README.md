# Load tests (k6)

Cenários de carga executados manualmente em staging contra
infraestrutura real.

## Pré-requisitos

```bash
# macOS
brew install k6

# Linux (apt)
sudo apt-get install k6

# Docker (qualquer plataforma)
docker pull grafana/k6
```

## Cenários

### `webhook-asaas.k6.js`

Valida outbox pattern em pico de pagamentos.

```bash
k6 run \
  --env BASE_URL=https://staging.condosync.example \
  --env TOKEN=<asaas-token-staging> \
  e2e/load/webhook-asaas.k6.js
```

**Critérios de aceite (thresholds k6):**
- p95 < 200ms (rota apenas grava + enfileira)
- error rate < 0.1%
- 10% de replays de paymentId aceitos como idempotente (200)

**Esperado:**
```
✓ http_req_duration p(95) < 200ms
✓ errors rate < 0.001
✓ idempotent_200 rate > 0.099 (10% replay → 200)
```

**O que valida:**
- Webhook handler não bloqueia em DB lento (outbox).
- BullMQ aguenta enqueue rate alto.
- UNIQUE (provider, externalId) impede dupla gravação em paralelo.
- bullmq_queue_depth{queue=webhook-processor} sobe e desce
  conforme worker drena.
- Em failure: 0 5xx mesmo com 100 RPS sustained.

## Adicionando novos cenários

Padrão:
- 1 arquivo por endpoint hot path: `<endpoint>.k6.js`.
- Thresholds explícitos em `options.thresholds`.
- Teste contra staging real, nunca production direto.
- Ramp-up 30s → sustain → ramp-down 30s.
- Documentar critérios de aceite no header.

Próximos cenários sugeridos:
- `auth-login.k6.js` — login bcrypt em pico matinal.
- `dashboard.k6.js` — getMonthlyBalance + getAccountBalance cache.
- `socket-broadcast.k6.js` — Socket.IO multi-réplica.
