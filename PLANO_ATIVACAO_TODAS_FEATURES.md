# 📋 PLANO DE ATIVAÇÃO - TODAS AS FEATURES

**Status:** Em Execução  
**Data:** 16 de maio de 2026

---

## 1. FEATURES A ATIVAR

### 1.1 Mobile (Portaria/Doorman)
- ✅ **Visitantes** — Já ativo
- ✅ **Encomendas** — Já ativo
- ✅ **Veículos** — Ativar menu item
- ⏳ **WhatsApp Messages** — Criar componente
- ⏳ **Panic Alerts** — Ativar dashboard

### 1.2 Web (Admin/Syndic)
- ✅ **Dashboard** — Já ativo
- ✅ **Visitantes** — Já ativo
- ✅ **Encomendas** — Já ativo
- ⏳ **Branding** — Ativar formulário
- ⏳ **WhatsApp** — Ativar integração
- ⏳ **Panic Alerts** — Ativar dashboard

### 1.3 Mobile (Resident/Morador)
- ✅ **Início** — Dashboard
- ✅ **Visitantes** — Minhas visitas
- ✅ **Encomendas** — Ler-only view
- ✅ **Marketplace** — Já ativo
- ⏳ **WhatsApp Messages** — Criar
- ⏳ **Notificações** — Ativar

---

## 2. ATIVAÇÕES POR PRIORIDADE

### 🔴 CRÍTICA (Deploy imediato)
- [x] Axios deadlock fix
- [x] Dark theme
- [x] Visitantes/Encomendas/Veículos

### 🟠 ALTA (Próximas 24h)
- [ ] WhatsApp integration ativado
- [ ] Panic alerts ativado
- [ ] Branding form ativado

### 🟡 MÉDIA (Próxima semana)
- [ ] Notificações avançadas
- [ ] Analytics dashboard
- [ ] Reports geração

---

## 3. ARQUIVOS A MODIFICAR

### Mobile
```
apps/mobile/src/components/navigation/BottomNav.tsx → Ativar Veículos
apps/mobile/src/pages/home/HomeGrid.tsx → Adicionar WhatsApp tile
apps/mobile/src/App.tsx → Adicionar rota /whatsapp
apps/mobile/src/pages/messaging/ → Criar nova pasta (NEW)
```

### Web
```
apps/web/src/layout/Sidebar.tsx → Ativar menu items
apps/web/src/pages/Dashboard.tsx → Ativar widgets
apps/web/src/pages/Communication/ → Criar pasta WhatsApp
apps/web/src/pages/Settings/BrandingForm.tsx → Ativar rota
```

### API
```
apps/api/src/server.ts → Confirmar whatsapp routes ativo
apps/api/src/modules/whatsapp/ → Validar endpoints
```

---

## 4. ENDPOINTS A ATIVAR

```bash
POST /api/whatsapp/send-message
GET /api/whatsapp/messages
GET /api/whatsapp/sessions

POST /api/panic-alerts/trigger
GET /api/panic-alerts/history

PATCH /api/condominium/branding
GET /api/condominium/branding

GET /api/vehicles (resident view)
POST /api/vehicles (doorman register)
```

---

## 5. TIMELINE

| Fase | Duração | Status |
|------|---------|--------|
| Deploy críticas | 15 min | ✅ COMPLETO |
| Ativar features | 30 min | ⏳ EM EXECUÇÃO |
| Deploy produção | 20 min | ⏳ PENDENTE |
| Validação final | 15 min | ⏳ PENDENTE |

---

## 6. CHECKPOINT ANTES DE DEPLOY

- [ ] Todas as rotas respondendo 200 OK
- [ ] Menu items visíveis em todos os apps
- [ ] Nenhum erro no console
- [ ] Performance <2s em todas as páginas
- [ ] Database migrations completas
- [ ] Backups realizados

---

**Próximo:** Começar ativação de features high-priority
