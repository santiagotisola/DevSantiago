# ADR-0002: Webhook Asaas via Outbox Pattern

- **Status:** Accepted
- **Date:** 2026-05-08
- **Authors:** @lucas-axion

## Contexto

Webhook do Asaas notifica pagamentos confirmados. Implementação
inicial fazia, no handler HTTP:

1. `webhookEvent.create` (gravar evento)
2. `charge.findFirst`
3. `$transaction([charge.update, financialTransaction.create])`

Problema: se passo 3 falhasse por timeout do pool, deadlock
transitório, ou OOM, errorHandler retornava 500. Asaas retentava;
na retry, `webhookEvent.create` dava P2002 (unique violation) →
handler retornava 200 idempotente sem reprocessar. Cobrança
permanecia OVERDUE mesmo com pagamento confirmado pelo gateway.
**Asaas não reenvia após 200** → receita perdida em silêncio.

## Decisão

Implementar **Outbox pattern**: separar gravação (síncrona) do
processamento (assíncrono).

1. Handler `POST /webhooks/asaas` apenas:
   a. Autentica (token + timingSafeEqual).
   b. Valida payload (zod estrito).
   c. `webhookEvent.create` com UNIQUE (provider, externalId).
   d. `enqueueWebhookProcessing(eventId)` em BullMQ.
   e. Responde 200 imediatamente (~50ms).

2. `webhookProcessor` (worker BullMQ):
   a. Lê WebhookEvent pelo id.
   b. Skip se `processedAt != null` (idempotência).
   c. `$transaction([charge.update, fin_tx.create,
      webhookEvent.update(processedAt)])` — atômico.
   d. Em erro: lança → retry exponencial (5 attempts × 30s, 1m,
      2m...). Row permanece pendente; alerta operacional via
      query SQL.

## Alternativas consideradas

### A. $transaction inline no handler (status quo bugado)

Já documentado o problema acima.

### B. Saga pattern

Múltiplas etapas com compensação em falha (cancelar charge se
fin_tx falhar).

**Contras:** Complexidade desnecessária — webhook → charge →
transaction é fluxo curto e atômico. Saga faz sentido em fluxos
multi-serviço (microserviços).

### C. Outbox pattern (escolhida)

Padrão clássico para idempotência + reprocessamento de eventos.

## Consequências

- **Positivas:**
  - Response < 50ms (Asaas timeout não dispara retries falsos).
  - Falha em DB não perde pagamento — row pendente é reprocessada.
  - Visibilidade operacional: backlog via SQL query simples.
  - Testável: unit (route) + IT (worker).
- **Negativas:**
  - 1 query extra (insert + select no worker).
  - Asaas vê 200 antes do processamento real terminar — clientes
    que dependem de "marcar pago instantaneamente" devem usar
    polling ou webhook próprio.
- **Riscos:** Worker fica defasado em pico → backlog cresce.
  Mitigação: alerta em `bullmq_queue_depth{queue="webhook-processor"}
  > 100 por 5min`.

## Implementação

- `apps/api/src/modules/webhooks/asaas.routes.ts` — handler.
- `apps/api/src/modules/webhooks/webhook.processor.ts` — worker.
- `apps/api/prisma/migrations/20260508190000_webhook_outbox/` —
  schema (processedAt, processingError, attempts).
- `scripts/redrive-webhooks.ts` — re-enfileira pendentes.
- Métrica `webhook_asaas_events_total{result=processed|duplicate|error}`.

## Referências

- Microservices.io — [Transactional Outbox](https://microservices.io/patterns/data/transactional-outbox.html)
- Stripe — [Idempotent webhooks best practices](https://stripe.com/docs/webhooks#best-practices)
