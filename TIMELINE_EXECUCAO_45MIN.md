# 🎬 TIMELINE DE EXECUÇÃO - Sincronização Produção = Homologação

**Preparado**: 15 de maio de 2026 18:30 UTC  
**Tempo Total Estimado**: 45 minutos  
**Dificuldade**: ⭐⭐ (Fácil)  
**Risco**: 🟢 (Baixo)

---

## ⏱️ TIMELINE VISUAL

```
  T+00min ┌─────────────────────────────────────────┐
          │ FASE 1: PREPARAÇÃO (2 minutos)          │
          ├─────────────────────────────────────────┤
          │ [✓] Ler este documento                  │
          │ [✓] Abrir terminal PowerShell            │
          │ [✓] Navegar até: /condosync             │
          └─────────────────────────────────────────┘
                            ↓
  T+02min ┌─────────────────────────────────────────┐
          │ FASE 2: HOMOLOGAÇÃO (15 minutos)        │
          ├─────────────────────────────────────────┤
          │ [1] npx prisma migrate dev        (5m)  │
          │ [2] npm run db:seed               (5m)  │
          │ [3] docker compose restart        (3m)  │
          │ [4] Validar endpoints             (2m)  │
          └─────────────────────────────────────────┘
                            ↓
  T+17min ┌─────────────────────────────────────────┐
          │ FASE 3: PRODUÇÃO (20 minutos)           │
          ├─────────────────────────────────────────┤
          │ [1] SSH para 2.24.211.167         (1m)  │
          │ [2] docker compose build web      (10m) │
          │ [3] docker compose restart        (5m)  │
          │ [4] Validar endpoints             (4m)  │
          └─────────────────────────────────────────┘
                            ↓
  T+37min ┌─────────────────────────────────────────┐
          │ FASE 4: VALIDAÇÃO FINAL (8 minutos)     │
          ├─────────────────────────────────────────┤
          │ [1] Login em ambos                (2m)  │
          │ [2] Testar funcionalidades        (4m)  │
          │ [3] Verificar logs                (2m)  │
          └─────────────────────────────────────────┘
                            ↓
  T+45min ┌─────────────────────────────────────────┐
          │ ✅ SINCRONIZAÇÃO CONCLUÍDA!             │
          │                                         │
          │ 🎉 Ambientes 100% iguais                │
          │ 🚀 100% funcional em ambos              │
          │ ✅ Sistema pronto para produção         │
          └─────────────────────────────────────────┘
```

---

## 🎯 FASE 1: PREPARAÇÃO (2 minutos)

### Checklist
```
[ ] Abrir PowerShell como Administrador
[ ] Executar: cd c:\Users\Santiago\DevSantiago\condosync
[ ] Verificar com: ls (deve aparecer apps/, prisma/, etc.)
```

### Validação
```powershell
# Confirmar que está no diretório correto
Get-Location
# Output esperado: C:\Users\Santiago\DevSantiago\condosync
```

---

## 🎯 FASE 2: HOMOLOGAÇÃO (15 minutos)

### [T+02:00] STEP 1: Executar Migrations (5 minutos)

**Comando:**
```powershell
npx prisma migrate dev
```

**Saída esperada:**
```
✔ Generated Prisma Client
✔ Migrations are up to date
(Ou lista de migrations aplicadas)
```

**O que faz:**
- Cria tabelas faltando (residents, units, charges, dependents)
- Sincroniza schema com produção
- Status: Homologação schema 100%

---

### [T+07:00] STEP 2: Popular Dados Demo (5 minutos)

**Comando:**
```powershell
npm run db:seed
```

**Saída esperada:**
```
Seeding database...
✓ 44 users created
✓ 1 condominium created
✓ 70 units created
✓ Residents, charges, dependents created
✓ Database seeding completed successfully
```

**O que faz:**
- Popula 44 usuários
- Cria 70 unidades
- Cria moradores, cobranças, dependentes
- Status: Dados sincronizados

---

### [T+12:00] STEP 3: Reiniciar Containers (3 minutos)

**Comando:**
```powershell
docker compose restart
```

**Saída esperada:**
```
Restarting condosync-api-1 ... done
Restarting condosync-web-1 ... done
Restarting condosync-mobile-1 ... done
Restarting condosync-postgres-1 ... done
Restarting condosync-redis-1 ... done
Restarting mailpit-1 ... done
```

**O que faz:**
- Aplica mudanças no banco
- Reinicia aplicações
- Status: Sistema pronto para testes

---

### [T+15:00] STEP 4: Validar Endpoints (2 minutos)

**Comando 1 - Login:**
```powershell
$response = Invoke-RestMethod -Method POST `
  -Uri "http://localhost:3333/api/v1/auth/login" `
  -ContentType "application/json" `
  -Body '{"email":"atendimentoveredasbosque@gmail.com","password":"Admin@2026"}'

