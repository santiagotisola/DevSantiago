# 🎨 RECOMENDAÇÕES DE LAYOUT - CondoSync v1.0.0

**Modelo Inspirado:** Aparecida.go.gov.br + Claro/OI/TIM + Mercado Livre  
**Data:** 16 de maio de 2026  
**Foco:** Melhorar UX móvel e desktop mantendo dark theme

---

## 1. LAYOUT MÓVEL (RECOMENDADO)

### 1.1 Home Page - Dashboard Portaria

```
┌─────────────────────────────────┐
│ ← | Portaria         | 🔔   🟊3│  ← Header sticky
├─────────────────────────────────┤
│                                 │
│ 🏢 Residencial Veredas do Bosque│  ← Context badge
│ Bem-vindo, João (Porteiro)     │
│                                 │
├─────────────────────────────────┤
│ ╔════════════════════════════╗  │  ← Hero stats
│ ║ Hoje:                      ║  │
│ ║ 👥 2 Visitantes   📦 5 Encs║  │
│ ║ 🚗 1 Veículo     🚨 0 Alertas║  │
│ ╚════════════════════════════╝  │
├─────────────────────────────────┤
│ [🔍 Buscar por nome/placa...]  │  ← Search proeminente
├─────────────────────────────────┤
│ 📋 AÇÕES RÁPIDAS              │
│ ┌────────────────────────────┐ │
│ │ [📥 Registrar] [✅ Autorizar]│  ← CTA buttons
│ │ [❌ Rejeitar]  [📞 Contatar] │
│ └────────────────────────────┘ │
├─────────────────────────────────┤
│ 👥 ÚLTIMOS VISITANTES          │
│ ┌────────────────────────────┐ │
│ │ Maria da Silva      [✓✓]   │ │  ← Card com
│ │ Casa 12 • 14:30             │ │     status visual
│ │ Visita familiar             │ │
│ └────────────────────────────┘ │
│ ┌────────────────────────────┐ │
│ │ João Pereira        [🟡]   │ │
│ │ Casa 05 • 14:15             │ │
│ │ Entrega de presente         │ │
│ └────────────────────────────┘ │
│                                 │
├─────────────────────────────────┤ ← Bottom nav sticky
│ 🏠  👥  📦  🚗  ⚙️            │
│ Início Vis Encs Veic Config     │
└─────────────────────────────────┘
```

### 1.2 Visitantes List Page

```
┌─────────────────────────────────┐
│ ← | Visitantes      | 🔔   🟊0 │
├─────────────────────────────────┤
│ [🔍 Buscar visitante/unidade... │  ← Search interna
│ [Filtros: Status ▼ Data ▼]    │
│                                 │
├─────────────────────────────────┤ ← Filter chips
│ [Todos] [No condomínio] [🟡Pend│
│ [✓Auth] [Saíram] [❌Negados]   │
├─────────────────────────────────┤
│                                 │
│ 👤 Maria da Silva    [✓✓ Lido] │  ← Visitor card
│ 🏢 Casa 12 • Bloco Rua 03      │
│ 📞 (62) 98888-1234             │
│ 📋 Visita familiar             │
│ ⏱️  Entrada 14:30 | Saída 16:00│
│                                 │
│ [📞 Contatar] [✓ Entrada]      │  ← Actions
├─────────────────────────────────┤
│                                 │
│ 👤 João Avelange       [✓ Entg]│
│ 🏢 Casa 05 • Bloco Rua 03      │
│ 📞 +55 (62) 99999-9999         │
│ 📋 Almofada delivery            │
│ ⏱️  Entrada 14:15               │
│                                 │
│ [❌ Rejeitar] [✓ Entrada]      │
├─────────────────────────────────┤
│ [Carregar mais...]              │
│                                 │
└─────────────────────────────────┘
```

### 1.3 Encomendas List Page

