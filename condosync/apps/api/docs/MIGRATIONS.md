# Política de Migrations

Migrations destrutivas em produção podem travar tabelas inteiras
durante o ALTER, derrubar deploys rolling, ou perder dados. Esta doc
estabelece o padrão **expand → backfill → contract** seguido pelo
projeto.

## Princípio

**Schema sempre evolui ADITIVAMENTE em uma fase, e contrai
DESTRUTIVAMENTE em outra fase posterior.** Entre as duas fases,
o code dual-reads/writes permite rollback sem perda.

## Fases

### EXPAND (additive, cheap, sem janela)

- `ADD COLUMN` (sempre nullable inicialmente, mesmo que vá ser NOT NULL).
- `ADD CONSTRAINT ... NOT VALID` (validação posterior).
- `CREATE INDEX CONCURRENTLY` (em prod; Prisma migrate deploy não
  suporta CONCURRENTLY, manter `CREATE INDEX` no arquivo e aplicar
  CONCURRENTLY manual quando necessário em tabela grande).
- `CREATE TABLE` (novas).
- `ALTER COLUMN ... SET DEFAULT` (sem update massivo).

### BACKFILL (job, in-app)

- Script `prisma/<name>-backfill.ts` com `--dry-run` e `--apply`.
- Batches de 50-500 com pause 100-500ms.
- Idempotente — `SET WHERE col IS NULL` ou similar.
- Roda em horário de baixa atividade.
- Validar contagem zero antes de prosseguir para CONTRACT.

### VALIDATE (cheap após backfill correto)

- `ALTER TABLE ... VALIDATE CONSTRAINT` (FK NOT VALID → VALID).
- Para SET NOT NULL: usar truque do CHECK validado primeiro:

```sql
-- 1. CHECK constraint validada (cheap se backfill OK)
ALTER TABLE foo ADD CONSTRAINT foo_x_check CHECK ("x" IS NOT NULL) NOT VALID;
ALTER TABLE foo VALIDATE CONSTRAINT foo_x_check;

-- 2. SET NOT NULL agora é O(1) — Postgres reusa o CHECK validado
ALTER TABLE foo ALTER COLUMN "x" SET NOT NULL;

-- 3. Drop o CHECK redundante
ALTER TABLE foo DROP CONSTRAINT foo_x_check;
```

### CONTRACT (destructive)

- `DROP COLUMN`, `DROP CONSTRAINT`, `RENAME COLUMN`.
- Code já mudou para parar de usar a coluna velha (≥1 sprint
  antes).
- Janela curta (`lock_timeout='5s'` antes do ALTER, retry com
  backoff).

## Anti-patterns que squawk pega

- `ALTER TABLE ... ALTER COLUMN ... SET NOT NULL` direto (sem
  CHECK precedente em tabela grande → table rewrite + lock).
- `DROP COLUMN` sem feature-flag/dual-write prévio.
- `ADD COLUMN ... NOT NULL DEFAULT '...'` em tabela grande (faz
  rewrite — em PG 11+ isso é cheap se o default é constante,
  mas frágil).
- `RENAME` em coluna usada por código sem rolling de read-side
  primeiro.
- `CREATE INDEX` (sem CONCURRENTLY) em tabela grande durante deploy.

## Convenção de nomes

```
<YYYYMMDDHHMMSS>_expand_<description>     # additive
<YYYYMMDDHHMMSS>_backfill_<description>   # opcional, se for SQL
<YYYYMMDDHHMMSS>_contract_<description>   # destructive
```

## Exemplo: tornar coluna NOT NULL

**Sprint N:**

```
20260601000000_expand_users_phone_check
```
```sql
ALTER TABLE users
  ADD CONSTRAINT users_phone_not_null CHECK ("phone" IS NOT NULL) NOT VALID;
-- Ainda permite rows antigas com phone=NULL passarem.
```

Backfill: `npm run backfill:users-phone -- --apply` em horário de
baixa atividade.

**Sprint N+1:**

```
20260615000000_contract_users_phone_required
```
```sql
ALTER TABLE users VALIDATE CONSTRAINT users_phone_not_null;
ALTER TABLE users ALTER COLUMN "phone" SET NOT NULL;
ALTER TABLE users DROP CONSTRAINT users_phone_not_null;
```

## CI lint

`migrations-lint` job no `.github/workflows/ci.yml` roda squawk em
todo PR que altera `prisma/migrations/**/migration.sql`. Falha o
build se identificar:

- `BAN_DROP_NOT_NULL_COLUMN`
- `DISALLOWED_UNIQUE_CONSTRAINT` (sem CONCURRENTLY)
- `RENAMING_COLUMN`
- `RENAMING_TABLE`
- `ADDING_NOT_NULLABLE_FIELD`

Override por PR: comentar `[skip-squawk]` no commit message — exige
aprovação dupla na PR.
