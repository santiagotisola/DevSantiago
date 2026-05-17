# ✅ CHECKLIST: HOMOLOGAÇÃO vs PRODUÇÃO
**Objetivo**: Validar que todas as alterações estão ok antes e depois do deploy

---

## 🔴 HOMOLOGAÇÃO (LOCAL) - ESTADO ATUAL

### 1. Git & Repositório
- [x] Branch main ativo
- [x] Commit d0c5139c criado localmente
- [x] Push para origin/main completado
- [x] Sem mudanças pendentes (`git status` clean)
- [x] 74 arquivos alterados no commit

### 2. Containers Docker
- [x] API (port 3333) - UP & HEALTHY
- [x] Web (port 80) - UP & HEALTHY
- [x] Mobile (port 5174) - UP & HEALTHY
- [x] PostgreSQL (port 5432) - UP & HEALTHY
- [x] Redis (port 6379) - UP & HEALTHY
- [x] Mailpit (port 8025) - UP & HEALTHY
- [x] MongoDB (port 27017) - UP & HEALTHY

### 3. Código - Dark Theme
- [x] AuthLayout.tsx - Dark theme aplicado
- [x] MobileLayout.tsx - Dark theme aplicado
- [x] BottomNav.tsx - Dark theme aplicado
- [x] MobileHeader.tsx - Dark theme aplicado
- [x] LoginPage.tsx - Dark form inputs
- [x] HomeGrid.tsx - Dark grid cards
- [x] PortariaDashboard.tsx - Dark cards
- [x] VisitantesPortaria.tsx - Dark visitor cards
- [x] PanicoPage.tsx - Dark background
- [x] PerfilPage.tsx - Dark profile fields

### 4. Código - Axios Fix (CRÍTICO)
- [x] services/api.ts - Deadlock fix implementado
- [x] `isRefreshRequest` check adicionado
- [x] Spinner infinito testado & eliminado
- [x] Redirect to login quando token null

### 5. Novas Features
- [x] VeiculosPortaria.tsx criado
- [x] PanicAlertsPage.tsx criado
- [x] CondominiaBrandingForm.tsx criado
- [x] WhatsApp module (8 arquivos) criado

### 6. Database
- [x] Migration 20260516023226 criada
- [x] Schema.prisma atualizado (heroImageUrl)
- [x] seed-auto.js atualizado
- [x] seed-base.js atualizado
- [x] seed.ts atualizado

### 7. Testes Funcionais (Homologação)
- [x] Login: Credenciais aceitadas
- [x] Visitantes: 8 registros carregam
- [x] Encomendas: 8 registros carregam
- [x] Status filters: Funcionam
- [x] Profile: Dados carregam
- [x] Panic button: Acessível
- [x] Dark theme: Cores corretas
- [x] Console: Sem erros críticos
- [x] API health: /health retorna 200 OK

---

## 🟠 PRODUÇÃO (VPS 2.24.211.167) - ESPERADO APÓS DEPLOY

### Pré-Requisitos (Antes de Deploy)
- [ ] Backup do banco feito: `pg_dump condosync > backup_pre_deploy_$(date).sql`
- [ ] VPS acessível via SSH: `ssh root@2.24.211.167`
- [ ] Disco com espaço: `df -h` > 20GB livre
- [ ] Git instalado: `git --version`
- [ ] Docker rodando: `docker ps`

### 1. Git & Repositório (Esperado)
- [ ] `git pull origin main` - Fast-forward 74 files
- [ ] Branch main ativo
- [ ] Commit d0c5139c no HEAD
- [ ] Sem conflitos
- [ ] `git status` retorna clean

### 2. Migrations (Esperado)
- [ ] `npx prisma migrate deploy` - 1 migration applied
- [ ] Schema atualizado com heroImageUrl
- [ ] Sem erros de constraint
- [ ] Dados preservados

### 3. Containers Docker (Esperado)
- [ ] `docker compose build api web mobile` - sucesso
- [ ] `docker compose up -d` - 3 containers UP
- [ ] API port 3333 respondendo
- [ ] Web port 80 respondendo
- [ ] Mobile port 5174/80 respondendo

### 4. API Health (Esperado)
- [ ] `curl http://localhost:3333/health` - 200 OK
- [ ] Response: `{"status":"ok"}`
- [ ] Logs sem errors: `docker logs api`

### 5. Funcionalidades (Esperado)
- [ ] Login: atendimentoveredasbosque@gmail.com / Admin@2026
- [ ] Dashboard carrega
- [ ] Visitantes: 8 registros em <2s
- [ ] **CRÍTICO**: Sem spinner infinito (axios fix ativo)
- [ ] Encomendas: 8 registros em <2s
- [ ] Status filters funcionam
- [ ] Dark theme visível no mobile

### 6. Web Interface (Esperado)
- [ ] https://condosync.app/ carrega
- [ ] Dashboard KPIs visíveis
- [ ] Sidebar navegação ok
- [ ] Sem 404 ou blank pages

