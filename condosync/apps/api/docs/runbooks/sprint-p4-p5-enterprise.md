# Runbook — Sprint P4/P5 (Enterprise & Sustentabilidade)

> Promoção da fase "plataforma escalável" → "arquitetura
> enterprise sustentável". Mudanças são **frameworks + caso
> canônico de cada padrão**, não migração massiva. A migração
> incremental segue cronograma documentado em cada README de
> bounded context / feature.

## Resumo das mudanças

| Item | Tipo | Impacto |
|---|---|---|
| Bounded contexts finance + sprint 1 (accounts) | Code | Médio — facade preserva API |
| 6 ADRs + RFC template | Docs | Onboarding + governance |
| SLOs + alert rules em código + CODEOWNERS | Ops/Gov | Bloqueia regressão |
| Page decomposition pattern + parcels skeleton | Code | Template para frontend |
| Profiling guide + chaos engineering manual + script | Docs | Resiliência validável |

## Diagnóstico atual

### Gargalos arquiteturais resolvidos
- ✅ Webhook race (outbox)
- ✅ Socket.IO multi-réplica (adapter)
- ✅ Workers compartilhando Redis (bullConnection())
- ✅ DB scaling — partição audit_logs framework

### Gargalos arquiteturais em curso
- 🔄 Finance god-service (sprint 1/6 concluído — accounts).
- 🔄 God-pages frontend (template + parcels esqueleto).
- ⏳ Repository layer (pattern documentado; aplicação progressiva).

### Riscos residuais documentados em ADRs/runbooks
- Backup PG: estratégia documentada, drill mensal pendente
  (responsabilidade humana).
- DR multi-region: postergado até SLO 99.9% ser exigido por
  contrato (ADR sugerido).
- Sentry tags: request-id existe; coverage de `userId`/
  `condominiumId` em todas as exceptions auditável via dashboard.

## Estratégia de promoção

### 1. Bounded contexts finance — sprint 1 (accounts)

```bash
# Sem migration, sem env nova. Deploy normal.
# Validação:
curl https://staging/api/v1/finance/accounts/<id>/balance
# Esperado: comportamento idêntico, mesma latência (cache mantido).
```

Em CADA sprint subsequente (transactions → charges →
reconciliation → ratios+billing → reporting):
1. Criar pasta + repo + service.
2. Migrar 1-2 métodos da facade.
3. Suite de testes do sub-context.
4. Atualizar `docs/MIGRATION.md` em finance/domain/.
5. PR pequeno (≤ 500 LOC) com review CODEOWNERS.

### 2. ADRs + RFC

Sem deploy. Processo organizacional ativo a partir do próximo PR
significativo:
- Mudança em arquitetura → propor RFC primeiro.
- Decisão tomada → criar ADR final.
- Lista em `docs/adr/README.md`.

### 3. SLOs em produção

Aplicar `ops/prometheus/slos.yml` no Prometheus de prod:
- **Prometheus Operator** (k8s): `kubectl apply -f` como
  `PrometheusRule`.
- **Standalone**: incluir em `prometheus.yml: rule_files:`.
- Validar com `promtool check rules` no CI (snippet em
  `ops/prometheus/README.md`).

Configurar branch protection no GitHub conforme
`apps/api/docs/BRANCH_PROTECTION.md` (se ainda não feito).

### 4. CODEOWNERS

Já em `.github/CODEOWNERS`. Branch protection do GitHub
**precisa** ativar "Require review from Code Owners" para que
seja efetivo.

### 5. Page decomposition

Padrão documentado. ParcelsPage tem esqueleto criado mas a
migração real (sprints A-D) acontece em PRs futuros — cada um
sem mudança visível ao usuário.

### 6. Profiling + Chaos

Profiling: aplicar quando alerta dispara (script de coleta
documentado).

Chaos: agendar primeiro CHAOS-1 (Redis down) em staging — 60s
de janela; documentar resultado em `docs/chaos-results/`.

## Estratégia de escala