```
┌─────────────────────────────────┐
│ ← | Encomendas      | 🔔   🟊0 │
├─────────────────────────────────┤
│ [🔍 Buscar código/unidade...]  │
│ [Status: Todas ▼] [🔄 Atualizar]
├─────────────────────────────────┤
│ [✓ Entregues] [📬 Pendentes]   │  ← Chips filter
├─────────────────────────────────┤
│                                 │
│ 📦 Código: BR987654321BR       │  ← Parcel card
│ 🏢 Casa 12 • Bloco Rua 03      │
│ 🚚 Correios                    │
│ 📅 14/05 às 16:19              │
│ ⏱️  Aguardando entrega         │
│ [▸ Ver detalhes]               │
│                                 │
│ [📞 Morador] [✓ Entregar] [❌]│
├─────────────────────────────────┤
│                                 │
│ 📦 Código: 6565656             │
│ 🏢 Casa 03 • Bloco Rua 03      │
│ 🚚 J&T Express                 │
│ 📅 11/05 às 19:11              │
│ ✓ Entregue: 14/05 14:30        │
│ 👤 Recebido por: Maria         │
│                                 │
│ [📞 Morador] [📋 Nota]         │
├─────────────────────────────────┤
│                                 │
└─────────────────────────────────┘
```

### 1.4 Perfil Page (com Melhorias)

```
┌─────────────────────────────────┐
│ ← | Perfil         | 🔔   🟊0 │
├─────────────────────────────────┤
│                                 │
│         🟢 👤                  │  ← Status (online)
│    João da Silva               │     Badge customizado
│         Porteiro               │
│   ⭐ Responsável (100%)        │  ← Badge achievement
│                                 │
├─────────────────────────────────┤
│ 📧 Email                       │  ← Profile info cards
│ joao.silva@email.com           │
│                                 │
│ 🏢 Condomínio                  │
│ Residencial Veredas do Bosque  │
│                                 │
│ 📱 Telefone                    │
│ (62) 98888-1234                │
│                                 │
│ 🏘️ Unidade                     │
│ Não tem (Portaria)             │
│                                 │
├─────────────────────────────────┤
│ [✏️ Editar Perfil]            │
│ [🔑 Alterar Senha]             │
│ [🛎️ Notificações]             │
│ [🎨 Tema]                     │
│ [⚙️ Configurações]             │
│ [📞 Suporte]                   │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ Versão: 1.0.0               │ │
│ │ Última atualização: 16 de   │ │
│ │ maio de 2026                 │ │
│ └─────────────────────────────┘ │
│                                 │
│ [🚪 Sair da conta]             │
│                                 │
└─────────────────────────────────┘
```

### 1.5 Panic Page (Full Screen - Recomendado)

```
┌─────────────────────────────────┐
│                                 │  ← Full screen
│                                 │
│                                 │
│          🚨 PÂNICO 🚨         │
│                                 │
│                                 │
│    ┌────────────────────────┐   │
│    │   PRESSIONE PARA       │   │  ← Huge button
│    │   CHAMAR AJUDA         │   │
│    │   (Segure 3s)          │   │
│    └────────────────────────┘   │
│                                 │
│   Polícia: 190                  │  ← Emergency numbers
│   Ambulância: 192               │
│   Bombeiros: 193                │
│   Portaria: (62) 3545-5800     │
│                                 │
│   ┌────────────────────────┐    │
│   │ Localização enviada     │    │  ← Status message
│   │ Portaria notificada     │    │
│   │ (Atualizar em 30s)      │    │
│   └────────────────────────┘    │
│                                 │
│ [← Cancelar]                    │
│                                 │
└─────────────────────────────────┘
```

---

## 2. LAYOUT DESKTOP (RECOMENDADO)

### 2.1 Dashboard com Sidebar

