# Finance — Bounded Contexts

> Estrutura alvo para decomposição do `finance.service.ts` (~800 LOC)
> em sub-domínios com responsabilidades claras. Migração é
> **incremental** via **facade pattern**: `finance.service.ts`
> permanece como entrada pública e delega progressivamente para os
> sub-services.

## Bounded contexts

```
finance/
├─ domain/                      ← contratos públicos do domínio
│  ├─ accounts/
│  │  ├─ accounts.service.ts    ← CRUD FinancialAccount, listagem,
│  │  │                            permission scoping
│  │  ├─ accounts.repo.ts       ← persistência
│  │  └─ types.ts               ← AccountSummary, etc.
│  ├─ charges/
│  │  ├─ charges.service.ts     ← CRUD Charge, ratios, sync gateway,
│  │  │                            markAsPaid, listagem
│  │  ├─ charges.repo.ts
│  │  └─ types.ts
│  ├─ transactions/
│  │  ├─ transactions.service.ts ← CRUD FinancialTransaction
│  │  ├─ transactions.repo.ts
│  │  └─ types.ts
│  ├─ reconciliation/
│  │  ├─ reconciliation.service.ts ← matching webhook ↔ charge ↔
│  │  │                              transaction; defaulters report
│  │  ├─ reconciliation.repo.ts
│  │  └─ types.ts
│  ├─ gateway/                  ← já existe em services/gateway/
│  │  └─ (re-export para coesão)
│  ├─ ratios/
│  │  ├─ ratios.service.ts      ← cálculo de rateio (proporcional,
│  │  │                            por unidade, por fração ideal)
│  │  └─ types.ts
│  ├─ billing/
│  │  ├─ billing.service.ts     ← geração de cobranças mensais
│  │  │                            (orquestra ratios + charges + gateway)
│  │  └─ types.ts
│  └─ reporting/
│     ├─ reporting.service.ts   ← getMonthlyBalance, balancete,
│     │                            inadimplência (read-only,
│     │                            com cache)
│     └─ types.ts
├─ finance.service.ts            ← FACADE — preserva API atual,
│                                  delega para sub-services
├─ finance.controller.ts
├─ finance.routes.ts
├─ ... (resto inalterado)
└─ docs/
   ├─ ARCHITECTURE.md            ← este doc
   └─ MIGRATION.md               ← progresso da migração
```

## Princípios de design

### 1. Service boundary = transaction boundary

Cada sub-service controla SUAS transações. Composição entre
sub-services usa eventos OU service-orchestrator (`billing.service`)
que coordena explicitamente.

❌ Anti-padrão (acoplamento profundo):
```ts
// charges.service
async markAsPaid(id) {
  await prisma.$transaction([
    prisma.charge.update(...),
    prisma.financialTransaction.create(...) // CRUZA boundary
  ]);
}
```

✅ Padrão correto (orchestrator):
```ts
// billing.service
async receivePayment(chargeId, amount) {
  await prisma.$transaction(async (tx) => {
    await chargesService.markAsPaid(chargeId, amount, { tx });
    await transactionsService.recordIncome({ chargeId, amount }, { tx });
  });
}
```

Cada sub-service aceita transação opcional para composição
(mantém atomicidade quando orquestrado).

### 2. Sub-service não importa de outro sub-service da MESMA camada

`charges.service` NÃO importa `transactions.service`. Composição é
feita por camada superior (`billing.service` ou route handler).
Isso impede ciclos e mantém boundaries.

✅ Permitido:
- Sub-service importa `domain/<próprio-bounded-context>/*`.
- Sub-service importa de `domain/types/shared` (DTOs comuns).
- Orchestrator (`billing.service`) importa múltiplos sub-services.
- Facade (`finance.service`) importa todos sub-services.

### 3. Facade preserva API atual durante a migração

`finance.service.ts` continua exportando todos os métodos públicos
que o resto do app já usa. Internamente, delega:

```ts
class FinanceService {
  async getAccountBalance(accountId: string, actor: FinanceActor) {
    return accountsService.getBalance(accountId, actor);
  }

  async listCharges(condominiumId: string, filters: ChargeFilters) {
    return chargesService.list(condominiumId, filters);
  }
  // ...
}
```

Quando todos os métodos delegam, a facade pode ser removida em
sprint futura (controllers/routes passam a importar sub-services
diretamente).

### 4. Repository por bounded context

Cada sub-context tem `*.repo.ts` que é o ÚNICO lugar onde Prisma
é importado. Service usa o repo via interface.

```ts
// charges/charges.repo.ts
export interface ChargesRepository {
  findById(id: string, tx?: PrismaTx): Promise<Charge | null>;
  create(data: CreateChargeInput, tx?: PrismaTx): Promise<Charge>;
  list(filters: ChargeFilters, tx?: PrismaTx): Promise<Page<Charge>>;
}

export class PrismaChargesRepository implements ChargesRepository {
  // ... implementação real com Prisma
}
```

Em testes: mock da interface (`vitest-mock-extended` ou implementação
fake in-memory). Sem precisar mockar Prisma.

### 5. Tipos compartilhados em `domain/types/shared.ts`

DTOs que cruzam boundaries (FinanceActor, Money, ChargeStatus
mapping) ficam centralizados.

## Ordem de migração (sem big-bang)

| Sprint | Sub-context | Risco | Razão da ordem |
|---|---|---|---|
| **1** | `accounts` | Baixo | Mais simples; sem dependências; estabelece padrão |
| **2** | `transactions` | Médio | CRUD direto; depende só de accounts |
| **3** | `charges` | Alto | Maior volume de regra; sync gateway |
| **4** | `reconciliation` | Médio | Já está parcialmente em webhook.processor |
| **5** | `ratios` + `billing` | Alto | Composição de tudo acima |
| **6** | `reporting` | Baixo | Read-only com cache; isolado |

Em cada sprint:
1. Criar pasta + repo + service.
2. Migrar 1-2 métodos com testes.
3. Facade `finance.service.ts` delega.
4. Validar suíte completa de testes.
5. Merge.

Após sprint 6, `finance.service.ts` é só facade puro. Sprint 7+
(opcional): remover facade, callers importam direto.

## Eventos de domínio (futuro)

Não introduzir agora. Em P5+, considerar event bus interno
(BullMQ ou EventEmitter) para:
- `ChargePaid` event → notification, audit, reconciliation, etc.
- `AccountCreated` event → setup defaults, alert.

Por enquanto, composição síncrona via orchestrator (`billing.service`)
é suficiente. Eventos só fazem sentido quando há ≥3 consumers.

## Anti-patterns a evitar

❌ **Big-bang refactor**: parar tudo e reescrever — risco enorme,
sprint inteira sem entregar valor.

❌ **Abstração prematura**: criar interfaces "para o caso de"
antes de existir 2+ implementações concretas. Custa onboarding,
não traz valor.

❌ **Vazamento Prisma fora do repo**: import de `@prisma/client`
no service. Bloqueado por lint rule (a configurar).

❌ **Sub-service que importa de outro sub-service**: acoplamento
horizontal. Use orchestrator.

❌ **Mover regra para o repo**: `chargesRepository.markAsPaid`
fica no service, não no repo. Repo é só persistência.

## Métricas de progresso da migração

- LOC do `finance.service.ts`: target final ≤ 200 LOC (só
  delegação).
- Cobertura de testes por sub-service ≥ 70%.
- Imports diretos de `prisma` em arquivos de service: target 0
  (apenas em `*.repo.ts`).

Acompanhar em `docs/MIGRATION.md` (criado por sprint).