| Carga | Status |
|---|---|
| **2× tráfego atual** | OK sem mudanças |
| **5×** | Aplicar `connection_limit=20` na DATABASE_URL |
| **10×** | Aplicar partição em vehicle_access_logs + notifications; Redis dedicado; CONTRACT phases concluídas |
| **50× (100 condos, 50k users)** | Read replica PG + sharding por tenant key (ADR futuro); serviço financeiro extraível (microserviço); multi-region |

## Estratégia para múltiplos times (próximos 12 meses)

CODEOWNERS já preparado para split:

```
/condosync/apps/web/src/pages/portaria/   @portaria-team
/condosync/apps/web/src/pages/finance/    @finance-team
```

Cada time vira owner de seu domínio:
- Portaria: parcels, visitors, vehicles, panic, access logs.
- Finance: charges, accounts, transactions, gateway, billing,
  ratios, reconciliation.
- Plataforma: auth, middleware, workers/bullmq, observability,
  CI/CD, infra.

Bounded contexts finance + page decomposition são pre-requisitos
para essa divisão funcionar — código que múltiplos times tocariam
fica isolado em sub-contextos próprios.

## Estratégia operacional

### Governança

- **Mudança arquitetural significativa** → RFC primeiro.
- **Mudança em segurança crítica** (auth, webhook, crypto) → 2
  reviewers via CODEOWNERS + branch protection.
- **Migration destrutiva** → expand/contract documentada
  (ADR-0006); squawk no CI.
- **SLO violado** → alerta automático; pós-mortem em ≤72h em
  `docs/postmortems/`.

### Observabilidade

- **Métricas**: Prometheus + Grafana. Rules versionadas em
  `ops/prometheus/`. Cardinalidade auditada.
- **Tracing**: OpenTelemetry export para Honeycomb/Tempo
  (env-driven).
- **Logs**: structured JSON via winston, request-id correlato
  via AsyncLocalStorage.
- **Erros**: Sentry com PII redact (cryptoVault, tokens, cookies,
  cpf, phone).

### Incidentes

Runbook em `docs/runbooks/backup-restore-dr.md`. Checklist do
on-call:
1. Confirmar não é flap (5min sintomas).
2. Abrir thread #incidents.
3. Definir IC (Incident Commander).
4. Comunicar status page <15min.
5. Aplicar mitigação (rollback, scale-up).
6. Confirmar recuperação (smoke test).
7. Encerrar após 30min de estabilidade.
8. Pós-mortem em ≤72h.

## Próximas sprints (não cobertas aqui)

### Curto prazo (próximos 30 dias)

- [ ] Sprint 2 finance — bounded context `transactions`.
- [ ] Sprint A → B parcels: extrair components/.
- [ ] Aplicar pattern `requireResourceMembership` nos 5 routers
  ainda não migrados.
- [ ] Configurar Honeycomb/Tempo OTel em staging.
- [ ] Aplicar `slos.yml` + `CODEOWNERS` no GitHub branch
  protection.
- [ ] Drill backup mensal (primeira execução).
- [ ] CHAOS-1 (Redis down) em staging.

### Médio prazo (90 dias)

- [ ] Finance bounded contexts sprints 2-6 concluídos.
- [ ] ParcelsPage decomposition completo (sprints A-D).
- [ ] UnitsPage + VisitorsPage migration iniciados.
- [ ] CONTRACT phases C3 (drop plaintext gateway) e C4 (FK NOT
  NULL).
- [ ] Partição vehicle_access_logs + notifications.
- [ ] CHAOS-2 a CHAOS-5 executados em staging.

### Longo prazo (6 meses)

- [ ] Read replica PG para dashboards.
- [ ] DR plan formalizado (RPO/RTO acordados em SLA).
- [ ] Multi-region option (ADR sugerido).
- [ ] Pentest externo focado em multi-tenant + LGPD.
- [ ] Time crescido: split de ownership via CODEOWNERS.
- [ ] Mutation testing (Stryker) nightly.
- [ ] Bundle analyzer no CI (alerta em regressão).
- [ ] PWA offline-first para portaria (criticidade operacional).
