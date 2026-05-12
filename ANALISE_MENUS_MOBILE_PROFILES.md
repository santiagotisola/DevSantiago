# 📱 Análise & Proposição - Menus por Perfil (Mobile)

**Data:** 11 de maio de 2026  
**Status:** ✅ Análise Completa

---

## 1. PERFIS DE ACESSO (Identificados)

| Perfil | Código | Roles | Descrição |
|--------|--------|-------|-----------|
| **Morador** | RESIDENT | RESIDENT | Habitante da unidade |
| **Porteiro/Admin** | DOORMAN | DOORMAN, CONDOMINIUM_ADMIN, SYNDIC, SUPER_ADMIN | Portaria e administração |
| **Prestador** | SERVICE_PROVIDER | SERVICE_PROVIDER | Prestador de serviço |

---

## 2. ESTADO ATUAL - MENUS POR PERFIL

### 🏠 MORADOR (RESIDENT)

**Menu Bottom Nav (Atual):**
```
1. Início           [LayoutDashboard]
2. Visitas          [Shield]       → /visitantes ✅
3. Encomendas       [Package]      → /encomendas ✅
4. Avisos           [Bell]         → /avisos ✅
5. Perfil           [User]         → /perfil ✅
```

**Funcionalidades Implementadas:**
- ✅ Pré-autorizar visitantes (MinhasVisitas.tsx)
- ✅ Avisos/Comunicados (Avisos.tsx)
- ✅ Encomendas (visualizar)
- ⚠️ Cobranças (MinhasCobrancas.tsx existe, NÃO está no menu)
- ⚠️ Pets (Pets.tsx existe, NÃO está no menu)
- ⚠️ Marketplace (MarketplacePage.tsx existe, NÃO está no menu)
- ❌ Reservas de áreas comuns
- ❌ Documentos
- ❌ Veículos

---

### 👮 PORTEIRO / ADMIN (DOORMAN + CONDOMINIUM_ADMIN + SYNDIC + SUPER_ADMIN)

**Menu Bottom Nav (Atual):**
```
1. Início           [LayoutDashboard] → / ✅
2. Visitantes       [Shield]          → /portaria/visitantes ✅
3. Entregas         [Package]         → /portaria/encomendas ✅
4. PÂNICO           [AlertTriangle]   → /panico ✅ (Alerta emergência)
5. Perfil           [User]            → /perfil ✅
```

**Funcionalidades Implementadas:**
- ✅ Dashboard Portaria (tempo real)
- ✅ Registrar entrada/saída de visitantes
- ✅ Gerenciar encomendas
- ✅ Botão pânico
- ⚠️ Chamados/Tickets (estrutura existe, NÃO está no menu)
- ❌ Residentes/Unidades (gerenciar)
- ❌ Avisos (enviar)
- ❌ Cobranças (consultar/gerenciar)

---

### 🔧 PRESTADOR DE SERVIÇO (SERVICE_PROVIDER)

**Menu Bottom Nav (Atual):**
```
1. Início           [LayoutDashboard] → / ✅
2. Avisos           [Bell]            → /avisos ✅
3. Chamados         [Ticket]          → /chamados ✅
4. Perfil           [User]            → /perfil ✅
```

**Funcionalidades Implementadas:**
- ✅ Avisos/Comunicados (visualizar)
- ⚠️ Chamados (estrutura existe, apontando para Avisos.tsx)
- ❌ Documentos

---

## 3. PROPOSTA DE MENUS OTIMIZADOS

### 🏠 MORADOR - Menu Proposto (5 Abas Principais + 2 Secundárias)

```
┌─────────────────────────────────────┐
│ ┌─ Aba 1: Início (HomeGrid)       │
│ │  - Resumo de cobranças
│ │  - Últimos avisos
│ │  - Status de visitantes
│ │  - Atalhos rápidos
│ │
│ ├─ Aba 2: Visitas                 │
│ │  ✅ Pré-autorizar visitante
│ │  ✅ Histórico e status
│ │
│ ├─ Aba 3: Documentos              │
│ │  ❌ Download de documentos
│ │  ❌ Comprovante de residência
│ │  ❌ Contatos emergência
│ │
│ ├─ Aba 4: Cobranças               │
│ │  ⚠️ Visualizar faturas
│ │  ⚠️ Segunda via boleto
│ │  ⚠️ Histórico de pagamentos
│ │
│ ├─ Aba 5: Avisos & Mais           │
│ │  ✅ Comunicados do condomínio
│ │  ❌ Marketplace (parceiros)
│ │  ❌ Reserva de área comum
│ │  ❌ Meus pets
│ │
│ └─ Menu Secundário (Hambúrguer)   │
│    - Chamados/Tickets
│    - Documentos
│    - Configurações
│    - Perfil
│
└─────────────────────────────────────┘
```

