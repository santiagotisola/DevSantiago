# Roadmap 12-24 meses — Estratégia técnica

> Documento vivo. Revisar a cada trimestre.
> Última revisão: 2026-05-08.
>
> Objetivo: orientar onde investir esforço de engenharia para
> que sistema continue saudável conforme cresce em volume e em
> tamanho de time.

## Premissas

- Estágio atual: ~5-20 condomínios, 1-2 devs, ~1k-5k usuários
  ativos.
- Crescimento target: 100+ condomínios, 5-10 devs, 50k+ usuários
  em 24 meses.
- SaaS B2B (cobra do condomínio, não do usuário final).
- Razões da existência do produto: gestão financeira + portaria
  + comunicação. Receita primária via integração de
  pagamentos.

## Sinais de saturação a monitorar

Triggers para próxima evolução:

| Sinal | Trigger | Próxima evolução |
|---|---|---|
| Prisma pool waiting > 0 sustained | Em 5xx ocasional | `?connection_limit=20` |
| Redis connections > 25 | Free tier saturando | Redis dedicado |
| audit_logs > 50M rows | Query >2s em filtros | Partição lifecycle ativa |
| `bullmq_queue_depth > 1000` em pico | Workers não acompanham | Worker autoscaling |
| p95 dashboard > 500ms sustained | Cache não basta | Read replica PG |
| Time > 5 devs | PRs em fila >24h | Domain ownership split |
| MTTR SEV1 > 2h | Runbooks insuficientes | Chaos cadence aumentada |
| Onboarding > 7 dias | Docs/scaffolding insuficiente | Investir DX |

## Roadmap por horizonte

### Próximos 90 dias (executável agora)

**Tema: completar a fundação enterprise.**

| Item | Sprint | Owner | Outcome |
|---|---|---|---|
| Bounded contexts finance — sprints 4-6 (reconciliation, ratios+billing, reporting) | 1 | Lead | finance.service ≤200 LOC; testabilidade real |
| ParcelsPage decomposition completo | 1 | Frontend | Padrão replicável; LOC saudável |
| UnitsPage + VisitorsPage decomposition | 2-3 | Frontend | 3 god-pages eliminadas |
| ESLint architectural rules: flip warn → error em paths legados | 2 | Lead | Boundaries enforced no CI |
| Configurar Honeycomb/Tempo OTel em prod | 1 | SRE | Tracing distribuído ativo |
| Aplicar `slos.yml` Prometheus em prod | 1 | SRE | Burn-rate alerts ativos |
| Branch protection GitHub conforme `BRANCH_PROTECTION.md` | 1 | Lead | CI bloqueia merge |
| Drill backup mensal — primeira execução | 1 | SRE | RPO/RTO validados |
| CHAOS-1 (Redis down) primeira execução | 2 | SRE | Resiliência validada |
| CHAOS-3 (Worker crashed) | 2 | SRE | Stalled detection validada |
| CONTRACT phase C3 (drop plaintext gateway) | 3 | Backend | Schema limpa |
| CONTRACT phase C4 (SET NOT NULL FKs) | 3 | Backend | Integridade referencial real |
| Partição vehicle_access_logs + notifications + webhook_events | 3 | Backend | DB scaling preparado |
| Prometheus rules + dashboards Grafana commitados | 2 | SRE | Alerts versioned |

### 90-180 dias (próximo trimestre)

**Tema: preparar 5-10× crescimento.**

| Item | Sprint | Outcome |
|---|---|---|
| `?connection_limit=20` Prisma | 4 | Pool saturação prevenida |
| Redis dedicado (sair de free tier compartilhado) | 4-5 | Headroom para 10× |
| Cache em mais aggregates (getMonthlyBalance, dashboards) | 5 | p95 dashboards < 200ms |
| Mutation testing (Stryker) nightly em auth/finance | 6 | Cobertura real validada |
| ADRs 7-12 documentando próximas decisões | contínuo | Memória organizacional |
| RFC 1: domain events pattern (BullMQ pub/sub interno) | 6 | Reduzir acoplamento finance ↔ notifications |
| Bundle analyzer no CI com regression alert | 5 | Frontend bundle controlado |
| axe-core/playwright em e2e/ | 6 | a11y validada |
| PWA offline-first portaria | 6-7 | Operação resiliente |

### 6-12 meses

**Tema: múltiplos times + escala arquitetural.**

| Item | Outcome |
|---|---|
| Read replica PG para dashboards/relatórios | p95 sustained low em condomínio grande |
| Domain ownership split (CODEOWNERS por área quando time crescer) | Times autônomos |
| Squad de portaria + squad de finance + squad de plataforma | Especialização sustentável |
| RFC: extração do finance como microserviço (se justificado por load) | Isolamento operacional |
| Pentest externo + LGPD compliance review | Compliance enterprise |
| Bug bounty interno (pagamento por achado de IDOR/RCE) | Segurança contínua |
| API pública (terceiros consumindo) com rate-limit/auth próprio | Ecosystem |
| Multi-region readiness (ADR formal) — execução conforme contrato exigir | DR avançado |
| Particionamento avançado (sub-partição por tenant em condomínios grandes) | Tenant isolation |

### 12-24 meses

**Tema: plataforma como produto interno + escala enterprise.**