```
┌──────────────────────────────────────────────────────────────┐
│ 🏠 CondoSync │ Portaria       [👤 João]  [🔔3]  [⚙️] │
├────────┬─────────────────────────────────────────────────────┤
│        │                                                      │
│ Sidebar│  🏢 Residencial Veredas do Bosque              [×]  │
│ [≡]    │  Bem-vindo, João (Porteiro)                         │
│ ────── │                                                      │
│ 🏠 Iní │  ╔════════════════════════════════════════════╗    │
│ 📊 Dash│  ║ 📊 DASHBOARD HOJE                         ║    │
│ 👥 Vis │  ║                                            ║    │
│ 📦 Enc │  ║ 👥 Visitantes: 2  │ 📦 Encomendas: 5    ║    │
│ 🚗 Veic│  ║ 🚗 Veículos: 1    │ 🚨 Alertas: 0      ║    │
│ 💬 Wha │  ║ ⏱️  Tempo médio: 8min                      ║    │
│ 🔔 Avi │  ╚════════════════════════════════════════════╝    │
│ 🚨 Pân │                                                      │
│ ⚙️ Conf│  [🔍 Buscar...] [Filtros▼]                          │
│ ─────  │  ┌─────────────┬─────────────┬─────────────┐       │
│ 🆘 Sup │  │ Visitante 1  │ Visitante 2 │ Encomenda 1 │       │
│ 📞 Cha │  │ [✓ Autorizado] [🟡 Pendente] [📬 Entregue] │     │
│        │  │ Maria Silva │ João Pereira│ Código ABC  │       │
│        │  │ Casa 12     │ Casa 05     │ Correios   │       │
│        │  │ 14:30       │ 14:15       │ 14/05 16:19 │       │
│        │  │             │             │ [+ Opções]  │       │
│        │  └─────────────┴─────────────┴─────────────┘       │
│        │                                                      │
│        │  📈 GRÁFICOS                                        │
│        │  ┌──────────────────┬──────────────────┐            │
│        │  │ Visitantes/semana│ Status Encomendas│            │
│        │  │    (gráfico)     │    (barra)       │            │
│        │  └──────────────────┴──────────────────┘            │
│        │                                                      │
└────────┴─────────────────────────────────────────────────────┘
```

### 2.2 Visitantes List com Timeline

```
┌────────────────────────────────────────────────────────────┐
│ Visitantes │ [🔍 Buscar...] [Status▼] [Data▼] [+ Novo]    │
├────────────────────────────────────────────────────────────┤
│                                                             │
│ ╔════════════════════════════════════════════════════════╗│
│ ║ 📅 TIMELINE - 14 de maio de 2026                      ║│
│ ╠════════════════════════════════════════════════════════╣│
│ ║ 16:30 - Maria saiu (Casa 12)                          ║│
│ ║ 16:15 - ✅ João autorizado (Casa 05)                 ║│
│ ║ 16:00 - Visitante registrado (Casa 12)               ║│
│ ║ 15:30 - 🟡 Aguardando autorização (Casa 06)         ║│
│ ║ 15:15 - ❌ Pedro negado entrada (Casa 04)            ║│
│ ║ 14:45 - ✅ Juliana autorizada (Casa 03)              ║│
│ ║ 14:30 - Maria entrou (Casa 12)                        ║│
│ ╚════════════════════════════════════════════════════════╝│
│                                                             │
│ 👤 VISITANTE CARD                                          │
│ ┌──────────────────────────────────────────────────────┐  │
│ │ Nome: Maria da Silva          Status: ✓ Saída       │  │
│ │ Telefone: (62) 98888-1234     Rating: ⭐⭐⭐⭐⭐      │  │
│ │ Unidade: Casa 12 • Bloco Rua 03                      │  │
│ │ Motivo: Visita familiar                              │  │
│ │ Entrada: 14:30 │ Saída: 16:30 │ Duração: 2h         │  │
│ │ Acompanhante: Sim │ Histórico: 12 visitas            │  │
│ │                                                       │  │
│ │ [📞 Contatar] [📋 Histórico] [⭐ Avaliar] [🗑️ Delete]│  │
│ └──────────────────────────────────────────────────────┘  │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

---

## 3. COMPONENTES RECOMENDADOS

### 3.1 Card Pattern

```typescript
// Antes (Atual)
<div className="border rounded p-4">
  Conteúdo simples
</div>

// Depois (Recomendado)
<div className="bg-slate-700 border border-slate-600 rounded-xl p-4
              shadow-lg hover:shadow-xl hover:scale-105 
              transition-all duration-200 cursor-pointer
              before:absolute before:top-0 before:left-0 
              before:w-1 before:h-full before:bg-blue-500 
              before:rounded-l-xl">
  <div className="flex justify-between items-start mb-2">
    <h3 className="font-bold text-white">Título</h3>
    <span className="px-2 py-1 rounded-full text-xs 
                   bg-green-900 text-green-200">Status</span>
  </div>
  <p className="text-slate-300 text-sm">Descrição</p>