**Navegação Bottom Nav (Proposta):**
```
1. Início           [LayoutDashboard]
2. Visitas          [Shield]
3. Documentos       [FileText] NEW
4. Cobranças        [CreditCard] NEW
5. Mais (Menu)      [Menu]
```

---

### 👮 PORTEIRO/ADMIN - Menu Proposto (4 Abas Principais)

```
┌─────────────────────────────────────┐
│ ┌─ Aba 1: Dashboard Portaria      │
│ │  ✅ KPIs em tempo real
│ │  ✅ Visitantes esperados
│ │  ✅ Encomendas pendentes
│ │  ✅ Alertas e avisos
│ │
│ ├─ Aba 2: Visitantes             │
│ │  ✅ Lista de visitantes
│ │  ✅ Registrar entrada/saída
│ │  ✅ Histórico
│ │
│ ├─ Aba 3: Encomendas             │
│ │  ✅ Gerenciar entregas
│ │  ✅ Registrar recebimento
│ │  ✅ Notificar morador
│ │
│ ├─ Aba 4: Mais                   │
│ │  ✅ Pânico/Emergência
│ │  ⚠️ Chamados/Manutenção
│ │  ❌ Residentes (gerenciar)
│ │  ❌ Avisos (enviar)
│ │  - Perfil
│
└─────────────────────────────────────┘
```

**Navegação Bottom Nav (Proposta):**
```
1. Dashboard        [LayoutDashboard]
2. Visitantes       [Shield]
3. Encomendas       [Package]
4. PÂNICO           [AlertTriangle] (Vermelho)
5. Mais             [Menu]
```

---

### 🔧 PRESTADOR - Menu Proposto (3 Abas + Menu)

```
┌─────────────────────────────────────┐
│ ┌─ Aba 1: Início                  │
│ │  ✅ Resumo de chamados
│ │  ✅ Avisos relevantes
│ │
│ ├─ Aba 2: Chamados/Tickets        │
│ │  ❌ Listar chamados atribuídos
│ │  ❌ Registrar progresso
│ │  ❌ Marcar como concluído
│ │
│ ├─ Aba 3: Documentos              │
│ │  ❌ Certificados/Licenças
│ │  ❌ Histórico de trabalhos
│ │
│ ├─ Menu Secundário                │
│ │  - Avisos
│ │  - Configurações
│ │  - Perfil
│
└─────────────────────────────────────┘
```

**Navegação Bottom Nav (Proposta):**
```
1. Início           [LayoutDashboard]
2. Chamados         [Ticket]
3. Avisos           [Bell]
4. Documentos       [FileText] NEW
5. Perfil           [User]
```

---

## 4. FUNCIONALIDADES FALTANDO vs DISPONÍVEIS

| Funcionalidade | Morador | Porteiro | Prestador | Status |
|----------------|---------|----------|-----------|--------|
| **Visitantes** | ✅ | ✅ | — | ✅ PRONTO |
| **Encomendas** | ✅ | ✅ | — | ✅ PRONTO |
| **Avisos** | ✅ | — | ✅ | ✅ PRONTO |
| **Cobranças** | ⚠️ Existe | — | — | ⚠️ NO CÓDIGO, NÃO NO MENU |
| **Chamados** | — | ⚠️ Existe | ⚠️ Existe | ⚠️ PARCIAL (sem backend) |
| **Dashboard** | — | ✅ | — | ✅ PRONTO |
| **Pânico** | — | ✅ | — | ✅ PRONTO |
| **Pets** | ⚠️ Existe | — | — | ⚠️ NO CÓDIGO, NÃO NO MENU |
| **Marketplace** | ⚠️ Existe | — | — | ⚠️ NO CÓDIGO, NÃO NO MENU |
| **Reservas** | ❌ | — | — | ❌ NÃO IMPLEMENTADO |
| **Documentos** | ❌ | ❌ | ❌ | ❌ NÃO IMPLEMENTADO |
| **Veículos** | ❌ | ❌ | — | ❌ NÃO IMPLEMENTADO |

---

