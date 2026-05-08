# Postmortem — `<YYYY-MM-DD>-<incident-slug>`

> Template oficial para postmortem de incidente. Toda incidente
> com SLO violado E impacto a usuário gera postmortem em ≤72h.
>
> **Cultura blameless.** Foco em sistema/processo, não pessoas.
> "X errou" → "sistema permitiu X errar" → "como prevenir
> sistemicamente".

## Resumo

- **Incident commander:** `<nome>`
- **Detection:** `<HH:MM TZ>` via `<alerta|usuário|monitoring>`
- **Mitigation:** `<HH:MM TZ>`
- **Resolution:** `<HH:MM TZ>`
- **Severity:** SEV1 | SEV2 | SEV3
- **Impact:**
  - Users affected: `<count or %>`
  - Tenants affected: `<count or list>`
  - Duration: `<minutes>`
  - Financial impact: `<estimated $>`
  - SLO breach: `<which SLO, by how much>`

## Timeline

```
HH:MM  Trigger inicial (ex: webhook Asaas começou a falhar 5xx)
HH:MM  Alerta dispara (qual?)
HH:MM  IC engaged, thread #incidents aberta
HH:MM  Hipótese 1: <…>
HH:MM  Investigation step
HH:MM  Mitigation aplicada
HH:MM  Smoke test passa
HH:MM  Incidente declarado resolvido
HH:MM  Comunicação status page atualizada
```

## Root cause

**Imediata** (o que falhou primeiro):
> Ex: bug em webhook.processor.ts:124 fazia `await
> prisma.$transaction(...)` sem timeout; quando Prisma pool
> saturou, transaction ficou em hold por 5min, BullMQ marcou
> como stalled, retry duplicou pagamento já processado.

**Subjacente** (por que o sistema permitiu):
> Ex: ausência de timeout em transações Prisma é default;
> nossa convenção exige timeout em paths críticos mas não há
> lint rule. CHAOS-2 (PG latência) nunca foi executado em
> staging — não exercitamos esse path.

**Trigger** (o que acionou):
> Ex: pico de tráfego dia 10 (cobranças) coincidiu com query
> lenta em dashboard (sem cache em rota X — ainda não migrada).

## Detecção

- Quanto tempo até detectar? `<min>`
- Foi via alerta automático? Quais? Funcionaram?
- Foi via usuário? Como reportou?
- O que poderia ter detectado mais cedo?

## Resposta

- Tempo até IC engaged: `<min>`
- Tempo até primeira mitigação: `<min>`
- Comunicação: status page atualizada em `<min>`?
- Runbook usado: `<docs/runbooks/X.md>` ou improvisação?

## O que funcionou

Itens que ajudaram. Reforçar.

## O que falhou

Itens que pioraram. Investigar.

## Action items

| # | Ação | Owner | Due | Severity |
|---|---|---|---|---|
| 1 | Adicionar `tx.timeout` em paths críticos | @user | YYYY-MM-DD | Alto |
| 2 | Executar CHAOS-2 em staging | @user | YYYY-MM-DD | Alto |
| 3 | Criar lint rule para detectar `prisma.$transaction` sem timeout | @user | YYYY-MM-DD | Médio |
| 4 | Atualizar runbook DR com este cenário | @user | YYYY-MM-DD | Médio |
| 5 | Pós-mortem review session | @lead | YYYY-MM-DD | Baixo |

**Critério:** action items só são "done" quando shipped + validados,
não quando issue criada.

## Métricas

Antes / Durante / Depois (numeric):
- error_rate (5xx) %.
- p95 latency.
- queue_depth.
- affected users.

Anexar gráfico do Grafana se disponível.

## Lições aprendidas

3-5 takeaways generalizáveis. Estes viram input para:
- Runbooks novos.
- ADRs (se mudança arquitetural).
- Chaos scenarios novos.
- Onboarding (alerta/exemplo para futuros devs).

---

## Review

Postmortem é discutido em sessão dedicada (≤30min) com:
- IC + responder team.
- 1 revisor neutro (não envolvido no incidente).
- Foco em prevenção sistêmica.
- Action items aprovados, atribuídos, prazos definidos.

Postmortem aprovado é commitado em
`docs/postmortems/YYYY-MM-DD-<slug>.md` e linkado em readme de
postmortems.
