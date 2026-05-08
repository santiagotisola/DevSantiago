# ADR-0006: Migrações via expand/contract pattern

- **Status:** Accepted
- **Date:** 2026-05-08
- **Authors:** @lucas-axion

## Contexto

Migrações destrutivas em produção (DROP COLUMN, ALTER NOT NULL,
RENAME) podem:
- Travar tabelas inteiras durante o ALTER (table rewrite em PG <11).
- Quebrar deploys rolling — réplicas com código novo + DB com
  schema antigo, ou vice-versa.
- Perder dados se rollback for necessário sem `down.sql`.

Migrações já aplicadas (FK conversion, drop balance, gateway
encrypt) seguiram o padrão informalmente. Decisão formaliza.

## Decisão

Toda mudança destrutiva de schema segue **expand → backfill →
contract** em fases, separadas por ≥1 sprint:

### Fase EXPAND (additive, cheap, sem janela)

- `ADD COLUMN` (sempre nullable inicialmente).
- `ADD CONSTRAINT … NOT VALID` (FK, CHECK).
- `CREATE INDEX CONCURRENTLY` em tabelas grandes (manual em prod).
- `CREATE TABLE` (novas).

### Fase BACKFILL (job, in-app)

- Script `prisma/<name>-backfill.ts` com `--dry-run` e `--apply`.
- Batches 50-500, pause 100-500ms.
- Idempotente.
- Validar contagem zero antes de prosseguir.

### Fase VALIDATE (cheap após backfill correto)

- `ALTER TABLE … VALIDATE CONSTRAINT` (sem table rewrite).
- Para `SET NOT NULL`, usar truque do CHECK validado precedente
  (PG 12+ usa CHECK validado para NOT NULL O(1)).

### Fase CONTRACT (destructive)

- `DROP COLUMN`, `DROP CONSTRAINT`, `RENAME COLUMN`.
- Code já está há ≥1 sprint sem usar a coluna velha.
- Janela curta (`lock_timeout='5s'`, retry com backoff).

## Alternativas consideradas

### A. Migrações em janela de manutenção

Aplicar tudo de uma vez em janela noturna.

**Contras:** Downtime planejado; ainda assim arriscado em base
grande; sem rollback safe; opera em pressure.

### B. Online schema change (gh-ost, pt-online-schema-change)

Ferramentas que copiam tabela com schema novo + sync trigger.

**Contras:** Não suporta PG nativamente (são MySQL-first); custo
de dobrar storage; ferramental adicional.

### C. Expand/contract (escolhida)

Padrão indústria para zero-downtime schema changes.

## Consequências

- **Positivas:**
  - Zero-downtime por design.
  - Rollback granular: cada fase tem revert claro.
  - Sem operações em pressure.
- **Negativas:**
  - Cada mudança destrutiva consome 2-3 sprints.
  - Schema fica temporariamente "duplicado" (coluna nova +
    coluna velha) — overhead de escrita até CONTRACT.
- **Riscos:**
  - Dev esquece de fazer CONTRACT depois de EXPAND.
    Mitigação: GitHub issue com milestone para cada CONTRACT
    pendente. Dashboard "schema debt" mostra colunas
    deprecadas há >1 sprint.

## Implementação

- `apps/api/docs/MIGRATIONS.md` — política completa.
- `.github/workflows/ci.yml` — job `migrations-lint` (squawk)
  bloqueia ALTER perigoso sem CHECK precedente.
- Migrations já aplicadas seguindo o padrão:
  - `20260508120000_add_webhook_events_…` (EXPAND).
  - `20260508160000_gateway_encrypt_expand` (EXPAND).
  - `20260508170000_drop_financial_account_balance` (CONTRACT
    seguro: zero código lia a coluna).
  - `20260508180000_fk_condominium_expand` (FK NOT VALID).
  - `20260508200000_partition_audit_logs` (EXPAND additive).

## Referências

- GitHub Engineering — [Online schema migrations](https://github.blog/2017-01-12-online-migrations-on-percona-server/)
- Strong Migrations (Ruby gem) — princípios análogos.
- `apps/api/docs/MIGRATIONS.md`.
