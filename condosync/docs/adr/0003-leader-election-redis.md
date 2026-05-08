# ADR-0003: Leader election em workers via Redis Lua atômico

- **Status:** Accepted
- **Date:** 2026-05-08
- **Authors:** @lucas-axion

## Contexto

Workers BullMQ rodam em N réplicas (Railway autoscale). Workers
em si são "competitive consumers" — múltiplas réplicas dividem
trabalho naturalmente. Mas a REGISTRAÇÃO de cron repeatables
(jobs com `repeat.pattern`) precisa acontecer em UMA réplica só.
Múltiplas registrando = cron disparando N×.

## Decisão

Implementar leader election distribuída via Redis SET NX EX +
Lua script atômico para renovação:

1. **Acquire**: `SET leader:schedulers <fingerprint> NX EX 240`.
   Vencedor é líder por 4min.
2. **Renew (a cada 60s)**: Lua script atômico
   `if GET == fingerprint then EXPIRE 240 else 0`. Apenas o
   dono atual renova. Sem isso, NX falha (chave existe), líder
   perde leadership.
3. **Release no shutdown**: Lua atômico
   `if GET == fingerprint then DEL`.
4. **Fail-fast**: se renew retorna 0 (lock perdida), worker
   chama `process.exit(1)` — orquestrador reinicia, eleição
   acontece limpa.

Apenas o líder chama `register*Schedule()`. Demais réplicas
processam jobs como consumers (BullMQ é cooperativo).

## Alternativas consideradas

### A. ZooKeeper / etcd

Lock service dedicado.

**Contras:** Infraestrutura adicional; overkill para o caso de
uso (apenas eleição de "quem registra repeatables").

### B. Postgres advisory lock

`pg_try_advisory_lock(N)` por sessão.

**Contras:** Requer conexão dedicada do pool por toda a vida da
liderança; libera no rollback de transação inadvertido; mistura
DB e coordenação.

### C. Redis SET NX (escolhida)

Padrão tipo "Redlock single-node" — adequado quando há apenas
uma instância Redis (caso atual).

**Tradeoff conhecido:** se Redis instância única cai, leader
expira e nenhuma réplica é líder até voltar (~até TTL=4min).
Aceitável para crons diários (cobranças, balancete) que toleram
janela curta. Inaceitável para crons frequentes — não é o caso.

## Consequências

- **Positivas:**
  - Sem infraestrutura adicional (Redis já existia).
  - Comportamento previsível: máximo 4min de janela sem líder.
  - Testável (mocks de redis em `leader-lock.test.ts`).
- **Negativas:**
  - SPOF Redis. Em incidente Redis, perde 1 cron tick.
  - Lua script — lógica fora do TS, harder to debug.
- **Riscos:**
  - Renovação em rede instável: sem `Promise.race(timeout)` no
    `eval`, múltiplas chamadas concorrentes contra Redis lento.
    Mitigação futura: setTimeout recursivo + flag inFlight.

## Implementação

- `apps/api/src/config/redis.ts` — `tryAcquireLeaderLock`,
  `renewLeaderLock`, `releaseLeaderLock`.
- `apps/api/src/workers/registerWorkers.ts` — uso + métrica
  `bullmq_leader_renewal_total{result}`.
- Teste: `apps/api/src/test/leader-lock.test.ts`.

## Referências

- Redis docs — [Distributed locks](https://redis.io/docs/manual/patterns/distributed-locks/)
- Martin Kleppmann — [How to do distributed locking](https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html)