$token = $response.data.accessToken
echo "Token: $token"
```

**Esperado**: Token retornado sem erro

---

**Comando 2 - Units (novo!):**
```powershell
Invoke-RestMethod -Uri "http://localhost:3333/api/v1/units?take=5" `
  -Headers @{Authorization="Bearer $token"} | ConvertTo-Json | head -30
```

**Esperado**: Lista de unidades (antes era 404, agora 200 OK)

---

**Comando 3 - Charges (novo!):**
```powershell
Invoke-RestMethod -Uri "http://localhost:3333/api/v1/charges?take=5" `
  -Headers @{Authorization="Bearer $token"} | ConvertTo-Json | head -30
```

**Esperado**: Lista de cobranças (antes era 404, agora 200 OK)

---

## 🎯 FASE 3: PRODUÇÃO (20 minutos)

### [T+17:00] STEP 1: Conectar via SSH (1 minuto)

**Comando:**
```powershell
ssh root@2.24.211.167
```

**Prompt esperado:**
```
root@production:~# 
```

**O que faz:**
- Conecta ao servidor de produção
- IP: 2.24.211.167

---

### [T+18:00] STEP 2: Navegar e Rebuild Web (10 minutos)

**Comando 1 - Navegar:**
```bash
cd /opt/condosync/condosync
```

**Comando 2 - Build (LEVA TEMPO!):**
```bash
docker compose build web
```

**Saída esperada:**
```
Building web
[+] Building 45.3s (15/15) FINISHED
 => [internal] load build context
 => [internal] load metadata for docker.io/library/node:18
 ...
 => => naming to ghcr.io/.../web:latest
