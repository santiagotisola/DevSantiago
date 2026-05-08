/**
 * Hook para listar parcels — encapsula fetch, paginação e cache.
 *
 * Server-state via React Query: invalidação automática por window
 * focus, refetch interval opcional, cache compartilhado entre
 * componentes da feature.
 *
 * ESTE É O PADRÃO OFICIAL da plataforma para listas paginadas.
 * Replicar em UnitsPage, VisitorsPage, e demais features que
 * forem decompostas.
 */
import { useQuery } from "@tanstack/react-query";
import { fetchParcels, type ParcelFilters } from "../api";

const PARCELS_KEY = "parcels" as const;

export function useParcels(filters: ParcelFilters) {
  return useQuery({
    queryKey: [PARCELS_KEY, filters],
    queryFn: () => fetchParcels(filters),
    // Stale-while-revalidate: 30s.
    staleTime: 30_000,
    // Garbage collection: 5min sem uso.
    gcTime: 5 * 60_000,
    // Não refetch em focus (pode ser intrusivo na UX da portaria).
    refetchOnWindowFocus: false,
  });
}

// Helpers exportados para invalidate manual (em mutations).
useParcels.queryKey = (filters?: ParcelFilters) =>
  filters ? [PARCELS_KEY, filters] : [PARCELS_KEY];
