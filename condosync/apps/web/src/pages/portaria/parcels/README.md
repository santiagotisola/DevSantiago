# Parcels feature — caso canônico de decomposition

Esta pasta é o **template oficial** para decomposição de god-pages.
Replicar a estrutura para `units/`, `visitors/`, e demais features
maiores que 500 LOC.

## Arquivos atuais (esqueleto criado)

- `api.ts` — wrappers tipados (fetchParcels, createParcel, pickupParcel).
- `hooks/use-parcels.ts` — `useQuery` para listagem.
- `hooks/use-parcel-mutations.ts` — `useMutation` para create/pickup.

## Arquivos pendentes (sprints próximas)

- `index.tsx` — composição (substitui `ParcelsPage.tsx` quando
  pronto).
- `parcels-list.tsx` — listagem + filtros.
- `parcels-form.tsx` — create dialog.
- `parcels-pickup-dialog.tsx` — modal de retirada.
- `components/parcel-card.tsx` — card item da lista.
- `components/parcel-status-badge.tsx`.
- `components/parcel-filters.tsx`.
- `hooks/use-parcel-realtime.ts` — Socket.IO listener.

## Migração (não-breaking)

`apps/web/src/pages/portaria/ParcelsPage.tsx` (1253 LOC) permanece
intacto. Esta pasta é a **estrutura para a qual ela vai ser
migrada**.

### Sprint A (hooks + api — feito neste commit)
✅ Hooks e api isolados. ParcelsPage atual pode ser refatorado
para usar `useParcels` e `useParcelMutations` SEM mudar nada
visível.

### Sprint B
- Extrair `ParcelCard`, `ParcelStatusBadge`, `ParcelFilters` para
  `components/`.
- ParcelsPage passa a importar deles.

### Sprint C
- Extrair `ParcelForm`, `ParcelPickupDialog`, `ParcelDetailDrawer`
  como componentes standalone com `React.lazy`.

### Sprint D
- Renomear ParcelsPage → criar `index.tsx` neste diretório.
- Atualizar route em `App.tsx` para apontar para esta pasta.
- Deletar arquivo legado.

## Por que assim?

Detalhes em `apps/web/docs/PAGE_DECOMPOSITION.md`. TL;DR:
- Cada arquivo ≤ 250 LOC.
- Hooks isolam server-state (React Query).
- Componentes presentational separados de containers.
- Bundle splitting por dialog (`React.lazy`).
- Error boundaries por feature.
- Sem big-bang refactor — migração em 4 sprints sem efeito visível.
