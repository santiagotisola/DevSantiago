# Performance Profiling — guia oficial

> Ferramentas e procedimentos para investigar regressões de
> performance, hotspots de CPU, memory leaks e event loop lag.
> Aplicar quando métricas Prometheus indicarem degradação ou em
> investigação proativa pré-release.

## Quando profilar

Trigger | Ação |
|---|---|
| `nodejs_eventloop_lag_seconds > 0.1` por 5min | Profile event loop hotspot |
| `process_resident_memory_bytes` cresce monotônico em 24h | Heap snapshot diff |
| p95 de rota específica > baseline + 50% | Trace via OTel + flamegraph |
| BullMQ job duration p95 > 30s | Profile worker handler |
| Sentry: Aborted by user (timeout) | Trace pipeline da request |

## Ferramentas

### 0x — flamegraphs CPU

```bash
# Profile API em dev local com tráfego realístico
cd apps/api
0x --output-dir /tmp/0x -- node -r ts-node/register src/server.ts

# Em outro terminal: dispara carga via k6 (cenário e2e/load/)
k6 run --env BASE_URL=http://localhost:3333 e2e/load/webhook-asaas.k6.js

# CTRL+C no 0x → abre flamegraph SVG no browser.
```

Identifica funções consumindo CPU. Procurar por:
- `bcrypt.hashSync` (deveria ter sido substituído por bcrypt nativo).
- `JSON.stringify` em payloads grandes.
- Loops em workers serializando.

### clinic.js — diagnóstico geral

```bash
# Diagnóstico padrão: detecta event loop lag, memory growth
npx clinic doctor -- node dist/server.js

# Bubbleprof: visualiza async dependencies
npx clinic bubbleprof -- node dist/server.js

# Flame: alternativa ao 0x
npx clinic flame -- node dist/server.js
```

Diagnóstico HTML interativo. Bom para investigação inicial.

### node --prof + processador

```bash
# Coleta tick samples (mais leve que 0x)
node --prof dist/server.js
# após carga, gera isolate-<pid>.log
node --prof-process isolate-*.log > processed.txt
```

Sem dependência externa. Ideal em prod (1% overhead).

### node --inspect + Chrome DevTools

```bash
node --inspect dist/server.js
# Chrome → chrome://inspect → Inspect → Performance / Memory tabs
```

Heap snapshot diff:
1. Inicia gravação.
2. Faz N requests.
3. Para gravação. Compare snapshot 1 vs snapshot 2.
4. Procurar objetos com count crescente sem desalocar.

### Prisma query log

Em dev, ativar `?log=query`:
```ts
// config/prisma.ts (dev only)
const prisma = new PrismaClient({
  log: [{ emit: 'event', level: 'query' }],
});
prisma.$on('query', (e) => {
  if (e.duration > 100) console.warn(`SLOW: ${e.duration}ms ${e.query}`);
});
```

Em prod: `pg_stat_statements` extension + `EXPLAIN ANALYZE` para
top-N queries.

### Redis MONITOR (cuidado em prod)

```bash
redis-cli -h <host> MONITOR | head -100
```
**Em prod, MONITOR adiciona latência significativa** — usar apenas
em janela curta. Para análise contínua: `SLOWLOG GET 100`.

## Performance baselines (atualizados a cada release)

| Endpoint | p95 alvo | p95 atual | Notas |
|---|---|---|---|
| POST /auth/login | < 200ms | TODO medir | bcrypt nativo (~25ms) + Prisma user.findUnique |
| POST /webhooks/asaas | < 100ms | TODO medir | Outbox: só write + enqueue |
| GET /finance/accounts/:id/balance | < 50ms (cache hit), < 300ms (miss) | TODO medir | Cache Redis 30s |
| GET /finance/dashboard/:condoId | < 200ms | TODO medir | getMonthlyBalance via raw SQL |
| GET /communication/notifications | < 100ms | TODO medir | Cursor pagination + index |

Coletar via k6 + thresholds em CI. Alerta automático em regressão >20%.

## Anti-patterns a evitar

❌ **`Promise.all([...100])` sem limite** — satura conexões.
   Use `p-limit(10)`.

❌ **`for...of` com `await` em loop grande** — serializa quando
   poderia paralelizar.

❌ **`JSON.parse(JSON.stringify(obj))` para deep clone** — caro
   em payloads grandes. Use `structuredClone`.

❌ **`bcrypt.hashSync` em request handler** — bloqueia event loop.
   `bcrypt.hash` (async) sempre.

❌ **Loop síncrono construindo string grande** — `Array.join`
   em vez de `+=`.

❌ **`req.body` enorme parsado por default** — body-limit
   configurado em `server.ts` (1MB global).

## Checklist pré-release

- [ ] k6 load test do endpoint mais crítico (webhook-asaas) passa.
- [ ] Métricas Prometheus de baseline coletadas em staging.
- [ ] OTel trace de fluxo crítico revisado.
- [ ] Heap snapshot após 100 requests não cresce >10% vs baseline.
- [ ] Event loop lag < 50ms em pico simulado.
