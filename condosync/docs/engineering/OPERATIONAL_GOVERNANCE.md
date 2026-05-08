# Operational Governance

> Frequências, responsabilidades e processos operacionais.
> **Calendar invites recorrentes** com nome do owner — nunca
> deixar para "quando der".

## Cadências obrigatórias

| Atividade | Frequência | Owner | Duração | Skip allowed? |
|---|---|---|---|---|
| Backup drill (restore staging) | Mensal | SRE | 4h | Não — agendar reposição |
| CHAOS-1 (Redis down) | Mensal | SRE | 2h | Não |
| CHAOS-3 (Worker crashed) | Mensal | SRE | 1h | Não |
| CHAOS-5 (Spike load) | Mensal | SRE | 2h | Não |
| CHAOS-2 (PG latency) | Trimestral | SRE | 4h | Janelas estritas |
| CHAOS-4 (Asaas slow) | Trimestral | SRE | 2h | — |
| Dependency upgrade window | Mensal | Plataforma | 4h | — |
| Postmortem review (se incidente no mês) | Conforme | Time afetado | 30min | — |
| ADR review (open ADRs >2 sprints) | Trimestral | Arch | 1h | — |
| SLO review + error budget recalc | Trimestral | Lead+SRE | 1h | — |
| Threat modeling refresh | Anual | Sec+Arch | 4h | — |
| DR drill completo (failover) | Anual | All | 8h | — |
| Pentest externo | Anual | Externo | — | — |

## Incident response — quem responde

### On-call rotation

- **Primary on-call:** rotaciona semanalmente entre seniores+.
  Plataforma SaaS pequena (1 dev): on-call é "todo o tempo".
  Quando time crescer >3 devs: rotacionar.
- **Secondary on-call:** backup do primary. Mesma rotação,
  shift +1.
- **Compensação:** dia de descanso na semana seguinte ao
  shift de oncall, OU bonificação financeira (definir com RH).

### Severity levels

| SEV | Critério | Response time | Escalonamento |
|---|---|---|---|
| **SEV1** | Sistema down OR perda financeira ativa OR vazamento de dados | <15min | IC + lead + CTO/founder |
| **SEV2** | Funcionalidade crítica degradada (>10% usuários) | <30min | IC + secondary |
| **SEV3** | Funcionalidade não-crítica degradada OR <10% usuários | <2h | IC apenas |
| **SEV4** | Bug não-bloqueante | <24h | Backlog |

### Pager fatigue prevention

- Alerta "warn" → Slack apenas (não acorda).
- Alerta "page" → PagerDuty/Opsgenie (acorda).
- Métricas com cardinalidade controlada (ver
  `ops/prometheus/README.md`).
- Action item após cada incidente: "este alerta deveria ter
  disparado page ou warn?" Reclassificar.

## Tech debt governance

### Visibilidade

Tech debt items são tracked como GitHub issues com label
`tech-debt`. Cada item tem:
- Severidade (alta/média/baixa).
- Esforço (P, M, G).
- Trigger (quando vira problema).
- Owner.

### Budget

20% de cada sprint (1 dia/semana/dev) reservado para tech
debt. Itens são puxados do backlog `tech-debt` em ordem de
severidade × esforço. Se o budget não é gasto em tech debt,
RAUM (re-aplicar à próxima sprint) — não vira "feature".

### Trigger forçado

Algumas debt items disparam trabalho imediato:
- Vulnerabilidade CVE high+ na dep → hotfix.
- SLO violado por debt conhecido → próximo sprint inteiro nele.
- Regressão em performance >20% baseline → mesmo.

## Release governance

### Cadência

- **API + Web:** continuous deployment (CD via Railway).
- **Mobile:** versionado, release manual quando estável.

### Release gates (já em CI)

PR para `main` exige todos:
- Lint.
- Typecheck.
- Test unit.
- Test IT (testcontainers).
- Test web build.
- Docker build.
- Dependency review (PR-only).
- ≥1 approval CODEOWNERS.

Após merge para `main`:
- Railway deploya automaticamente.
- Smoke test pós-deploy roda.
- Sentry monitora 5xx por 30min — alerta automático em spike
  >baseline+50%.

### Rollback

- **Code-only:** revert do commit + Railway redeploy. <5min.
- **Migration destrutiva:** ver `docs/MIGRATIONS.md`. Caso
  caia em incidente, runbook tem `prisma migrate resolve
  --rolled-back`.
- **Feature flag emergency:** `redis-cli HSET feature_flags
  <flag> false`. <30s.

## Dependency management

### Atualização

- **Renovate** (ou Dependabot) configurado para PRs semanais.
- Patch versions: auto-merge se CI verde.
- Minor versions: review manual.
- Major versions: RFC se afetar arquitetura (Prisma, Express,
  Vite).

### Auditoria de segurança

- `npm audit --audit-level=high` no CI (PR-only).
- Critical CVE → hotfix imediato.
- High CVE → próximo sprint.
- Medium/low CVE → backlog.

### Lockfile drift

- `npm ci` em CI (não `npm install`).
- Dev local também `npm ci` após pull.
- Commits que mudam `package-lock.json` precisam de motivo no
  PR description.

## Documentation governance

### Living docs

- Runbooks são source of truth (não wiki que ninguém lê).
- Cada runbook tem owner + last-reviewed date.
- Trimestral review: cada owner valida que runbook funciona
  contra produção atual.

### Stale docs detection

```bash
# Roda mensalmente, lista runbooks não tocados há >90d
git log --pretty=format:"%h %ad %s" --since="90 days ago" \
  --diff-filter=A docs/ | sort -u
```

Adicionar `<!-- last-reviewed: YYYY-MM-DD -->` no top de cada
runbook. Stale → owner refresh ou archiva.

## Métricas de saúde da engenharia

Trimestral, owner do platform (não delegar):

| Métrica | Target |
|---|---|
| Tempo médio de PR aberto até merge | < 24h |
| % de PRs com revisão em <24h | > 80% |
| % de PRs ≤400 LOC | > 70% |
| Cobertura de testes (per-path crítico) | ≥70% |
| Tempo de onboarding (zero ao primeiro PR) | ≤5 dias |
| MTTR (incidentes SEV1) | <2h |
| % de incidentes com runbook usado | >50% |
| Action items de postmortem completados em 30d | >80% |
| Tech debt budget gasto (% sprint) | 15-25% |

Acima do target = saudável. Abaixo = investigar com curiosidade,
não punição.
