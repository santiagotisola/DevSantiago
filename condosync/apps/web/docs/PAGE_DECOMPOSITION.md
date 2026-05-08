# Page decomposition — guia oficial

> Padrão para decompor god-pages (>500 LOC) em estrutura
> sustentável. Caso canônico: `ParcelsPage.tsx` (1253 LOC) →
> estrutura `pages/portaria/parcels/`.

## Estrutura alvo

```
src/pages/<area>/<feature>/
├─ index.tsx                    ← composição: orquestra layout + rotas internas
├─ <feature>-list.tsx           ← listagem + filtros + paginação
├─ <feature>-form.tsx           ← create/edit dialog/page
├─ <feature>-detail-drawer.tsx  ← visualização lado-a-lado
├─ <feature>-pickup-dialog.tsx  ← ações específicas (ex: retirada de encomenda)
├─ components/                  ← UI reutilizável só desta feature
│  ├─ <feature>-card.tsx
│  ├─ <feature>-status-badge.tsx
│  └─ <feature>-filters.tsx
├─ hooks/
│  ├─ use-<feature>s.ts         ← React Query: list + invalidate
│  ├─ use-<feature>.ts          ← React Query: detail by id
│  ├─ use-<feature>-mutations.ts ← create/update/delete mutations
│  └─ use-<feature>-realtime.ts ← Socket.IO subscription
├─ types.ts                     ← types compartilhados
├─ schemas.ts                   ← zod schemas (forms)
└─ api.ts                       ← fetch wrappers (tipados)
```

## Princípios

### 1. Cada arquivo ≤ 250 LOC

Se um arquivo cresce além disso, é sinal de que falta extração.
Métrica visível em `eslint --max-lines-per-file`.

### 2. Hooks fazem tudo que envolve estado servidor

- `useParcels(filters)` → React Query `useQuery`.
- `useParcelMutations()` → `useMutation` com `invalidateQueries`
  na success.
- `useParcelRealtime(condominiumId)` → `useEffect` com socket
  listener + invalidate query no evento.

Componentes só renderizam — zero `fetch` direto, zero `useState`
para servidor data.

### 3. Componentes "container" vs "presentational"

- Container (`*-list.tsx`): conhece hooks, mutations, navegação.
- Presentational (`components/<feature>-card.tsx`): recebe props,
  não tem side effects.

Ajuda em testabilidade (presentational com Storybook), reuso e
performance (memoization mais simples).

### 4. Server-state separado de URL-state e UI-state

- **Server-state** (React Query): listas, detail, mutations.
  Source of truth.
- **URL-state** (search params): filtros, página, seleção
  navegável.
- **UI-state** (useState local): modal aberto, hover, animação.

Não misturar. Ex: filtro vai em URL search params (`?status=PENDING`),
NÃO em useState (perde no reload).

### 5. Lazy boundaries

`index.tsx` da feature já é lazy (route-level — feito em commit
anterior). Subdialogs (`*-form`, `*-pickup-dialog`) que abrem
sob demanda também devem ser `React.lazy` para não pagar bundle
em quem só lista.

```tsx
const ParcelForm = React.lazy(() => import('./parcels-form'));

// uso
{showForm && (
  <Suspense fallback={<DialogSkeleton />}>
    <ParcelForm onClose={() => setShowForm(false)} />
  </Suspense>
)}
```

### 6. Error boundary por feature

Cada feature tem seu `<ErrorBoundary>` local (extends do global)
para não derrubar a página inteira em bug de uma seção.

```tsx
// pages/portaria/parcels/index.tsx
export default function ParcelsPage() {
  return (
    <ErrorBoundary fallback={<ParcelsErrorState />}>
      <ParcelsList />
    </ErrorBoundary>
  );
}
```

### 7. Testes por arquivo

- Hook: vitest com `@testing-library/react` `renderHook`.
- Component presentational: vitest + RTL render simples.
- Component container: cobrir via E2E (Playwright) — fácil de
  cobrir o caminho feliz e os principais erros.

## Performance

### Memoização

Use `React.memo` em components da lista que recebem objetos
(parcels). `key` por id.

```tsx
const ParcelCard = React.memo(function ParcelCard({ parcel }) {
  // ...
});
```

Para evitar re-render do parent invalidar todos:
- Hooks retornam objetos estáveis (React Query é safe).
- Callbacks com `useCallback` quando passados para memoizados.
- Selectors quando usar Zustand: `useStore(s => s.x)` pega só `x`.

### Virtualization

Listas com >100 itens visíveis: `@tanstack/react-virtual`. Para
ParcelsPage com até ~30 encomendas/dia/condo, não é necessário.
UnitsPage/VisitorsPage com 500+ unidades: virtualização vale a pena.

### Bundle splitting (já feito)

Route-level lazy via `React.lazy` no App.tsx (commit anterior).
Sub-dialogs também lazy para não inflar a feature inicial.

## Migração incremental — caso ParcelsPage

Sprint 1: extrair hooks + api (zero mudança de UI)
- `hooks/use-parcels.ts` ← extract `useQuery` do componente atual.
- `hooks/use-parcel-mutations.ts` ← extract `useMutation`.
- `api.ts` ← funções `fetchParcels`, `createParcel`, etc.
- Componente atual passa a usar hooks. Mesmo arquivo, ainda
  grande, mas com responsabilidade reduzida.

Sprint 2: extrair sub-componentes
- `components/parcel-card.tsx`.
- `components/parcel-status-badge.tsx`.
- `components/parcel-filters.tsx`.

Sprint 3: extrair dialogs
- `parcels-form.tsx` (create/edit).
- `parcels-pickup-dialog.tsx`.
- `parcels-detail-drawer.tsx`.

Sprint 4: limpeza final
- `index.tsx` vira ~100 LOC só de composição.
- `parcels-list.tsx` é a tela principal.
- Adicionar testes presentational.

Em CADA sprint, PR pequeno (~300-500 LOC modificadas), zero
mudança visível ao usuário.

## Anti-patterns

❌ **God-hook**: extrair 1 hook que faz tudo (`useParcelsPage`)
ainda é god, só mudou de lugar. Extrair hooks por responsabilidade.

❌ **Prop drilling**: 4+ níveis passando mesmo prop. Considere
context local da feature.

❌ **Componente de 200 props**: sinal de falta de coesão. Quebre.

❌ **`useEffect` para tudo**: derived state vai em `useMemo`,
não em `useEffect` setando state. React Query elimina maioria
dos `useEffect` para fetch.

❌ **`useState` para server data**: refetch em window focus,
invalidação manual. Use React Query.

## Métricas de progresso

Por feature migrada:
- LOC do arquivo principal: ≤ 250.
- Cobertura de testes (vitest): ≥ 60%.
- Tempo de bundle inicial (Lighthouse): manter <250KB gzipped.
- Tempo de re-render médio (React DevTools profiler): manter
  <16ms.

Acompanhar em `apps/web/docs/MIGRATION.md` (a criar conforme
sprints).
