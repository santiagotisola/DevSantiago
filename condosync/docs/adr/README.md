# Architecture Decision Records (ADRs)

Documentação imutável de decisões arquiteturais significativas.

## Quando criar um ADR

Crie um ADR quando uma decisão:

- Afeta múltiplos módulos ou times.
- É difícil de reverter (>1 sprint).
- Estabelece um padrão que outros devs devem seguir.
- Tradeoff explícito entre alternativas relevantes.
- Justificou tempo significativo de discussão.

**Não** crie ADR para:
- Decisões locais a um módulo.
- Convenções de código (use ESLint/Prettier).
- Bugs ou implementações triviais.

## Formato

[Template Michael Nygard][nygard], com pequenas extensões:

```
# ADR-XXXX: <título curto>

- Status: Proposed | Accepted | Deprecated | Superseded by ADR-YYYY
- Date: YYYY-MM-DD
- Authors: @<github-handle>
- Reviewers: @<handle1>, @<handle2>

## Contexto
Por que esta decisão precisa ser tomada agora? Qual o problema?

## Decisão
O que decidimos. Imperativo: "Vamos usar X".

## Alternativas consideradas
- Alternativa A: prós/contras
- Alternativa B: prós/contras

## Consequências
- Positivas
- Negativas (tradeoffs aceitos conscientemente)
- Riscos

## Implementação
Links para PRs, runbooks, código exemplo.

## Referências
Links externos, documentação relevante.
```

## Numeração

Sequencial: `ADR-0001`, `ADR-0002`, etc. Nunca reusar nem renumerar.

Quando uma decisão é substituída, NÃO altere o ADR antigo:
- Marque status como "Superseded by ADR-XXXX" no antigo.
- Crie ADR novo referenciando o anterior.

## Workflow

1. Autor cria PR adicionando `docs/adr/XXXX-titulo.md` com status `Proposed`.
2. Reviewers comentam em PR; discussão fica registrada.
3. Após aprovação, status vira `Accepted`. Autor faz squash + merge.
4. Implementação subsequente referencia o ADR.

## RFC process (para mudanças maiores)

ADR captura decisão; RFC captura **proposta detalhada antes da
decisão**. Use RFC quando:

- Mudança envolve múltiplos serviços ou módulos.
- Há tradeoffs complexos com mais de 2 alternativas reais.
- Mudança é estrategicamente importante (ex: split em microserviços,
  multi-tenant routing, mudança de DB).

RFC vive em `docs/rfc/XXXX-titulo.md`. Após decisão (aceita ou
recusada), gera ADR correspondente.

Template RFC em `docs/rfc/_template.md`.

## Lista de ADRs

| # | Título | Status | Data |
|---|---|---|---|
| [0001](./0001-multi-tenant-isolation.md) | Multi-tenant isolation por membership | Accepted | 2026-05-08 |
| [0002](./0002-webhook-outbox-pattern.md) | Webhook Asaas via Outbox Pattern | Accepted | 2026-05-08 |
| [0003](./0003-leader-election-redis.md) | Leader election em workers via Redis | Accepted | 2026-05-08 |
| [0004](./0004-gateway-encryption.md) | Encryption at rest para gateway keys | Accepted | 2026-05-08 |
| [0005](./0005-bounded-contexts-finance.md) | Bounded contexts no domínio financeiro | Accepted | 2026-05-08 |
| [0006](./0006-expand-contract-migrations.md) | Migrações via expand/contract pattern | Accepted | 2026-05-08 |

[nygard]: https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions
