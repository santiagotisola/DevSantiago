# Análise do Módulo Mobile - CondoSync

**Data:** 8 de maio de 2026

---

## 1. Visão Geral

O módulo mobile é uma PWA React 18 + Vite, porta 5174.

### Tecnologias

| Pacote | Versão |
| --- | --- |
| React | 18.3.1 |
| Vite | 5.2.0 |
| React Router | 6.22.3 |
| Zustand | 4.5.2 |
| React Query | 5.28.0 |
| Tailwind CSS | 3.4.3 |
| Axios | 1.6.8 |
| vite-plugin-pwa | 0.19.8 |

---

## 2. Autenticação

Fluxo JWT:

1. POST `/auth/login` recebe `accessToken` (1h) + `refreshToken` (7d)
2. Tokens persistidos via Zustand + localStorage
3. Interceptor Axios injeta `Authorization: Bearer {token}`
4. Em 401, POST `/auth/refresh` e retenta requisição
5. Logout se refresh falhar

### Roles suportados

```typescript
const DOORMAN_ROLES = ['DOORMAN', 'CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'];
const RESIDENT_ROLES = ['RESIDENT'];
const SERVICE_PROVIDER_ROLES = ['SERVICE_PROVIDER'];
```

---

## 3. Funcionalidades por Perfil

### Morador

Funcionalidades disponíveis:

- Visitantes: pré-autorizar com nome, documento, motivo, data/hora
- Encomendas: consultar status
- Cobranças: visualizar débitos (estrutura, sem API ativa)
- Avisos: comunicados do condomínio
- Pets: listar animais cadastrados (read-only)
- Chamados: abrir tickets (estrutura, sem integração)
- Marketplace: ofertas de parceiros

API calls do morador:

```typescript
// Visitantes
GET /visitors/condominium/{id}?unitId={unitId}&limit=50
POST /visitors { name, document, reason, scheduledAt, condominiumId, unitId, preAuthorized: true }

// Avisos
GET /communication/announcements/{id}?limit=50

// Pets
GET /pets/unit/{id}

// Marketplace
GET /marketplace/offers?category={category}
GET /marketplace/categories
```

### Portaria

Funcionalidades disponíveis:

- Dashboard com KPIs em tempo real (30-60s polling)
- Visitantes: entradas/saídas e pré-autorizações
- Encomendas: recebimento e entrega
- Pânico: alerta full-screen com 190 e 192

KPIs do dashboard:

```typescript
// Visitantes dentro (entryAt SET, exitAt NULL) — refetch 30s
// Visitantes esperados (preAuthorized=true, entryAt NULL) — refetch 30s
// Encomendas pendentes (deliveredAt NULL) — refetch 60s
```

### Prestador de Serviço

- Avisos: comunicados gerais
- Chamados: tickets atribuídos
- Perfil: dados do usuário

---

## 4. Componentes e Rotas

### Rotas

```text
/                        → HomeGrid
/login                   → LoginPage (público)
/panico                  → PanicoPage (full-screen)
/visitantes              → MinhasVisitas
/cobranças               → MinhasCobrancas
/avisos                  → Avisos
/pets                    → Pets
/chamados                → Avisos (reutilizado)
/marketplace             → MarketplacePage
/encomendas              → EncomendasPortaria
/perfil                  → PerfilPage
/portaria                → PortariaDashboard
/portaria/visitantes     → VisitantesPortaria
/portaria/encomendas     → EncomendasPortaria
```

### Bottom Navigation por role

| Tab | Morador | Portaria | Prestador |
| --- | --- | --- | --- |
| Início | ✅ | ✅ | ✅ |
| Visitas/Visitantes | ✅ | ✅ | — |
| Encomendas/Entregas | ✅ | ✅ | — |
| Avisos | ✅ | — | ✅ |
| PÂNICO | — | ✅ | — |
| Chamados | — | — | ✅ |
| Perfil | ✅ | ✅ | ✅ |

---

## 5. Atualizações de Acessibilidade

### Arquivos modificados (99% WCAG 2.1 AA)

**MobileHeader.tsx** — 2 correções:

```tsx
// Antes
<button className="..."><ChevronLeft size={20} /></button>
// Depois
<button aria-label="Voltar" className="..."><ChevronLeft size={20} /></button>

// Antes
<button className="..."><Bell size={20} /></button>
// Depois
<button aria-label="Notificações" className="..."><Bell size={20} /></button>
```

**MinhasVisitas.tsx** — 2 correções:

```tsx
// Antes
<button onClick={() => setShowForm(false)}><X size={20} /></button>
// Depois
<button aria-label="Fechar" onClick={() => setShowForm(false)}><X size={20} /></button>

// Antes
<input type="datetime-local" value={scheduledAt} onChange={...} />
// Depois
<input type="datetime-local" aria-label="Data e hora agendada" value={scheduledAt} onChange={...} />
```

**MarketplacePage.tsx** — 1 correção:

```tsx
// Antes
<button onClick={() => navigator.clipboard.writeText(couponCode)}><Copy size={18} /></button>
// Depois
<button aria-label="Copiar código de cupom" onClick={() => navigator.clipboard.writeText(couponCode)}><Copy size={18} /></button>
```

---

## 6. Status de Sincronização com Web

| Funcionalidade | Web | Mobile | Status |
| --- | --- | --- | --- |
| Visitantes | ✅ | ✅ | Sincronizado |
| Encomendas | ✅ | ✅ | Sincronizado |
| Avisos | ✅ | ✅ | Sincronizado |
| Marketplace | ✅ | ✅ | Sincronizado |
| Pânico | ✅ | ✅ | Sincronizado |
| Pets | ✅ | ✅ read-only | Parcial |
| Cobranças | ✅ | ⚠️ | Em dev |
| Chamados | ✅ | ⚠️ | Em dev |
| Veículos | ✅ | ❌ | Não implementado |
| Reservas | ✅ | ❌ | Não implementado |
| Documentos | ✅ | ❌ | Não implementado |

---

## 7. Próximas Ações (Roadmap)

### Sprint 1 (prioritário)

- [ ] MinhasCobrancas com GET `/charges/unit/{id}`
- [ ] Chamados com GET/POST `/tickets/unit/{id}`
- [ ] Socket.IO para notificações em tempo real
- [ ] Testes manuais com leitores de tela (NVDA, VoiceOver)

### Sprint 2

- [ ] Página de Veículos (portaria)
- [ ] Página de Reservas (morador)
- [ ] Página de Documentos (todos)
- [ ] Skeleton loaders (substituir spinners)
- [ ] Testes automatizados com Vitest

---

## 8. Comandos de Desenvolvimento

```bash
# Iniciar dev server (porta 5174)
npm run dev

# Build para produção
npm run build

# Preview do build
npm run preview
```

---

**Gerado em:** 8 de maio de 2026
