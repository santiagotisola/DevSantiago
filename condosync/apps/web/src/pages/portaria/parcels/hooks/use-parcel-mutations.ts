/**
 * Hook de mutations para parcels — create, pickup, etc.
 *
 * Cada mutation invalida queryKey relevante para refetch
 * automático sem código de "after success" duplicado.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createParcel, pickupParcel, type Parcel } from "../api";
import { useParcels } from "./use-parcels";

export function useParcelMutations() {
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: createParcel,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: useParcels.queryKey() });
    },
  });

  const pickup = useMutation({
    mutationFn: ({ id, pickedUpBy }: { id: string; pickedUpBy: string }) =>
      pickupParcel(id, pickedUpBy),
    onSuccess: (parcel: Parcel) => {
      qc.invalidateQueries({ queryKey: useParcels.queryKey() });
      // Otimistic update: já marcar como DELIVERED em qualquer
      // detalhe cacheado.
      qc.setQueryData(["parcel", parcel.id], parcel);
    },
  });

  return { create, pickup };
}