| Item | Outcome |
|---|---|
| Internal Developer Platform (IDP) — self-service para criar features novas | DX em escala |
| Service catalog (Backstage ou similar) | Inventory de serviços + ownership claro |
| Política de SLO formal por domínio (cada squad tem SLO próprio) | Accountability distribuída |
| Multi-tenant routing (sharding por tenant key se PG saturar) | Escala horizontal |
| Read-only API endpoints públicos com OAuth | Integrações enterprise |
| Marketplace de integrações (parceiros, prestadores) | Receita secundária |
| Chaos engineering automatizado (Litmus/Chaos Mesh) | Resiliência contínua |
| Observability cost optimization (sampling avançado, retention tiers) | Custo operacional controlado |

## Estratégia organizacional

### Crescimento do time

**Próximos 6 meses (1-3 devs):**
- 1 sênior backend (lead atual continua).
- 1 frontend dedicado.
- 1 SRE/DevOps part-time.

**6-12 meses (3-7 devs):**
- Squad portaria (2): backend + frontend.
- Squad finance (2): backend + frontend.
- Plataforma (2): SRE + arquiteto.
- 1 ESec/AppSec opcional.

**12-24 meses (7-15 devs):**
- Squads consolidados.
- Squad de plataforma cresce para 3-4.
- Engineering Manager(s) por área.
- Tech Lead por squad.

### Domain ownership futuro

Bounded contexts já preparam o terreno:

```
auth + multi-tenant         → Plataforma
webhook + integration       → Plataforma
observability + ci/cd + ops → Plataforma
finance domain              → Squad Finance
  ├─ accounts, transactions, charges
  ├─ ratios, billing
  └─ reconciliation, reporting, gateway
portaria domain             → Squad Portaria
  ├─ parcels, visitors, vehicles
  ├─ panic, access logs
  └─ chat (comunicação)
condominium operations      → Squad Operações
  ├─ residents, units, dependents
  ├─ tickets, lost-and-found
  └─ assemblies, polls, announcements
```

CODEOWNERS migra para refletir essa estrutura quando squads
existirem.

### Documentação organizacional

| Documento | Escopo | Owner |
|---|---|---|
| ADRs | Decisões arquiteturais | Cada autor |
| RFCs | Propostas em discussão | Cada autor |
| Runbooks (operacional) | Procedimentos repetíveis | SRE |
| Onboarding | DX | Plataforma |
| PR guidelines | Processo | Lead técnico |
| Roadmap (este doc) | Estratégia | CTO/lead técnico |
| Postmortems | Pós-incidente | IC do incidente |
| Runbooks de domínio | Cada squad | Squad lead |

## Riscos estratégicos

### Architecture entropy

**Sintoma:** features novas adicionam complexidade sem reduzir
debt; cada PR fica >500 LOC; review fica >24h em fila.

**Prevenção:**
- 20% de cada sprint para tech debt.
- Lint architectural rules.
- ADRs para mudanças significativas (impede shortcuts não
  discutidos).

### Knowledge silo

**Sintoma:** apenas 1 dev sabe como X funciona; quando ele sai
de férias, time trava em incidente.

**Prevenção:**
- Pair programming em paths críticos.
- Runbooks atualizados (review trimestral).
- Postmortem com sessão pública (todos veem).
- Rotação de oncall obrigatória (todos os devs já lidaram com
  incidente em algum momento).

### Vendor lock-in não-consciente

**Sintoma:** mudar de Railway para AWS exige 6 meses; mudar de
Asaas vira reescrita de 3 módulos.

**Prevenção:**
- Gateway abstraction (já em `services/gateway/types.ts`).
- Cloud-agnostic Dockerfile (já feito).
- ADR formal antes de adotar novo serviço externo crítico.

### Alert fatigue

**Sintoma:** PagerDuty toca 3× por dia; oncall ignora; incidente
real escapa.

**Prevenção:**
- Reclassificar alertas após cada incidente (postmortem item).
- Alertas warn vs page bem definidos.
- Métrica: % de alertas page que viraram action vs ruído.

### Burnout do core team

**Sintoma:** mesmas 1-2 pessoas resolvendo tudo; PRs se acumulam;
qualidade despenca.

**Prevenção:**
- Compensação clara para oncall.
- Onboarding eficiente (≤5 dias) — distribui carga rápido.
- 20% tech debt + 1 dia/semana de "pet project" (manter
  curiosidade).

## Decisões não-tomadas (consciente)

Itens que NÃO vamos fazer agora, registrados para evitar
revisitar sem novidade:

| Decisão | Razão de NÃO fazer | Quando reconsiderar |
|---|---|---|
| Microserviços | Custo operacional 5×; estágio errado de produto | >10 devs ou bottleneck claro de boundary |
| Multi-region | SLO atual não exige; custo 2-3× | Contrato de cliente exigir 99.99% |
| Cassandra/MongoDB | Postgres aguenta; perde transações ACID | Volume > 50M rows ativos sustentado |
| GraphQL | REST + zod cobrem; complexidade desnecessária | Cliente externo exigir flexibilidade de query |
| Kubernetes próprio | Railway gerencia bem | Custo de Railway > $5k/mês ou requisitos de compliance |

## Métricas de sucesso (12 meses)

Saudável se:
- API HTTP 99.9% availability mensal.
- p95 < 500ms em rotas CRUD.
- MTTR SEV1 < 2h.
- Zero IDOR cross-tenant em produção.
- Zero perda financeira por bug.
- Onboarding ≤ 5 dias.
- Tech debt budget 15-25% gasto consistentemente.
- Cobertura de testes ≥ 70% nos módulos críticos.

Sinais de alerta (revisar este roadmap):
- Qualquer SLO violado por >2 trimestres consecutivos.
- Crescimento de time freou (turnover ou contratação difícil).
- Incidentes SEV1 > 1/mês.
- Dev senior > 50% do tempo em "manutenção" vs feature.
