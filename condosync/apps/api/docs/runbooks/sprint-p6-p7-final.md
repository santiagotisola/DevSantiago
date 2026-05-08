# Runbook — Sprint P6/P7 (Execução final & Sustentabilidade)

> Última camada de maturação enterprise. Mudanças são incrementais
> e sustentam evolução de longo prazo (12-24 meses).

## Resumo das mudanças

| Item | Tipo | Risco | Esforço |
|---|---|---|---|
| Bounded contexts finance — sprints 2 & 3 (transactions + charges parcial) | Code | Baixo (facade preserva API) | 2h |
| ESLint architectural rules | Lint | Nenhum (warn em legacy) | 30min |
| Plop generators (bounded-context + módulo) | DX tooling | Nenhum | 1h |
| PR guidelines + ONBOARDING + POSTMORTEM template + OPERATIONAL_GOVERNANCE | Docs | Nenhum | DX |
| Roadmap 12-24M consolidado | Docs estratégia | — | — |

## Promoção

### 1. Bounded contexts (transactions + charges)

Sem migration, sem env nova. Deploy normal. Validação:

```bash
# Smoke test em staging:
curl https://staging/api/v1/finance/accounts/<id>/transactions
curl https://staging/api/v1/finance/charges/condominium/<id>
# Esperado: comportamento idêntico, mesma latência (cache mantido).
```

### 2. ESLint rules

CI já roda lint. Para cada novo PR:
- Em `domain/**`: violações de boundary são ERRO — bloqueia merge.
- Em legacy: warn — não bloqueia mas aparece no PR review.

Para flippar warn → error em path legado:
- Migrar TODO o módulo primeiro (eliminar imports proibidos).
- Adicionar override em `.eslintrc.cjs` mudando `warn` → `error`.

### 3. Plop generators

```bash
cd apps/api
npm install                           # se não tiver plop
npm run scaffold:context              # interativo
npm run scaffold:module
npx plop bounded-context billing      # direto
```

Templates em `.plop/*.hbs`. Adicionar novos generators conforme
necessário.

## Sprint cadence sugerida (próximos 90 dias)

### Sprint 4 (próximas 2 semanas)
- Bounded contexts finance sprint 4: `reconciliation`.
- ParcelsPage decomposition sprint B (extrair components).
- Branch protection no GitHub conforme BRANCH_PROTECTION.md.
- OTel exporter Honeycomb/Tempo em staging.

### Sprint 5
- Bounded contexts finance sprint 5: `ratios` + `billing`.
- ParcelsPage sprint C (extrair dialogs).
- UnitsPage sprint A (api + hooks).
- CHAOS-1 primeiro execução.

### Sprint 6
- Bounded contexts finance sprint 6: `reporting`.
- ParcelsPage sprint D (composição final).
- VisitorsPage sprint A.
- CONTRACT C3 (drop plaintext gateway).

### Sprint 7+
- UnitsPage e VisitorsPage sprints B-D.
- CONTRACT C4 (FK NOT NULL).
- Partição vehicle_access_logs + notifications + webhook_events.

## Cultura operacional ativada

A partir desta sprint:
- **Toda** mudança arquitetural significativa exige RFC ou ADR.
- **Todo** PR segue PR_GUIDELINES (template, tamanho, review).
- **Todo** dev novo segue ONBOARDING (5 dias).
- **Todo** incidente >SEV3 gera postmortem em ≤72h.
- **Cadência operacional** documentada em
  OPERATIONAL_GOVERNANCE — agendar calendar invites
  recorrentes.

## Ownership atual

CODEOWNERS hoje aponta tudo para owner único. Quando time
crescer (ver ROADMAP_12_24M.md), atualizar para refletir squad
boundaries:

```
/condosync/apps/api/src/modules/portaria/   @portaria-team
/condosync/apps/api/src/modules/finance/    @finance-team
/condosync/apps/api/src/middleware/         @platform-team
/condosync/apps/api/src/config/             @platform-team
```

## Métricas a acompanhar

```yaml
# Engenharia (semanal, dashboard interno)
pr_open_to_merge_p50: < 24h
pr_loc_p50: < 400
review_response_p95: < 24h
ci_pipeline_duration_p95: < 10min
onboarding_to_first_pr_p50: ≤ 5 dias

# Plataforma (Prometheus)
http_5xx_rate{slo="api_availability"}: < 0.1%
api_request_duration_seconds{quantile="0.95"}: < 500ms
bullmq_queue_depth_max{queue="webhook-processor"}: < 100
bullmq_leader_renewal_total{result="lost"}: 0
idor_guard_decisions_total{result="deny_cross_tenant"}: spike alert

# Negócio (revisar trimestral)
condominios_ativos: crescer
mau_users: crescer
webhook_processed_total: crescer linear com receita
```

## Próximo runbook

Quando time crescer >3 devs, criar:
`docs/runbooks/team-onboarding-squad.md` — processo para
onboarding de squad inteiro novo (em vez de dev individual).
