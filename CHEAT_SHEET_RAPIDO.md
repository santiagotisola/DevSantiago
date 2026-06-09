# ⚡ CHEAT SHEET - Comandos Rápidos

**Imprima este arquivo ou deixe aberto durante execução**

---

## 🏃 EXECUÇÃO RÁPIDA (45 minutos)

### FASE 1: HOMOLOGAÇÃO (15 min)

```powershell
# Terminal PowerShell

cd c:\Users\Santiago\DevSantiago\condosync

# Step 1: Migrations (5 min)
npx prisma migrate dev

# Step 2: Seed (5 min)
npm run db:seed

# Step 3: Restart (3 min)
docker compose restart

# Step 4: Validar
$token = (Invoke-RestMethod -Method POST -Uri "http://localhost:3333/api/v1/auth/login" `
  -ContentType "application/json" `
  -Body '{"email":"atendimentoveredasbosque@gmail.com","password":"Admin@2026"}').data.accessToken

# Test Units
Invoke-RestMethod -Uri "http://localhost:3333/api/v1/units?take=1" `
  -Headers @{Authorization="Bearer $token"} | ConvertTo-Json
```

✅ **Esperado**: Array com unidades (não 404)

---

### FASE 2: PRODUÇÃO (20 min)

```bash
# SSH Terminal

ssh root@2.24.211.167

cd /opt/condosync/condosync

# Step 1: Build Web (10 min - LENTO)
docker compose build web

# Step 2: Restart
docker compose up -d --no-deps web
sleep 30
docker compose restart mobile

# Step 3: Validar
curl http://2.24.211.167:3333/health -i
curl http://2.24.211.167 -I
curl http://2.24.211.167:5174 -I  # Antes: TIMEOUT | Depois: 200 OK

exit
```

✅ **Esperado**: Todos HTTP 200

---

### FASE 3: TESTES (8 min)

```
Navegador 1: http://localhost
Login: atendimentoveredasbosque@gmail.com / Admin@2026

Testes:
  ✅ Moradores (deve listar)
  ✅ Unidades (deve listar 70)
  ✅ Financeiro (deve listar cobranças)
  ✅ Foto (deve fazer upload)
  ✅ Senha (botão deve estar lá)

Navegador 2: https://condosync.app/
Login: atendimentoveredasbosque@gmail.com / Admin@2026

Testes:
  ✅ Moradores (deve listar)
  ✅ Botão Senha (NOVO - deve aparecer)
  ✅ Mobile (http://2.24.211.167:5174 - deve carregar < 3s)
```

---

## 🚨 TROUBLESHOOTING RÁPIDO

### Migration Falha
```powershell
npx prisma migrate resolve --rolled-back "<migration_name>"
npx prisma migrate dev
```

### Seed Falha
```powershell
docker compose down postgres
docker compose up -d postgres
npx prisma migrate deploy
npm run db:seed
```

### Container Quebrado (Produção)
```bash
ssh root@2.24.211.167
cd /opt/condosync/condosync
docker compose logs <container>
docker compose restart <container>
```

### Endpoint 404
```bash
docker compose ps
# Se UNHEALTHY, restart:
docker compose restart <container>
```

---

## 📊 CHECKLIST VISUAL

```
┌─ ANTES DE COMEÇAR
│  [ ] Leu TIMELINE_EXECUCAO_45MIN.md
│  [ ] Terminal PowerShell aberto
│  [ ] 45 minutos disponíveis
│
├─ FASE 1: HOMOLOGAÇÃO (15 min)
│  [ ] cd condosync
│  [ ] npx prisma migrate dev
│  [ ] npm run db:seed
│  [ ] docker compose restart
│  [ ] Validar endpoints OK
│
├─ FASE 2: PRODUÇÃO (20 min)
│  [ ] ssh root@2.24.211.167
│  [ ] cd /opt/condosync/condosync
│  [ ] docker compose build web (aguardar 10 min)
│  [ ] docker compose up -d --no-deps web
│  [ ] sleep 30
│  [ ] docker compose restart mobile
│  [ ] Validar endpoints OK
│  [ ] exit
│
├─ FASE 3: TESTES (8 min)
│  [ ] Login em http://localhost ✅
│  [ ] Login em https://condosync.app/ ✅
│  [ ] Testar funcionalidades ambos ✅
│  [ ] Botão Senha visível em prod ✅
│
└─ APÓS SUCESSO
   [ ] Informar team
   [ ] Guardar logs
   [ ] Documentar hora
```

---

## ⏱️ TIMING

```
T+00:00 - Comece
T+02:00 - Finish prepare
T+07:00 - Seed done
T+10:00 - Restart done
T+12:00 - Homolog validated ✅
T+13:00 - SSH connected
T+23:00 - Web build done
T+28:00 - Web restart done
T+33:00 - Mobile restart done
T+37:00 - Prod validated ✅
T+41:00 - Tests on homolog done
T+45:00 - FINISHED ✅
```

---

## 💾 SALVE ISTO

**Se fora de internet**, salve:
- Este arquivo
- TIMELINE_EXECUCAO_45MIN.md
- PLANO_ACAO_SINCRONIZACAO.md

Deixe aberto em outra janela para referência rápida.

---

## 🎯 OBJETIVO

```
Antes:  Homolog 40% | Prod 70% ❌
Depois: Homolog 100% | Prod 100% ✅

Tempo: 45 minutos
Risco: Baixo
Benefício: Alto
```

---

**Versão**: 1.0  
**Data**: 15/05/2026  
**Status**: 🚀 PRONTO  

✅ BOA SORTE!
