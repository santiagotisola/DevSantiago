# ADR-0001: Multi-tenant isolation por membership

- **Status:** Accepted
- **Date:** 2026-05-08
- **Authors:** @lucas-axion

## Contexto

CondoSync é SaaS multi-tenant — cada condomínio é um "tenant" e
seus dados (usuários, cobranças, multas, etc.) NÃO podem ser
acessados por usuários de outro condomínio.

Modelo do schema: tabela `CondominiumUser` (M:N entre `User` e
`Condominium` com role local). Usuário pode pertencer a múltiplos
condomínios com roles diferentes.

Auditoria identificou IDORs em ~10 módulos onde rotas com `:id`
faziam `findUniqueOrThrow` sem verificar membership do ator no
condomínio do recurso.

## Decisão

Toda operação que acessa recurso pertencente a um condomínio
DEVE validar membership do ator antes de prosseguir, via UMA destas
estratégias:

1. **`requireResourceMembership(model, paramName)` middleware** —
   carrega o recurso, extrai `condominiumId`, valida membership.
   Retorna 404 (não 403) em cross-tenant para não vazar existência.

2. **Helper local `ensureMembership(actor, condominiumId)`** —
   quando o middleware genérico não cabe (ex: rotas que recebem
   `condominiumId` no body em vez de via :id).

3. **`SUPER_ADMIN` é exceção universal** — bypassa validação
   (com auditoria via Sentry tag).

Database-level FKs (`condominiumId` como FK real para
`Condominium`) garantem integridade referencial; conversão
EXPAND-only documentada em ADR-0006.

## Alternativas consideradas

### A. Row-level security (RLS) Postgres

Postgres suporta RLS via `CREATE POLICY`. Cada query carrega
automaticamente o `current_setting('app.current_user')`.

**Prós:** Defesa em profundidade; difícil de esquecer.
**Contras:** Não suportado por Prisma natively (precisa raw queries
ou extension); contexto via session var é frágil em pool de conexões;
debug complexo; "policy explosion" em múltiplos roles.

### B. Schema separado por tenant

Cada condomínio em seu próprio schema PG.

**Prós:** Isolamento físico real.
**Contras:** Migrations multiplicadas por N tenants; backup
complexo; aggregate cross-tenant impossível para SUPER_ADMIN;
provisioning de novo condo vira processo demorado. Inviável
para volume de condominios pequenos (>50).

### C. Validação app-level (escolhida)

Middleware + helpers checam membership.

**Prós:** Explícito no código; debuggable; suportado por Prisma;
performance OK (1 query extra por request, indexada).
**Contras:** Precisa disciplina dos devs; cada nova rota deve
aplicar check (lint rule a configurar).

## Consequências

- **Positivas:** Padrão claro, testável, auditável via métrica
  `idor_guard_decisions_total{result="deny_cross_tenant"}`.
- **Negativas:** Cada nova rota com `:id` adiciona 1 query
  (mitigado por `req.resource` cache); possibilidade de regressão
  silenciosa (mitigado por testes IT de cross-tenant em
  testcontainers).
- **Riscos:** Dev novo cria rota sem o middleware. Mitigação:
  CODEOWNERS para rotas críticas + testes IT obrigatórios.

## Implementação

- `apps/api/src/middleware/auth.ts:requireResourceMembership`
- Sweep em fines, communication/polls, residents/dependents
  (commits anteriores).
- Suite IT em `apps/api/src/test/it/multi-tenant.it.test.ts`.
- Métrica Prometheus `idor_guard_decisions_total`.

## Referências

- OWASP Top 10 — Broken Object Level Authorization (BOLA).
- LGPD Art. 7 (princípio do propósito).
