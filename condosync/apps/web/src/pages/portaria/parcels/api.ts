/**
 * API wrappers tipados para a feature parcels. Único lugar onde
 * temos URLs do backend hardcoded — facilita refactor futuro
 * (ex: migração para tRPC/orval/codegen).
 */
import { api } from "../../../services/api";

export interface ParcelFilters {
  condominiumId: string;
  unitId?: string;
  status?: "RECEIVED" | "DELIVERED" | "RETURNED";
  page?: number;
  limit?: number;
}

export interface Parcel {
  id: string;
  unitId: string;
  senderName: string | null;
  carrier: string | null;
  trackingCode: string | null;
  photoUrl: string | null;
  status: "RECEIVED" | "DELIVERED" | "RETURNED";
  receivedAt: string;
  pickedUpAt: string | null;
  pickedUpBy: string | null;
}

export interface ParcelsPage {
  parcels: Parcel[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function fetchParcels(
  filters: ParcelFilters,
): Promise<ParcelsPage> {
  const params = new URLSearchParams();
  if (filters.unitId) params.set("unitId", filters.unitId);
  if (filters.status) params.set("status", filters.status);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  const res = await api.get(
    `/parcels/condominium/${filters.condominiumId}?${params}`,
  );
  return res.data.data;
}

export async function createParcel(
  data: Omit<Parcel, "id" | "receivedAt" | "pickedUpAt" | "pickedUpBy" | "status">,
): Promise<Parcel> {
  const res = await api.post("/parcels", data);
  return res.data.data.parcel;
}

export async function pickupParcel(
  id: string,
  pickedUpBy: string,
): Promise<Parcel> {
  const res = await api.patch(`/parcels/${id}/pickup`, { pickedUpBy });
  return res.data.data.parcel;
}