```

**O que faz:**
- Rebuild da imagem web
- Inclui botão "Redefinir Senha"
- Leva 8-10 minutos

---

### [T+28:00] STEP 3: Restart Web + Mobile (5 minutos)

**Comando 1 - Restart Web:**
```bash
docker compose up -d --no-deps web
```

**Esperado:**
```
condosync-web-1 Started
```

---

**Comando 2 - Aguardar (CRÍTICO!):**
```bash
sleep 30
```

**O que faz:**
- Aguarda container web ficar pronto
- Normalmente 15-30 segundos

---

**Comando 3 - Restart Mobile:**
```bash
docker compose restart mobile
```

**Esperado:**
```
condosync-mobile-1
```

---

### [T+33:00] STEP 4: Validar Endpoints (4 minutos)

**Comando 1 - Health Check:**
```bash
curl http://2.24.211.167:3333/health -i
```

**Esperado:**
```
HTTP/1.1 200 OK
```

---

**Comando 2 - Web Carregando:**
```bash
curl http://2.24.211.167 -I
```

**Esperado:**
```
HTTP/1.1 200 OK
```

---

**Comando 3 - Mobile Carregando (IMPORTANTE!):**
```bash
curl http://2.24.211.167:5174 -I
```

**Esperado:**
```
HTTP/1.1 200 OK
(Antes era TIMEOUT, agora deve ser 200)
```

---

**Comando 4 - Sair do SSH:**
```bash
exit
```

---

## 🎯 FASE 4: VALIDAÇÃO FINAL (8 minutos)

### [T+37:00] STEP 1: Login e Teste Homologação (4 minutos)

**Abrir navegador:**
```
http://localhost
```

**Fazer login:**
```
Email: admin@condosync.com.br
Senha: Admin@2026
```

**Testar funcionalidades:**
```
✅ Moradores - Deve listar agora (antes era 0)
✅ Unidades - Deve listar 70 unidades
✅ Financeiro - Deve exibir cobranças
✅ Upload de foto - Deve funcionar
✅ Redefinir senha - Botão "Senha" está lá
```

---

### [T+41:00] STEP 2: Login e Teste Produção (4 minutos)

**Abrir navegador:**
```
https://condosync.app/
```

**Fazer login:**
```
Email: admin@condosync.com.br
Senha: Admin@2026
```

**Testar funcionalidades:**
```
✅ Moradores - Deve listar
✅ Botão "Senha" - DEVE APARECER (novo!)
✅ Mobile (http://2.24.211.167:5174) - Deve carregar rápido
```

---

## ✅ CHECKLIST COMPLETO

### Antes de Começar
```
[ ] Ler todo este documento
[ ] Preparar 45 minutos de tempo
[ ] Nenhuma outra tarefa durante execução
[ ] Terminal PowerShell aberto
[ ] Acesso VPS preparado (senha SSH)
```

### Durante Fase 1 (Homologação)
```
[ ] cd condosync
[ ] npx prisma migrate dev
[ ] npm run db:seed
[ ] docker compose restart
[ ] Validar endpoints (units, charges)
```

### Durante Fase 2 (Produção)
```
[ ] ssh root@2.24.211.167
[ ] cd /opt/condosync/condosync
[ ] docker compose build web (aguardar)
[ ] docker compose up -d --no-deps web
[ ] sleep 30
[ ] docker compose restart mobile
[ ] Validar health check
[ ] Validar web (200 OK)
[ ] Validar mobile (200 OK, não timeout)
[ ] exit (sair do SSH)
```

### Durante Fase 3 (Testes)
```
[ ] Login em http://localhost
[ ] Testar funcionalidades em homologação
[ ] Login em https://condosync.app/
[ ] Testar funcionalidades em produção
[ ] Verificar botão "Senha" visível
[ ] Testar mobile em http://2.24.211.167:5174
```

### Após Conclusão
```
[ ] Documentar hora de conclusão
[ ] Informar time sobre sucesso
[ ] Fazer screenshot de prova
[ ] Guardar logs
[ ] Atualizar status em wiki
```

---

## 🚨 SE ALGO DER ERRADO

### Problema: Migration Falha
```powershell
# Rollback
npx prisma migrate resolve --rolled-back "<migration_name>"

# Tentar novamente
npx prisma migrate dev
```

### Problema: Seed Falha
```powershell
# Verificar logs
npm run db:seed 2>&1 | tail -50

# Se erro persistir, resetar banco
docker compose down postgres
docker compose up -d postgres
npx prisma migrate deploy
npm run db:seed
```

### Problema: Container Não Inicia
```bash
# Ver logs (da produção via SSH)
docker compose logs web

# Force rebuild
docker compose build --no-cache web
docker compose up -d web
```

### Problema: Mobile Ainda Lento
```bash
# SSH à produção
ssh root@2.24.211.167
cd /opt/condosync/condosync

# Verificar recurso
docker stats condosync-mobile-1

# Se alto CPU/memória
docker compose restart mobile
docker compose logs mobile
```

### Problema: Endpoint Retorna 404
```bash
# Verificar se container está healthy
docker compose ps

# Se UNHEALTHY
docker compose restart <container>

# Ver logs de erro
docker compose logs -f api
```

---

## 🎉 SUCESSO! (T+45min)

### Quando Tudo Funcionar

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  ✅ SINCRONIZAÇÃO CONCLUÍDA COM SUCESSO                 │
│                                                          │
│  Homologação:                                            │
│  ✅ Schema 100% atualizado                              │
│  ✅ 44 usuários + 70 unidades                            │
│  ✅ Todas as funcionalidades testáveis                   │
│  ✅ 100% funcional                                       │
│                                                          │
│  Produção:                                               │
│  ✅ Feature "Redefinir Senha" deployada                  │
│  ✅ Mobile PWA online e responsivo                       │
│  ✅ Todos endpoints 200 OK                               │
│  ✅ 100% funcional                                       │
│                                                          │
│  Sincronização:                                          │
│  ✅ Ambientes idênticos                                 │
│  ✅ Dados sincronizados                                  │
│  ✅ Schemas iguais                                       │
│  ✅ Funcionalidades em paridade                          │
│                                                          │
│  PRÓXIMA AÇÃO: Informar time + Documentar                │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 📊 TEMPO POR ETAPA

```
Fase 1 - Homologação:
  ├─ Step 1 (migrate):     5 min ████
  ├─ Step 2 (seed):        5 min ████
  ├─ Step 3 (restart):     3 min ███
  └─ Step 4 (validate):    2 min ██
  Total Fase 1:           15 min
  
Fase 2 - Produção:
  ├─ Step 1 (SSH):         1 min █
  ├─ Step 2 (build):      10 min █████████
  ├─ Step 3 (restart):     5 min █████
  └─ Step 4 (validate):    4 min ████
  Total Fase 2:           20 min
  
Fase 3 - Testes:
  ├─ Homolog test:         4 min ████
  ├─ Produção test:        4 min ████
  Total Fase 3:            8 min

┌────────────────────────┐
│ TEMPO TOTAL: 45 min ✅  │
└────────────────────────┘
```

---

## 📞 CONTATOS & SUPORTE

Se precisar de ajuda durante execução:

```
Problema Técnico:
  → Ver seção "SE ALGO DER ERRADO" neste documento
  → Consultar logs: docker compose logs <service>
  → Documentar erro e tentar de novo

Dúvida sobre Comando:
  → Referência disponível em PLANO_ACAO_SINCRONIZACAO.md
  → Consultar comandos PowerShell/Bash
  → Executar com --help se disponível

Mais Informações:
  → ANALISE_COMPARATIVA_IMPACTO.md
  → RESUMO_IMPACTO_EXECUTIVO.md
  → RELATORIO_TESTES_PRODUCAO.md
```

---

**Status**: 🔴 AGUARDANDO EXECUÇÃO  
**Preparado**: 15/05/2026 18:30 UTC  
**Versão**: 1.0 - FINAL  
**Tempo Estimado**: 45 minutos  
**Dificuldade**: ⭐⭐ (Fácil)  
**Risco**: 🟢 (Baixo)  

---

## ✅ VOCÊ ESTÁ PRONTO!

**Próximo passo**: Siga o passo-a-passo desta timeline e sincronize seu sistema.

🚀 **BOA SORTE!** 🚀
