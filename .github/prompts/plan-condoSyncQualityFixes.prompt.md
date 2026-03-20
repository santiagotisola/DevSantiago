# CondoSync — Plano de Correções de Qualidade

Análise realizada em 20/03/2026. Nenhum ❌ ERRO em runtime. Os itens abaixo são todos ⚠️ ATENÇÃO — UX ou código morto.

---

## Problemas encontrados

### [FIX-01] Sidebar — Grupos sem `roles` visíveis para RESIDENT

**Arquivo:** `condosync/apps/web/src/components/navigation/Sidebar.tsx`

RESIDENT vê os itens no menu, clica e é redirecionado silenciosamente para `/` pelo `RoleGuard`.

**Correção:** adicionar `roles` nos itens:

```ts
// Financeiro — adicionar roles
{ label: 'Financeiro', icon: DollarSign, roles: ['CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'], children: [...] }

// Manutenção — adicionar roles
{ label: 'Manutenção', to: '/manutencao', icon: Wrench, roles: ['CONDOMINIUM_ADMIN', 'SYNDIC', 'DOORMAN', 'SUPER_ADMIN'] }

// Comunicação > Assembleias — remover do grupo Comunicação (ou restringir filho)
// A rota /assembleias tem RoleGuard para MANAGEMENT — o filho não deve aparecer para RESIDENT
```

---

### [FIX-02] Rota `/finance-categories` sem frontend

**Arquivo:** `condosync/apps/api/src/modules/finance/financeCategories.routes.ts`

A rota está registrada e implementada mas nenhuma página do web ou mobile a consome. Categoria financeira não pode ser criada/listada pela UI.

**Ação sugerida:** Criar interface de gerenciamento de categorias financeiras na página `/financeiro` (aba "Categorias") ou criar página dedicada `/financeiro/categorias`.

Endpoints disponíveis:
- `GET /finance-categories?condominiumId=`
- `POST /finance-categories`
- `PUT /finance-categories/:id`
- `DELETE /finance-categories/:id`

---

### [FIX-03] Rota `/visitor-recurrences` sem frontend

**Arquivo:** `condosync/apps/api/src/modules/visitors/recurrence.routes.ts`

Backend completo implementado mas sem UI. RESIDENT não consegue cadastrar visitantes recorrentes pela interface.

**Ação sugerida:** Criar página `VisitorRecurrencesPage` em `/minha-portaria/visitantes-recorrentes` com formulário de dias da semana + horário + data de vigência.

Endpoints disponíveis:
- `GET /visitor-recurrences/:condominiumId`
- `POST /visitor-recurrences`
- `DELETE /visitor-recurrences/:id`

---

### [FIX-04] `unitId` declarado no JwtPayload mas nunca populado

**Arquivo:** `condosync/apps/api/src/middleware/auth.ts`

```ts
export interface JwtPayload {
  userId: string;
  condominiumId?: string;
  unitId?: string;  // ← nunca populado no login
  name?: string;
  role: UserRole;
}
```

`auth.service.ts` popula apenas `{ userId, role, name }`. O campo `unitId` está declarado mas vazio — pode confundir quem ler o código e pensar que é confiável.

**Opções:**
1. Remover `unitId?` da interface (mais limpo — validação via DB é melhor mesmo)
2. Popular no login: buscar `condominiumUsers[0]?.unitId` e incluir no payload

---

### [FIX-05] Path UTF-8 `/cobranças` em rotas React Router

**Arquivos:**
- `condosync/apps/web/src/App.tsx` — `path="minhas-cobranças"`
- `condosync/apps/mobile/src/App.tsx` — `path="/cobranças"`

URLs ficam como `/minhas-cobran%C3%A7as` no browser. Links gerados por código que não encode corretamente podem quebrar navegação.

**Correção sugerida:** Trocar para ASCII:
- `/minhas-cobrancas` (web)
- `/cobrancas` (mobile)

Atualizar também o `Sidebar.tsx` (`to: '/minhas-cobranças'` → `to: '/minhas-cobrancas'`).

---

## Resumo

| # | Impacto | Arquivo | Ação |
|---|---|---|---|
| FIX-01 | UX — itens inúteis no menu RESIDENT | `Sidebar.tsx` | Adicionar `roles` em "Financeiro", "Manutenção", remover "Assembleias" de Comunicação |
| FIX-02 | Feature incompleta — categorias não gerenciáveis | `financeCategories.routes.ts` + web | Criar UI de categorias financeiras |
| FIX-03 | Feature incompleta — visitantes recorrentes sem UI | `recurrence.routes.ts` + web/mobile | Criar página `VisitorRecurrencesPage` |
| FIX-04 | Cosmético — campo JWT declarado e não usado | `auth.ts` | Remover `unitId?` ou popular no login |
| FIX-05 | Risco encoding — paths UTF-8 em rotas | `App.tsx` (web + mobile) + `Sidebar.tsx` | Trocar `/cobranças` → `/cobrancas` |
