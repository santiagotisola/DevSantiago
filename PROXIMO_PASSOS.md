# ✅ GUIA DE AÇÃO IMEDIATO

## 📋 ANTES DE INICIAR

**Você DEVE LER (nesta ordem):**

1. **RESUMO_EXECUTIVO_VISUAL.md** (5 min) — Visão geral
2. **ANALISE_COMPARATIVA_PROD_HOMOLOG.md** (20 min) — Detalhes técnicos
3. **DIAGRAMAS_ARQUITETURA_ROADMAP.md** (10 min) — Visualizações
4. ✅ **ESTE ARQUIVO** (10 min) — Guia de ação

**Total: 45 minutos para ficar 100% atualizado**

---

## 🎯 DECISÃO RECOMENDADA

```
┌──────────────────────────────────────────────────────────────┐
│                   ✅ RECOMENDAÇÃO FINAL                      │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  EXECUTAR CENÁRIO A + ROADMAP B/C                           │
│                                                               │
│  ✅ Fase 0-1 (Equiparação): 9-12 dias                       │
│  ✅ Fase 2-3 (Validação): 3-5 dias                          │
│  ✅ Go-live com monitoramento: Ongoing                      │
│                                                               │
│  Paralelamente:                                             │
│  ✅ Iniciar Micro-serviços (Cenário B): Q3 2026            │
│  ✅ Roadmap Long-term (Cenário C): Q4 2026 - Q1 2027      │
│                                                               │
│  💰 Orçamento Total 12 meses: R$ 2,5-4,5M                  │
│  📈 Revenue Target 12 meses: $2M+ ARR                      │
│  🏆 Target: #1 Brasil em SaaS Condominial                 │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## 📅 CRONOGRAMA (30 DIAS)

### ⏰ SEMANA 1: AUDITORIA & VALIDAÇÃO

#### Dia 1-2: Auditoria Segurança
- [ ] **Verificar JWT secrets**
  - Abrir `.env` produção
  - Abrir `.env` homologação  
  - **CRÍTICO**: Confirmam que `JWT_SECRET` e `JWT_REFRESH_SECRET` são DIFERENTES?
  - Se iguais: ⛔ **PARAR E REMEDIAR AGORA** (potencial breach)

- [ ] **Verificar ASAAS keys**
  - Produção: Chaves LIVE (start com `sk_live_...`)?
  - Homologação: Chaves SANDBOX (start com `sk_test_...`)?
  - **CRÍTICO**: Nunca usar live keys em dev!

- [ ] **Verificar Email provider**
  - Produção: `PROVIDER=resend` + `RESEND_API_KEY` setada?
  - Homologação: `PROVIDER=mailpit` + port 1025?
  - **CRÍTICO**: Se resend estiver em homolog, emails spam em massa!

- [ ] **Verificar MongoDB WhatsApp**
  - Produção: Conecta a prod Mongo?
  - Homologação: Conecta a dev Mongo (localhost)?
  - **CRÍTICO**: Sessões WhatsApp não devem misturar!

- [ ] **Documentar achados** em documento `AUDITORIA_SEGURANCA_RESULTADO.md`

#### Dia 3-5: Comparação Técnica

- [ ] **Schema Prisma**
  - Executar em produção: `ssh root@2.24.211.167 "cd /opt/condosync && npx prisma db seed --preview-feature"`
  - Executar em homologação: `npm run db:seed`
  - Comparar count de registros principais (Users, Units, Visitors, Charges)
  - Documentar divergências

- [ ] **Features ativas**
  - Ambientes: Listar módulos habilitados em `apps/api/src/modules/`
  - Contar endpoints: Prod vs Homolog
  - Verificar feature flags (se houver)
  - Resultado esperado: **29/29 idênticos**

- [ ] **Migrations pendentes**
  - Produção: `ssh root@2.24.211.167 "cd /opt/condosync && npx prisma migrate status"`
  - Homologação: `npx prisma migrate status`
  - Aplicar pendenentes se houver (ambas)

- [ ] **Build logs**
  - Produção: Nenhum erro TS? `docker logs <api-container> | grep error`
  - Homologação: `npm run build 2>&1 | grep error`
  - Zero errors esperado

#### Dia 6-7: Relatório de Riscos

- [ ] **Criar documento: `AUDITORIA_RESULTADO.md`**
  ```markdown
  # Resultado Auditoria

  ## Riscos Encontrados
  - [ ] Risco 1: ...
  - [ ] Risco 2: ...

  ## Ações Corretivas
  - [x] Ação 1: ...
  - [ ] Ação 2: ...

  ## Sign-off
  - Auditado por: [Nome]
  - Data: [Data]
  - Status: ✅ APPROVED | ⛔ BLOCKED
  ```

- [ ] **Apresentar** a Santiago/CTO
- [ ] **Obter aprovação** antes de prosseguir (checkpoint 1)

---

### ⏰ SEMANA 2-3: HARMONIZAÇÃO

#### Dia 8-10: Sincronizar Código

- [ ] **Pull latest main**
  ```bash
  cd /opt/condosync
  git fetch origin main
  git log --oneline -3  # Ver últimos commits
  ```

- [ ] **Aplicar migrations (ambas)**
  ```bash
  # Produção
  ssh root@2.24.211.167 "cd /opt/condosync && npx prisma migrate deploy"
  
  # Homologação
  npx prisma migrate deploy
  ```

- [ ] **Compilar (ambas)**
  ```bash
  # Produção
  docker build -t condosync-api:latest -f Dockerfile.api .
  
  # Homologação
  npm run build
  ```

- [ ] **Validar zero TS errors** ✅
  ```bash
  npx tsc --noEmit
  # Resultado esperado: 0 errors
  ```

- [ ] **Restart serviços**
  ```bash
  # Produção
  docker-compose up -d api web mobile
  
  # Homologação
  npm run dev:mobile &
  ```

#### Dia 11-14: Testes Ponta-a-Ponta (E2E)

**Script E2E (Playwright)**:
```bash
npm run test:e2e
```

Testes a validar (ambas):
- [ ] **Login**: atendimentoveredasbosque@gmail.com / 123456 → Redirecionado dashboard
- [ ] **Visitante**: Criar novo visitante → Validar QR gerado → Checar banco
- [ ] **Encomenda**: Registrar encomenda → Validar foto capturada → Notificar morador
- [ ] **Pagamento**: Gerar cobrança ASAAS → PIX/boleto disponível → Webhook callback
- [ ] **Chat**: Enviar mensagem → Broadcast avisos → Socket.IO notificação
- [ ] **Relatório**: Exportar financeiro → PDF gerado
- [ ] **2FA**: Habilitar TOTP → Validar QR code → Fazer login com 2FA
- [ ] **API Health**: GET /health → 200 OK (ambas)

**Resultado esperado**: Testes identicamente passando em prod e homolog

- [ ] **Documentar resultados** em `TESTES_E2E_RESULTADO.md`

#### Dia 15-18: Performance Baseline

- [ ] **Queries críticas**
  ```bash
  # Prod
  psql "postgresql://prod_url" <<EOF
  EXPLAIN ANALYZE SELECT * FROM "Charge" WHERE status='PENDING' LIMIT 100;
  EOF
  
  # Homolog
  psql "postgresql://localhost/condosync" <<EOF
  EXPLAIN ANALYZE SELECT * FROM "Charge" WHERE status='PENDING' LIMIT 100;
  EOF
  ```

- [ ] **Load test (100 concurrent users)**
  ```bash
  npx artillery quick --count 100 --num 100 http://localhost:3333/health
  ```

- [ ] **Benchmark API endpoints**
  - GET /api/units → <200ms ✅
  - GET /api/visitors → <300ms ✅
  - POST /api/parcels → <500ms ✅
  - GET /api/charges → <400ms ✅

- [ ] **Documentar** em `PERFORMANCE_BASELINE.md`
  ```markdown
  # Performance Baseline

  | Endpoint | P50 | P95 | P99 |
  |---|---|---|---|
  | GET /health | 10ms | 15ms | 20ms |
  | GET /api/units | 50ms | 150ms | 200ms |
  | ...
  ```

- [ ] **Presentation** a stakeholders (checkpoint 2)

---

### ⏰ SEMANA 4: LAUNCH & MONITORING

#### Dia 19-21: Go-live Validation

- [ ] **Pre-deployment checklist**
  - [ ] Database backups OK? (3-2-1 rule)
  - [ ] Monitoring setup? (Sentry, alerts)
  - [ ] Runbook documentado?
  - [ ] Rollback plan prepared?
  - [ ] Team on-call scheduled?

- [ ] **Deploy produção (CI/CD)**
  ```bash
  # Via Railway ou git push origin main
  git push origin main
  # Aguardar build (5-10 min)
  # Sanity checks automáticos rodam
  ```

- [ ] **Post-deploy validation**
  - [ ] API /health → 200 OK
  - [ ] Login funciona
  - [ ] Dashboard carrega <3s
  - [ ] Visitantes sync real-time
  - [ ] Cobrança ASAAS respondendo

- [ ] **Comunicado** ao time/clientes: "CondoSync go-live ✅"

#### Dia 22-28: Post-Launch Monitoring

- [ ] **Oncall setup** (24/7 durante 1 semana)
  - Dev A: Seg-Qua 8am-8pm
  - Dev B: Qua-Fri 8am-8pm
  - Dev C: Fri-Seg 8am-8pm

- [ ] **Diariamente verificar**:
  - [ ] Sentry: Erros críticos? (target: <1/hora)
  - [ ] Performance: P95 <200ms? (target: sim)
  - [ ] Users online: >10? (target: sim)
  - [ ] Transactions: Sem falhas > 5%? (target: sim)

- [ ] **Weekly report** (cada sexta)
  ```markdown
  # Week 1 Post-Launch

  - Uptime: 99.8% ✅
  - Errors (critical): 0 ✅
  - Performance (p95): 125ms ✅
  - Users: 15 ✅
  - Revenue: $xxx ✅

  - Issues resolvidos: X
  - Issues pendentes: Y
  - Feedbacks: Z

  Sign-off: [Dev Lead]
  ```

- [ ] **Escalação** se problema crítico:
  - Passo 1: Oncall dev investiga (30 min)
  - Passo 2: CTO envolvido se persiste (60 min)
  - Passo 3: Rollback se necessário (10 min)

#### Dia 29-30: Próxima Fase

- [ ] **Retrospectiva** com team
  - O que funcionou?
  - O que falhou?
  - Lições aprendidas?

- [ ] **Planning** Cenário B (Micro-serviços)
  - [ ] Selecionar primeiro módulo: FINANCE (maior ROI)
  - [ ] Arquiteto começa design
  - [ ] Sprint 0 planning

- [ ] **Presentation** do roadmap aos investidores/board
  - Métricas go-live
  - Revenue results
  - Next phases

---

## 🏁 CHECKPOINTS DE DECISÃO

### ✅ Checkpoint 1: Fim Semana 1 (Dia 7)

**Pergunta**: Há riscos segurança críticos?

**Cenários**:
- ✅ **VERDE** (0-1 risco): Prosseguir → Semana 2
- 🟡 **AMARELO** (2-3 riscos médios): Remediar + 1 dia extra
- ⛔ **VERMELHO** (4+ riscos críticos ou secrets expostos): **PARAR** e remediar antes

**Proprietário**: CTO
**Documentação**: `AUDITORIA_RESULTADO.md`

---

### ✅ Checkpoint 2: Fim Semana 2 (Dia 14)

**Pergunta**: Schema/features 100% sincronizados? Testes passando?

**Cenários**:
- ✅ **VERDE** (99%+ sync, 100% testes pass): Prosseguir → Performance
- 🟡 **AMARELO** (<99% sync): Debug + 2 dias extra
- ⛔ **VERMELHO** (Migrations falhando): **ROLLBACK** e investigar

**Proprietário**: Dev Lead (Backend)
**Documentação**: `TESTES_E2E_RESULTADO.md`

---

### ✅ Checkpoint 3: Fim Semana 3 (Dia 21)

**Pergunta**: Performance aceitável? P95 <200ms? Pronto para launch?

**Cenários**:
- ✅ **VERDE** (p95 <200ms, 0 bottlenecks críticos): GO-LIVE ✅
- 🟡 **AMARELO** (p95 200-300ms): Otimizar 2 queries + launch em 2 dias
- ⛔ **VERMELHO** (p95 >500ms, timeouts frequentes): **PARAR** e otimizar antes

**Proprietário**: CTO
**Documentação**: `PERFORMANCE_BASELINE.md`

---

### ✅ Checkpoint 4: Dia 28 (Post-Launch)

**Pergunta**: Produção stable <24h? Erros <0.1%?

**Cenários**:
- ✅ **VERDE** (Uptime 99%+, P95 <200ms, erros <0.1%): Prosseguir Cenário B
- 🟡 **AMARELO** (Uptime 98-99%): Monitorar + 1 semana extra
- ⛔ **VERMELHO** (Uptime <98% ou erros >1%): **ROLLBACK** e diagnosticar

**Proprietário**: Oncall Dev + CTO
**Documentação**: `WEEK1_POSTLAUNCH_REPORT.md`

---

## 📊 MÉTRICAS DE APROVAÇÃO

### Equiparação (Semana 1-3)

| Métrica | Baseline | Alvo | Status | Responsável |
|---|---|---|---|---|
| Feature Parity | 95% | 100% | [ ] | Dev Lead |
| Schema Sync | 90% | 100% | [ ] | DB Lead |
| API P95 Latency | 300ms | <200ms | [ ] | CTO |
| Test Pass Rate | 85% | 100% | [ ] | QA/Dev |
| Security Issues (critical) | 5 | 0 | [ ] | CTO |
| Data Consistency | - | >99.9% | [ ] | DB Lead |

### Go-Live (Dia 21+)

| Métrica | Baseline | Alvo | Status | Responsável |
|---|---|---|---|---|
| Uptime | - | 99%+ | [ ] | Oncall |
| P95 Latency | - | <200ms | [ ] | Oncall |
| Error Rate | - | <0.1% | [ ] | Oncall |
| Active Users | - | >5 | [ ] | PM |
| Revenue Generated | - | >$1k | [ ] | Finance |
| NPS Score | - | >60 | [ ] | PM |

---

## 🚨 LISTA DE DOCUMENTOS CRIADOS

**Você deve ter estes 5 arquivos:**

- ✅ `ANALISE_COMPARATIVA_PROD_HOMOLOG.md` — Análise técnica detalhada (11 seções)
- ✅ `RESUMO_EXECUTIVO_VISUAL.md` — Resumo visual para execs (11 seções)
- ✅ `DIAGRAMAS_ARQUITETURA_ROADMAP.md` — Diagramas Mermaid (11 visualizações)
- ✅ `PROXIMO_PASSOS.md` — Este arquivo (checklist 30 dias)
- ✅ `AUDITORIA_RESULTADO.md` — Resultado auditoria (CRIAR na Semana 1)

---

## 📞 ESCALAÇÃO & CONTATOS

### Oncall Setup (1 semana pós-launch)

| Dia | Dev | Horário | Contato |
|---|---|---|---|
| Seg-Ter | Dev A | 8am-8pm | whatsapp/sms/email |
| Ter-Qua | Dev B | 8am-8pm | whatsapp/sms/email |
| Qua-Qui | Dev A | 8am-8pm | whatsapp/sms/email |
| Qui-Sex | Dev B | 8am-8pm | whatsapp/sms/email |
| Sex-Seg | Dev C | 24h | whatsapp/sms/email |

### Escalação Critical

- **P1 (Critical)**: Pager duty (10 min SLA)
  - API offline
  - Database down
  - Security breach

- **P2 (High)**: Slack + 30 min SLA
  - Performance degradation >50%
  - Feature broken
  - Data corruption

- **P3 (Medium)**: Slack + 4 hour SLA
  - UI bugs
  - Slow queries
  - Non-critical errors

---

## ✨ BOAS PRÁTICAS

### Durante Implementação

- ✅ Commit frequentes com mensagens claras
- ✅ Pull requests para review (pair programming)
- ✅ Testes antes de deploy
- ✅ Documentação atualizada
- ✅ Backup antes de qualquer mudança crítica

### Comunicação

- ✅ Daily standup (10 min)
- ✅ Weekly retrospec (30 min)
- ✅ Checkpoint presentations (team + stakeholders)
- ✅ Post-launch reports (cliente)

### Monitoramento

- ✅ Alertas configurados (Sentry)
- ✅ Dashboard visible (team)
- ✅ Logs centralizados (morgan)
- ✅ Métricas tracked (spreadsheet)

---

## 🎉 PRÓXIMOS 30 DIAS

```
SEMANA 1  │ AUDITORIA & RISK
──────────┼─────────────────────
D1-D2     │ ✅ Verificar secrets
D3-D5     │ ✅ Comparar técnico
D6-D7     │ ✅ Relatório risco
          │ 📊 Checkpoint 1

SEMANA 2-3│ HARMONIZAÇÃO
──────────┼─────────────────────
D8-D10    │ ✅ Sincronizar código
D11-D14   │ ✅ Testes E2E
D15-D18   │ ✅ Performance baseline
          │ 📊 Checkpoint 2-3

SEMANA 4  │ GO-LIVE & MONITORING
──────────┼─────────────────────
D19-D21   │ ✅ Deploy & validação
D22-D28   │ ✅ 24/7 monitoring
D29-D30   │ ✅ Retrospectiva
          │ 📊 Checkpoint 4
          │ 🚀 Próxima fase

TOTAL: 30 dias → Sistema sincronizado, validado, go-live ✅
```

---

## 🎯 ASSINATURA

```
Plano aprovado por:

□ Santiago (Founder/CTO) ______________________ Data: ___
□ Product Manager _____________________________ Data: ___
□ Finance/CFO ________________________________ Data: ___

Implementação iniciada em: ___________________
Status atual: [ ] Não iniciado [ ] Fase 1 [ ] Fase 2 [ ] Completo
```

---

**Pronto para começar? Faça o checkpoint 1 agora! ✅**