## 5. IMPLEMENTAÇÃO RECOMENDADA (Prioridade)

### 🔴 CRÍTICO (Semanal)

1. **Adicionar ao menu Morador:**
   - [ ] Cobranças (MinhasCobrancas.tsx existe) → Aba 4
   - [ ] Menu "Mais" com Marketplace, Pets, Documentos

2. **Melhorar Menu Porteiro:**
   - [ ] Adicionar Menu "Mais" com Chamados
   - [ ] Reorganizar para 4-5 abas principais

3. **Completar Menu Prestador:**
   - [ ] Substitui `/chamados` para página real (não Avisos.tsx)

### 🟡 IMPORTANTE (Próximas 2 semanas)

4. **Implementar Chamados:**
   - [ ] Backend: POST /tickets, GET /tickets, PATCH /tickets/:id
   - [ ] Frontend: TicketsPage.tsx (morador + porteiro + prestador)

5. **Implementar Documentos:**
   - [ ] Backend: GET /documents, upload de arquivos
   - [ ] Frontend: DocumentsPage.tsx (todos os perfis)

### 🟢 DESEJÁVEL (Sprint 2)

6. **Implementar Reservas:**
   - [ ] Backend: gerenciar reservas de áreas comuns
   - [ ] Frontend: ReservasPage.tsx (morador)

7. **Implementar Veículos:**
   - [ ] Backend: gerenciar veículos (porteiro)
   - [ ] Frontend: VeiculosPage.tsx (porteiro)

---

## 6. CÓDIGO PROPOSTO - NOVO BOTTMNAV

```tsx
// BottomNav.tsx proposto

const residentTabs: Tab[] = [
  { to: '/', icon: LayoutDashboard, label: 'Início' },
  { to: '/visitantes', icon: Shield, label: 'Visitas' },
  { to: '/documentos', icon: FileText, label: 'Documentos' }, // NEW
  { to: '/cobrancas', icon: CreditCard, label: 'Cobranças' }, // NEW
  { to: '/mais', icon: MoreVertical, label: 'Mais' }, // NEW - menu
];

const doormanTabs: Tab[] = [
  { to: '/portaria', icon: BarChart3, label: 'Dashboard' },
  { to: '/portaria/visitantes', icon: Shield, label: 'Visitantes' },
  { to: '/portaria/encomendas', icon: Package, label: 'Encomendas' },
  { to: '/panico', icon: AlertTriangle, label: 'PÂNICO', danger: true },
  { to: '/mais', icon: MoreVertical, label: 'Mais' }, // NEW
];

const serviceTabs: Tab[] = [
  { to: '/', icon: LayoutDashboard, label: 'Início' },
  { to: '/chamados', icon: Ticket, label: 'Chamados' },
  { to: '/avisos', icon: Bell, label: 'Avisos' },
  { to: '/documentos', icon: FileText, label: 'Documentos' }, // NEW
  { to: '/perfil', icon: User, label: 'Perfil' },
];
```

---

## 7. CHECKLIST DE IMPLEMENTAÇÃO

### Fase 1: Adicionar menus faltando (1-2 dias)
- [ ] Adicionar Cobranças ao menu Morador
- [ ] Adicionar Documentos ao menu Morador
- [ ] Adicionar Menu "Mais" ao Morador
- [ ] Ajustar Menu Porteiro

### Fase 2: Implementar Chamados (3-5 dias)
- [ ] Criar TicketsPage.tsx
- [ ] Backend: endpoints /tickets
- [ ] Integração com API

### Fase 3: Implementar Documentos (2-3 dias)
- [ ] Criar DocumentsPage.tsx
- [ ] Backend: endpoints /documents
- [ ] Upload de arquivos

### Fase 4: Melhorias Futuras (Sprint 2)
- [ ] Reservas de áreas comuns
- [ ] Gerenciar veículos (porteiro)
- [ ] Notificações push em tempo real

---

## 8. RECOMENDAÇÃO FINAL

✅ **Estado Atual:** App funcional com menus básicos  
⚠️ **Faltando:** Alguns componentes existem mas não estão nos menus  
🎯 **Próximo Passo:** Reorganizar menus para incluir todas as funcionalidades + implementar Chamados

**Ação Imediata:** Atualizar BottomNav.tsx para adicionar:
1. Cobranças (morador)
2. Documentos (todos)
3. Menu "Mais" para itens secundários

---

**Próxima Sessão:** Implementar mudanças no BottomNav e adicionar as novas rotas.
