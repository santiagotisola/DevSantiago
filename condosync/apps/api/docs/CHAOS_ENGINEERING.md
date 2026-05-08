# Chaos Engineering — manual de cenários

> Validação proativa de resiliência. Executar mensalmente em
> staging. Cada cenário tem hipótese, ação, observação esperada
> e validação de mitigação.

## Princípios

1. **Sempre em staging primeiro.** Em prod, apenas após cenário
   ter sido validado em staging com sucesso E em janela de baixa
   atividade.
2. **Hipótese antes da ação.** Documentar o que esperamos que
   aconteça. Se acontecer outra coisa, é sinal de fragilidade.
3. **Tempo limitado.** Cada cenário tem duração máxima e
   trigger de abort.
4. **Sempre comunicar.** Slack #incidents, mesmo em staging,
   para evitar alarme falso da equipe.

## Cenários prioritários

### CHAOS-1: Redis indisponível por 60s

**Hipótese:**
- Workers param de processar (logam erros).
- Rate-limit HTTP fail-open temporário (ou fail-closed dependendo
  da config).
- Leader lock perdida (process.exit(1) — orquestrador reinicia).
- Socket.IO broadcast quebrado (adapter pub/sub down).
- Webhook Asaas continua aceitando + gravando WebhookEvent (via
  Postgres), mas ENFILEIRAMENTO falha → row pendente (esperado).

**Ação (staging):**
```bash
# Railway Redis: pause via dashboard 60s.
# Local: docker stop condosync-redis; sleep 60; docker start
docker stop condosync-redis
sleep 60
docker start condosync-redis
```

**Validação:**
- Workers reconectam automaticamente (ioredis retry).
- Leader re-eleito em <4min.
- Webhook backlog drena em <5min após Redis voltar.
- `npm run redrive:webhooks -- --apply` opcional para acelerar.

**Resultado esperado em prod:**
- Recuperação automática <5min.
- Possível perda de 1 cron tick durante a janela.
- 5xx em rotas que dependem de rate-limit: alerta dispara, mas
  recupera automaticamente.

### CHAOS-2: PostgreSQL com latência alta

**Hipótese:**
- API p95 sobe acima de SLO.
- Prisma pool satura → 503 "Timed out fetching connection".
- BullMQ workers acumulam (jobs in-flight bloqueados).
- Webhook outbox absorve sem perder dados.

**Ação:**
```bash
# Adicionar latência via Linux tc (em VM staging, não managed PG).
# OU via tool como gremlin/chaos-mesh.
# Alternativa simples: matar 1 réplica PG (se replica) e ver pool
# se reorganizar.
```

**Validação:**
- Cache de balance reduz pressão (hit ratio sobe nas métricas).
- OTel traces mostram tempo gasto em Prisma.
- Circuit breaker NÃO tem efeito aqui (não há breaker em DB —
  considerar adicionar?).

### CHAOS-3: Worker BullMQ crashado

**Hipótese:**
- Jobs em `active` ficam stalled (~30s).
- BullMQ stalled detection reagenda automaticamente.
- Métricas: `bullmq_queue_depth{state="waiting"}` sobe; após
  reagendamento, drena.
- Outros workers continuam processando (não há SPOF).

**Ação:**
```bash
# Mata o processo worker.
docker exec condosync-api kill -9 1
```

**Validação:**
- Logs mostram stalled detection.
- Sentry recebe captureException no on('failed') OU on('stalled').
- Métricas: `bullmq_jobs_total{result="stalled"}` incrementa.
- Recovery automático.

### CHAOS-4: Asaas (gateway externo) lento

**Hipótese:**
- Circuit breaker abre após 5 falhas em 30s.
- Endpoints que dependem de Asaas falham fast com "breaker open".
- Recovery automático em half-open após 60s.

**Ação:**
- Modo 1 (mais real): rotear via proxy que adiciona delay.
- Modo 2 (mais simples): em staging, configurar Asaas com URL
  inválida (DNS não resolve) e medir.

**Validação:**
- Logger mostra "Circuit breaker ABERTO".
- Latência do endpoint que usa Asaas cai (rejeita rápido).
- Workers BullMQ que sincronizam com Asaas: jobs falham, retry
  exponencial; após 5 attempts vão para failed.
- Métrica `bullmq_jobs_total{result="failed"}` sobe — alerta
  dispara.

### CHAOS-5: Spike de tráfego (load test em staging)

**Hipótese:**
- 10× tráfego baseline absorvido sem 5xx.
- p95 sobe mas <2s.
- Prisma pool perto de saturar (alerta warn).
- Cache hit ratio sobe.

**Ação:**
```bash
k6 run --env BASE_URL=https://staging.condosync \
       --vus 200 --duration 5m \
       e2e/load/webhook-asaas.k6.js
```

**Validação:**
- Thresholds k6 todos verdes.
- Métricas Prometheus mostram saturação previsível mas controlada.
- Nenhum recurso compartilhado satura totalmente.

### CHAOS-6: Network partition entre réplicas

**Hipótese:**
- Réplicas não compartilham mais Redis adapter.
- Cada réplica continua respondendo a clientes conectados.
- Socket.IO broadcasts cross-réplica falham.
- Leader lock vai para uma das partições; outras detectam e
  process.exit.

**Ação (complexo em managed):**
- Em staging com 2 réplicas, bloquear tráfego entre elas via
  iptables (apenas se infra permitir).
- Mais simples: simular via integração de teste (mock Redis
  em uma das réplicas).

**Validação:**
- Após partition restaurada, sistema converge para estado
  consistente.
- Sem split-brain de leader (Lua atômico garante).

## Frequência

- **Mensal** em staging: CHAOS-1, CHAOS-3, CHAOS-5.
- **Trimestral**: CHAOS-2, CHAOS-4.
- **Semestral** (após investimento em ferramental):
  CHAOS-6.

## Documentação de resultado

Cada execução gera `docs/chaos-results/<YYYY-MM-DD>-<chaos>.md`
com:
- Hipótese.
- Ação real executada.
- Resultado esperado vs observado.
- Falhas detectadas (sem mitigação atual).
- Próximas ações.

## Ferramental futuro

Quando time crescer e infra permitir:
- **Chaos Mesh** (k8s-native): network partition, IO delay.
- **Gremlin**: SaaS de chaos engineering.
- **Litmus**: open-source para k8s.

Por enquanto, scripts shell + testcontainers + dispatch manual
são suficientes para o estágio do produto.
