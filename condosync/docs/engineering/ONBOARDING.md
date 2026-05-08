# Onboarding — Engineering

> Roteiro para novo dev sair de zero a primeiro PR mergeado.
> **Target: ≤ 5 dias úteis.** Acompanhar via `<dev>`-onboarding
> issue no GitHub.

## Dia 1 — Setup

### Acesso
- [ ] GitHub: convite + 2FA + SSH key.
- [ ] Slack: #engineering, #incidents, #alerts.
- [ ] Honeycomb / Tempo (se OTel ativo).
- [ ] Sentry.
- [ ] Railway (somente leitura inicialmente).
- [ ] Senha do vault para `APP_ENCRYPTION_KEY`,
      `JWT_SECRET`, `ASAAS_WEBHOOK_TOKEN`.

### Stack local

```bash
# Pré-requisitos
node --version    # ≥ 22
docker --version  # ≥ 24

# Clone + install
git clone git@github.com:<org>/condosync.git
cd condosync/DevSantiago/condosync
npm install

# Stack (Postgres + Redis + Mailpit)
cp .env.example .env
# Preencher: POSTGRES_PASSWORD, REDIS_PASSWORD, JWT_SECRET,
# JWT_REFRESH_SECRET (openssl rand -base64 48), ASAAS_WEBHOOK_TOKEN,
# APP_ENCRYPTION_KEY (openssl rand -base64 32)
docker compose up -d postgres redis mailpit

# Migrations + seed
cd apps/api
cp .env.example .env  # idem
npm run db:migrate
SEED_SUPER_ADMIN_PASSWORD='<senha-forte>' npm run db:seed

# Roda
cd ..
npm run dev   # api 3333 + web 5173 paralelo
```

### Validação
- http://localhost:5173 abre.
- Login com `admin@condosync.com.br` + senha do seed.
- http://localhost:3333/health → 200.

## Dia 2 — Leitura obrigatória

Em ordem (4-6h):

1. **Arquitetura visual**: `condosync/apps/api/docs/runbooks/sprint-p4-p5-enterprise.md`
   (resume estado atual da plataforma).
2. **Decisões**: `condosync/docs/adr/README.md` + ADRs 0001-0006
   (entender PORQUÊ das principais escolhas).
3. **Bounded contexts finance**:
   `condosync/apps/api/src/modules/finance/domain/README.md`.
4. **Frontend pattern**:
   `condosync/apps/web/docs/PAGE_DECOMPOSITION.md`.
5. **PR guidelines**: `condosync/docs/engineering/PR_GUIDELINES.md`.
6. **Migrations**: `condosync/apps/api/docs/MIGRATIONS.md`.
7. **Runbook DR**: `condosync/apps/api/docs/runbooks/backup-restore-dr.md`.

Anotar dúvidas. Sessão 1h com mentor para tirar.

## Dia 3 — Tour de código

Pair programming com mentor seguindo um request real:

1. Cliente faz `POST /api/v1/auth/login`.
2. Tour: `auth.routes` → `auth.controller` → `auth.service` →
   `prisma.user.findUnique`.
3. Onde aparece request-id? Métricas? Sentry tag?

Repetir com:
- `POST /api/v1/webhooks/asaas` (outbox pattern).
- `GET /api/v1/finance/accounts/:id/balance` (cache + bounded
  context migrado).

## Dia 4 — Primeiro PR (paved road)

**Sugestão:** pegar 1 issue de `good-first-issue` no GitHub.

Tarefa típica:
- Adicionar 1 endpoint CRUD novo.
- `npx plop module <nome>` gera scaffolding.
- Implementar zod schema, repository methods.
- Adicionar 2-3 testes (unit do service + 1 IT).
- PR ≤300 LOC.

Validações:
- CI verde (lint + typecheck + test + test:it).
- ESLint architectural rules não reclamam (Prisma só em repo).
- Review de mentor.

## Dia 5 — Review + ownership

- [ ] Primeiro PR mergeado.
- [ ] Pareou em 1 review de PR de outra pessoa.
- [ ] Adicionado em rotação de oncall (modo shadow nas primeiras
      2 semanas).
- [ ] Acesso a alertas Slack #alerts.
- [ ] Documentou aprendizados em `docs/onboarding/<dev>.md`
      (feedback para próximo onboarding).

## Recursos

### Ferramentas obrigatórias
- VS Code com extensões: ESLint, Prisma, Vitest, GitLens.
- node 22 + npm.
- Docker Desktop OU OrbStack.
- ngrok (para testar webhook Asaas localmente — opcional).

### Slack channels
- #engineering — discussão técnica geral.
- #incidents — apenas durante incidentes ativos.
- #alerts — automático, Prometheus → Slack.
- #deploys — automático, Railway → Slack.

### Pessoas
- Mentor designado por 30 dias.
- Plataforma owner (questões de arquitetura/CI).
- Domain owners (CODEOWNERS).

## Checklist de saúde mental

Após 2 semanas:
- Confortável com stack? Stack docs faltam? Reportar.
- PR review feedback é claro? Se confuso, peça reformulação.
- Sente "stuck" >2h em algo? Pedir ajuda. Não é falha; é DX
  feedback.

## Métricas (acompanhar individualmente)

Após primeiros 30 dias, comparar com baseline:
- Tempo até primeiro PR mergeado.
- LOC por PR (saudável: <400).
- Tempo de review recebido (sinal de DX dos reviewers).
- Bugs introduzidos em PRs (caçados em testes/incidentes
  posteriores) — investigar com curiosidade, não culpa.
