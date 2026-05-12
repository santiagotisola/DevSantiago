# Diagramas e WCAG - Mobile CondoSync

**Data:** 8 de maio de 2026

---

## 1. Fluxo de Login

```text
User Input (email, password)
         │
         ▼
POST /auth/login
         │
         ▼
Validate credentials
         │
         ▼
Return accessToken + refreshToken
         │
         ▼
Save to Zustand + localStorage
         │
         ▼
Redirect to HomeGrid
```

---

## 2. Fluxo de Visitantes (Morador)

```text
User click "Pré-autorizar"
         │
         ▼
Form Modal (nome, documento, motivo, data)
         │
         ▼
Validate (nome >= 2 chars)
         │
         ▼
POST /visitors { name, document, ... }
         │
         ▼
Success toast
         │
         ▼
Invalidate query 'my-visitors'
         │
         ▼
Refetch list
         │
         ▼
UI updated
```

---

## 3. Fluxo Dashboard Portaria (Tempo Real)

```text
Mount component
         │
         ├─ GET /visitors?date={today} [30s refetch]
         ├─ GET /parcels/cond/{id} [60s refetch]
         └─ GET /vehicles?date={today} [30s refetch]
         │
         ▼
Combine data
         │
         ▼
Calculate KPIs
  - inside = visitantes no condomínio
  - expected = visitantes esperados
  - parcels = encomendas pendentes
         │
         ▼
Render cards
         │
         ▼
Auto refetch em intervalo
```

---

## 4. Fluxo de Autenticação com Refresh

```text
Request com accessToken
         │
         ▼
Server: 401 (expirado)
         │
         ▼
Fila requisições pendentes
         │
         ▼
POST /auth/refresh { refreshToken }
         │
         ▼
Recebe novo accessToken
         │
         ▼
Update store
         │
         ▼
Retry requisições
```

---

## 5. Tabela de Atualizações Acessibilidade

| Arquivo | Antes | Depois | Status |
| --- | --- | --- | --- |
| MobileHeader.tsx | 2 botões sem label | aria-label="Voltar", aria-label="Notificações" | ✅ |
| MinhasVisitas.tsx | 2 elementos sem label | aria-label="Fechar", aria-label="Data e hora" | ✅ |
| MarketplacePage.tsx | 1 botão sem label | aria-label="Copiar código" | ✅ |
| **Total** | **5 violações** | **5/5 corrigidas** | **✅ 100%** |

---

## 6. Conformidade WCAG 2.1 AA

| Requisito | Técnica | Status |
| --- | --- | --- |
| 1.4.3 Contraste | Color ratio > 4.5:1 | ✅ |
| 2.1.1 Teclado | Tab navigation | ✅ |
| 2.1.2 Sem armadilha | Focus management | ✅ |
| 2.4.7 Foco visível | focus-ring Tailwind | ✅ |
| 3.2.1 Ao receber foco | No unexpected | ✅ |
| **4.1.2 Nome, papel, valor** | **aria-label** | **✅** |
| 4.1.3 Mensagens | Toast notifications | ✅ |

---

## 7. Hierarquia de Componentes

```text
App.tsx
├─ BrowserRouter
│  └─ Routes
│     ├─ PublicOnlyRoute (login)
│     └─ PrivateRoute
│        ├─ PanicoPage
│        └─ MobileLayout
│           ├─ MobileHeader (aria-labels) ✅
│           ├─ Outlet
│           │  ├─ HomeGrid
│           │  ├─ MinhasVisitas (aria-labels) ✅
│           │  ├─ Avisos
│           │  ├─ Pets
│           │  ├─ MarketplacePage (aria-labels) ✅
│           │  └─ PerfilPage
│           └─ BottomNav
```

---

## 8. Models de Dados

### UserInfo (Store)

```typescript
interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
  condominiumUsers: Array<{
    condominiumId: string;
    role: string;
    unitId?: string;
    condominium: { id: string; name: string };
    unit?: { identifier: string; block?: string };
  }>;
}
```

### Visitor (Query)

```typescript
interface Visitor {
  id: string;
  name: string;
  document?: string;
  reason?: string;
  scheduledAt?: string;
  preAuthorized: boolean;
  entryAt?: string;
  exitAt?: string;
}
```

### Parcel (Query)

```typescript
interface Parcel {
  id: string;
  unit: { identifier: string };
  recipient: { name: string };
  description: string;
  receivedAt: string;
  deliveredAt?: string;
}
```

---

## 9. Endpoints da API

| Método | Path | Função |
| --- | --- | --- |
| POST | /auth/login | Login |
| POST | /auth/refresh | Refresh token |
| GET | /visitors/condominium/{id} | Listar visitantes |
| POST | /visitors | Criar visitante |
| GET | /parcels/condominium/{id} | Listar encomendas |
| GET | /communication/announcements/{id} | Avisos |
| GET | /pets/unit/{id} | Pets |
| GET | /marketplace/offers | Ofertas |
| POST | /panic | Alerta pânico |

---

## 10. Roadmap Visual

```text
Maio:     ████░ (Análise concluída)
Junho:    Sprint 1 (Cobranças + Chamados + Socket.IO)
          Sprint 2 (Veículos + Reservas + Docs + Deploy)
Julho:    Produção (Railway)
```

---

**Gerado em:** 8 de maio de 2026