</div>
```

### 3.2 Button Hierarchy

```tsx
// Primário (Action principal)
<button className="bg-blue-600 hover:bg-blue-700 
                  text-white font-semibold px-6 py-2 
                  rounded-lg transition-all">
  Autorizar
</button>

// Secundário (Action secundária)
<button className="bg-slate-700 hover:bg-slate-600 
                  text-white px-4 py-2 rounded-lg 
                  transition-all">
  Detalhes
</button>

// Perigo (Ação destrutiva)
<button className="bg-red-600 hover:bg-red-700 
                  text-white px-4 py-2 rounded-lg 
                  transition-all">
  Negar
</button>

// Pânico (Emergência)
<button className="bg-red-500 hover:bg-red-600 
                  text-white font-bold px-8 py-4 
                  rounded-xl text-xl shadow-2xl 
                  scale-125 animate-pulse">
  🚨 CHAMAR AJUDA
</button>
```

### 3.3 Status Badge

```tsx
// Success
<span className="bg-green-900/50 text-green-200 
                px-3 py-1 rounded-full text-xs 
                font-semibold flex items-center gap-1">
  ✓ Autorizado
</span>

// Pending
<span className="bg-yellow-900/50 text-yellow-200 
                px-3 py-1 rounded-full text-xs 
                font-semibold flex items-center gap-1">
  ⏳ Pendente
</span>

// Error
<span className="bg-red-900/50 text-red-200 
                px-3 py-1 rounded-full text-xs 
                font-semibold flex items-center gap-1">
  ✗ Negado
</span>

// Info
<span className="bg-blue-900/50 text-blue-200 
                px-3 py-1 rounded-full text-xs 
                font-semibold flex items-center gap-1">
  ℹ️ No condomínio
</span>
```

### 3.4 Filter Chips

```tsx
const filters = [
  { label: 'Todos', active: true },
  { label: 'No condomínio', active: false },
  { label: 'Pendentes', active: false },
  { label: 'Autorizados', active: false },
  { label: 'Saíram', active: false },
];

{filters.map(filter => (
  <button
    key={filter.label}
    className={`px-4 py-2 rounded-full text-sm 
                font-medium transition-all
                ${filter.active 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-slate-700 text-slate-300 
                     hover:bg-slate-600'}`}
  >
    {filter.label}
  </button>
))}
```

---

## 4. IMPLEMENTAÇÃO ROADMAP

### Fase 1: Quick Wins (1-2 semanas)
- [ ] Adicionar card shadows/depth
- [ ] Implementar button hierarchy
- [ ] Status badges com cores
- [ ] Filter chips em listas
- [ ] Search bar proeminente

### Fase 2: Mid-term (2-4 semanas)
- [ ] Hero banner/stats na home
- [ ] Timeline de atividades
- [ ] Sidebar menu desktop
- [ ] Avatar customization
- [ ] Animations/transitions

### Fase 3: Long-term (1-3 meses)
- [ ] Analytics dashboard
- [ ] Theme customization
- [ ] WCAG AAA compliance
- [ ] Push notifications
- [ ] Internationalization

---

## 5. CHECKLIST DE IMPLEMENTAÇÃO

```jsx
// Dark theme consistency
✅ bg-slate-900 → background principal
✅ bg-slate-800 → cards e containers
✅ border-slate-700 → borders
✅ text-white/slate-300/400 → texto

// Mobile-first
✅ Breakpoints: sm: 640px, md: 768px, lg: 1024px
✅ Touch targets: min-48px
✅ Spacing: 4px grid (não 5px)
✅ Fonts: min-14px mobile

// Performance
✅ <1s page load
✅ Skeleton screens (não spinners)
✅ Lazy loading images
✅ Code splitting routes

// Accessibility
✅ ARIA labels em botões
✅ Keyboard navigation
✅ Focus indicators visíveis
✅ Color + icon indicators
```

---

**Recomendação Final:** Implementar Fase 1 imediatamente para ganhos rápidos. Sistema já está EXCELENTE, essas melhorias deixam ainda melhor.

**Timeline Total:** 8-12 semanas para ser o MELHOR SAAS DO MUNDO 🚀
