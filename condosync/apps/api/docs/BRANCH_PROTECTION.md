# Branch Protection — main

Configuração obrigatória do GitHub para que o CI realmente bloqueie
merges com regressão. Sem esta config, todos os jobs do
`ci.yml` rodam mas não impedem o merge — pipeline vira teatro.

## Configuração no GitHub

`Settings → Branches → Branch protection rules → main`:

### Required status checks (obrigatórios)

- [x] **Require status checks to pass before merging**
- [x] **Require branches to be up to date before merging**
- Status checks que devem passar:
  - `Testes API (Vitest)`
  - `Testes Integração API (testcontainers)`
  - `TypeScript Check (API)`
  - `Lint (API)`
  - `Build Web (Vite)`
  - `Build Mobile (Vite PWA)`
  - `Docker build (API + Web)`
  - `Dependency Review` (apenas em PR)
  - `Lint (Web + a11y)` (warn-only mas listado para visibilidade)

### Pull request reviews

- [x] **Require a pull request before merging**
- Required approvals: **1** (mínimo) ou **2** para mudanças em
  `prisma/migrations/`, `src/middleware/auth.ts`,
  `src/modules/webhooks/`.
- [x] **Dismiss stale pull request approvals when new commits are pushed**
- [x] **Require review from Code Owners** (criar `.github/CODEOWNERS`)

### Restrições adicionais

- [x] **Restrict pushes that create matching branches** — apenas
  pessoas em `admin` podem push direto.
- [x] **Do not allow bypassing the above settings** — admin
  também respeita as regras.
- [x] **Require linear history** — sem merge commits, força
  rebase/squash.
- [x] **Require conversation resolution before merging**

## Política de Hotfix

Para incidentes de produção que exigem bypass:

1. PR para `hotfix/<issue>` (não `main`).
2. Squash & merge para `main` com aprovação de **2** revisores.
3. Comentário no commit message: `[hotfix-bypass: <motivo>]`.
4. Issue de pós-mortem aberta automaticamente (template em
   `.github/ISSUE_TEMPLATE/postmortem.md`).

## Política de Release

- `main` é sempre deployable (Continuous Deployment).
- Tags `vX.Y.Z` criadas após sucesso do deploy job.
- Changelog automático via release-please ou conventional commits.

## Política de Migrations

PR que altera `prisma/migrations/**/migration.sql`:

- Required reviewer: **1 backend sênior + 1 DBA/SRE**.
- `migrations-lint` job (squawk) deve passar OU comentário
  `[migration-reviewed]` no PR com justificativa.
- PRs que adicionam DROP COLUMN, ALTER TYPE, RENAME exigem
  documento `docs/runbooks/migration-<feature>.md` linkado.

## CODEOWNERS recomendado

`.github/CODEOWNERS`:

```
# Auth + segurança crítica
/condosync/apps/api/src/middleware/auth.ts        @lucas-axion
/condosync/apps/api/src/middleware/rateLimiter.ts @lucas-axion
/condosync/apps/api/src/utils/cryptoVault.ts      @lucas-axion

# Webhooks financeiros
/condosync/apps/api/src/modules/webhooks/         @lucas-axion

# Migrations
/condosync/apps/api/prisma/                        @lucas-axion

# CI/CD
/.github/workflows/                                @lucas-axion
```
