# ADR-0005: Bounded contexts no domínio financeiro

- **Status:** Accepted
- **Date:** 2026-05-08
- **Authors:** @lucas-axion

## Contexto

`finance.service.ts` cresceu para ~800 LOC com responsabilidades
misturadas:

- CRUD `FinancialAccount` + balance.
- CRUD `Charge` + ratios + sync gateway + markAsPaid.
- CRUD `FinancialTransaction`.
- Reconciliation (matching webhook ↔ charge).
- Reporting (getMonthlyBalance, balancete, defaulters).
- Gateway integration.

Acoplamento alto: cada nova regra (multa parcelada, isenção,
juros customizados) cresce o god-service. Blast radius enorme:
bug em ratios pode quebrar markAsPaid. Testabilidade comprometida
(precisa mockar Prisma inteiro).

## Decisão

Decompor em 8 bounded contexts conforme padrão DDD-leve:

```
finance/domain/
  accounts/      — CRUD account + balance + tenant scope
  transactions/  — CRUD FinancialTransaction
  charges/       — CRUD Charge + sync gateway + markAsPaid
  reconciliation/ — matching webhook ↔ charge ↔ transaction
  ratios/        — cálculo de rateio
  billing/       — orquestrador (gera cobranças mensais)
  reporting/     — read-only aggregates (balancete, defaulters)
  gateway/       — re-export de services/gateway
```

**Migração incremental via Facade pattern**:
- `finance.service.ts` permanece API pública.
- Cada sprint migra UM sub-context.
- Facade delega para o sub-service.
- Após sprint 6, facade pode ser removida (callers importam direto).

**Princípios de design**:

1. Service boundary = transaction boundary. Composição via
   orchestrator (`billing.service`), não chamadas horizontais.
2. Sub-service NÃO importa de outro sub-service da mesma camada.
3. Repository por sub-context — Prisma só em `*.repo.ts`.
4. Tipos compartilhados em `domain/types.ts`.
5. Sub-service aceita `tx?: PrismaTx` opcional para composição.

## Alternativas consideradas

### A. Big-bang refactor

Reescrever tudo de uma vez.

**Contras:** Sprint inteira sem entregar feature; risco enorme
de regressão; merge conflicts gigantes; rollback caro.

### B. Microserviço financeiro separado

Extrair finance para serviço próprio.

**Contras:** Custo operacional 5x (deploy, observabilidade,
network); ainda no estágio errado de maturidade do produto;
acoplamento DB compartilhado mantém problemas de boundary.

### C. Bounded contexts in-process com Facade (escolhida)

Decomposição lógica sem mudar deploy.

**Prós:** Migração incremental segura; zero risco para callers;
permite refactor enquanto entrega features; mantém custo
operacional.

## Consequências

- **Positivas:**
  - Cada sub-context testável isoladamente.
  - Onboarding de novo dev: ler 1 sub-context vs 800 LOC.
  - Lint rule futura proíbe import de `prisma` fora de `*.repo.ts`.
  - Eventual extração para microserviço fica trivial (sub-context
    já é o módulo).
- **Negativas:**
  - 6 sprints de migração progressiva.
  - Período de transição com facade vs sub-service exige cuidado
    em onde adicionar features novas (regra: features novas vão
    direto no sub-context).
- **Riscos:**
  - Dev migra parcialmente um sub-context e deixa código duplicado.
    Mitigação: `docs/MIGRATION.md` rastreia progresso por sprint.

## Implementação

Sprint 1 (este ADR):
- `src/modules/finance/domain/README.md` — arquitetura alvo + princípios.
- `src/modules/finance/domain/types.ts` — shared.
- `src/modules/finance/domain/accounts/{accounts.repo,accounts.service}.ts`.
- `finance.service.getAccountBalance` agora delega.

Sprints 2-6 documentadas no README do domain.

## Referências

- Eric Evans — Domain-Driven Design (Bounded Contexts).
- Sam Newman — Building Microservices (modular monolith).
- Vaughn Vernon — Implementing DDD.