### 7. Mobile PWA (Esperado)
- [ ] https://condosync.app/mobile/ carrega
- [ ] Dark theme: bg-slate-800, text-white
- [ ] Cards: border-slate-700
- [ ] Buttons: Cores corretas
- [ ] Offline mode: Service worker ativo

### 8. Logs & Monitoring (Esperado)
- [ ] `docker logs api` - sem errors
- [ ] `docker logs web` - sem errors
- [ ] `docker logs mobile` - sem errors
- [ ] Performance: <2s response time

### 9. Data Integrity (Esperado)
- [ ] 70 unidades presentes
- [ ] 44 usuários presentes
- [ ] Sem duplicatas
- [ ] Relacionamentos intactos

---

## 🎯 VALIDAÇÃO PASSO A PASSO

### Passo 1: PRÉ-DEPLOY (Agora - Homologação)
```bash
✅ [x] Git status clean
✅ [x] All containers running
✅ [x] All tests passing
✅ [x] No console errors
```

### Passo 2: SSH CONECTAR
```bash
[ ] ssh root@2.24.211.167
[ ] Autenticação bem-sucedida
[ ] Prompt # aparece
```

### Passo 3: GIT PULL
```bash
[ ] cd /opt/condosync/condosync
[ ] git pull origin main
[ ] Output: "74 files changed"
[ ] Sem conflitos
```

### Passo 4: PRISMA MIGRATE
```bash
[ ] cd apps/api
[ ] npx prisma migrate deploy
[ ] Output: "1 migration deployed"
[ ] Sem erros de banco
```

### Passo 5: DOCKER BUILD
```bash
[ ] docker compose build api web mobile
[ ] Sucesso em <5 min
[ ] No build errors
[ ] Imagens tageadas corretamente
```

### Passo 6: DOCKER UP
```bash
[ ] docker compose up -d --no-deps api web mobile
[ ] docker compose ps: 3 containers UP
[ ] Aguardar 30s para healthy
```

### Passo 7: HEALTH CHECK
```bash
[ ] curl http://localhost:3333/health
[ ] Response: 200 OK
[ ] JSON válido
```

### Passo 8: NAVEGADOR TEST
```bash
[ ] https://condosync.app/ carrega
[ ] Login funciona
[ ] Dashboard visível
[ ] Visitantes carregam
[ ] Encomendas carregam
[ ] Sem spinner infinito
```

### Passo 9: FINAL VALIDATION
```bash
[ ] docker logs api | tail -50 (sem errors)
[ ] docker logs web | tail -50 (sem errors)
[ ] docker logs mobile | tail -50 (sem errors)
[ ] Tudo ok para produção
```

---

## 🚨 SINAIS DE ALERTA

Se você ver qualquer um desses durante o deploy, **PARE e faça rollback**:

```
❌ git pull: CONFLICT markers
❌ git pull: Permission denied
❌ prisma migrate: migration failed
❌ docker build: Build error
❌ docker compose: CrashLoopBackOff
❌ API: 500 Internal Server Error
❌ curl health: Connection refused
❌ Browser: Blank page / 404
❌ Console: TypeError, axios error
❌ Logs: FATAL ERROR
```

**Rollback comando rápido**:
```bash
git revert HEAD --no-edit
git push origin main
docker compose up -d --no-deps api web mobile
```

---

## 📊 RESUMO DE STATUS

### Homologação (Agora)
```
✅ Código:     OK (74 files, tested)
✅ Docker:     OK (7 containers, all healthy)
✅ DB:         OK (70 units, 44 users)
✅ APIs:       OK (< 2s response time)
✅ UI:         OK (Dark theme, no errors)
✅ Git:        OK (Push successful)
```

### Produção (Esperado após deploy)
```
⏳ Código:     [IN PROGRESS] git pull origin main
⏳ Migrations: [WAITING] npx prisma migrate deploy
⏳ Docker:     [WAITING] docker compose up
⏳ Health:     [WAITING] health check
⏳ UI:         [WAITING] browser validation
```

---

## ✅ ASSINATURA DE VALIDAÇÃO

**Validado em Homologação por**: Sistema Automático  
**Data**: 16 de maio de 2026  
**Ambiente**: Local Docker  
**Status**: ✅ PRONTO PARA PRODUÇÃO  

**Próximo**: Aguardando execução de deploy em produção (VPS 2.24.211.167)

---

## 📞 COMANDOS RÁPIDOS DE REFERÊNCIA

```bash
# SSH Conectar
ssh root@2.24.211.167

# Git Pull
cd /opt/condosync/condosync && git pull origin main

# Prisma Deploy
cd apps/api && npx prisma migrate deploy

# Docker Build & Up
docker compose build api web mobile
docker compose up -d --no-deps api web mobile

# Health Check
curl http://localhost:3333/health

# View Logs
docker compose logs --tail=50 api
docker compose logs --tail=50 web
docker compose logs --tail=50 mobile

# Rollback
git revert HEAD --no-edit && git push origin main
```

---

**FIM DO CHECKLIST**

Quando estiver pronto em produção, execute todos os itens desta seção:
"🟠 PRODUÇÃO (VPS 2.24.211.167) - ESPERADO APÓS DEPLOY"
