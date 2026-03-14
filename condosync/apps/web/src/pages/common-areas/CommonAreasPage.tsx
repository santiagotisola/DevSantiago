import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../store/authStore";
import { api } from "../../services/api";
import {
  Calendar,
  Plus,
  Loader2,
  MapPin,
  Clock,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { formatDateTime } from "../../lib/utils";

const reservationStatusLabels: Record<
  string,
  { label: string; className: string }
> = {
  PENDING: { label: "Pendente", className: "bg-yellow-100 text-yellow-700" },
  APPROVED: { label: "Aprovada", className: "bg-green-100 text-green-700" },
  CONFIRMED: { label: "Confirmada", className: "bg-green-100 text-green-700" },
  CANCELLED: { label: "Cancelada", className: "bg-gray-100 text-gray-500" },
  CANCELED: { label: "Cancelada", className: "bg-gray-100 text-gray-500" },
  REJECTED: { label: "Rejeitada", className: "bg-red-100 text-red-700" },
};

const emptyAreaForm = {
  name: "",
  description: "",
  capacity: "",
  rules: "",
  openTime: "",
  closeTime: "",
  maxDaysAdvance: "30",
  requiresApproval: false,
  isAvailable: true,
};

export function CommonAreasPage() {
  const { selectedCondominiumId, user } = useAuthStore();
  const queryClient = useQueryClient();

  // Reservation modal
  const [selectedArea, setSelectedArea] = useState<any>(null);
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [reserveForm, setReserveForm] = useState({
    startDate: "",
    endDate: "",
    notes: "",
  });

  // Area CRUD modal
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [editArea, setEditArea] = useState<any>(null);
  const [areaForm, setAreaForm] = useState({ ...emptyAreaForm });
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const isAdmin = ["CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"].includes(
    user?.role || "",
  );

  const { data: areas, isLoading } = useQuery({
    queryKey: ["common-areas", selectedCondominiumId],
    queryFn: async () => {
      const res = await api.get(
        `/common-areas/condominium/${selectedCondominiumId}`,
      );
      return res.data.data.areas;
    },
    enabled: !!selectedCondominiumId,
  });

  const { data: reservations } = useQuery({
    queryKey: ["reservations", selectedCondominiumId],
    queryFn: async () => {
      const res = await api.get(
        `/common-areas/reservations/condominium/${selectedCondominiumId}`,
      );
      return res.data.data.reservations;
    },
    enabled: !!selectedCondominiumId,
  });

  const reserveMutation = useMutation({
    mutationFn: (d: typeof reserveForm) =>
      api.post("/common-areas/reservations", {
        ...d,
        commonAreaId: selectedArea?.id,
        unitId: user?.condominiumUsers?.find(
          (cu) => cu.condominiumId === selectedCondominiumId,
        )?.unitId,
        startDate: d.startDate
          ? new Date(d.startDate).toISOString()
          : d.startDate,
        endDate: d.endDate ? new Date(d.endDate).toISOString() : d.endDate,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      setShowReserveModal(false);
      setSelectedArea(null);
      setReserveForm({ startDate: "", endDate: "", notes: "" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) =>
      api.patch(`/common-areas/reservations/${id}/cancel`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["reservations"] }),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) =>
      api.patch(`/common-areas/reservations/${id}/approve`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["reservations"] }),
  });

  const createAreaMutation = useMutation({
    mutationFn: (data: any) =>
      api.post("/common-areas", {
        ...data,
        condominiumId: selectedCondominiumId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["common-areas"] });
      closeAreaModal();
    },
  });

  const updateAreaMutation = useMutation({
    mutationFn: (data: any) => api.patch(`/common-areas/${editArea.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["common-areas"] });
      closeAreaModal();
    },
  });

  const deleteAreaMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/common-areas/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["common-areas"] });
      setDeleteTarget(null);
    },
  });

  const openCreateArea = () => {
    setEditArea(null);
    setAreaForm({ ...emptyAreaForm });
    setShowAreaModal(true);
  };

  const openEditArea = (area: any) => {
    setEditArea(area);
    setAreaForm({
      name: area.name || "",
      description: area.description || "",
      capacity: area.capacity?.toString() || "",
      rules: area.rules || "",
      openTime: area.openTime || "",
      closeTime: area.closeTime || "",
      maxDaysAdvance: area.maxDaysAdvance?.toString() || "30",
      requiresApproval: area.requiresApproval ?? false,
      isAvailable: area.isAvailable ?? true,
    });
    setShowAreaModal(true);
  };

  const closeAreaModal = () => {
    setShowAreaModal(false);
    setEditArea(null);
    setAreaForm({ ...emptyAreaForm });
  };

  const submitAreaForm = () => {
    const payload: any = {
      name: areaForm.name,
      description: areaForm.description || undefined,
      capacity: areaForm.capacity ? parseInt(areaForm.capacity) : undefined,
      rules: areaForm.rules || undefined,
      openTime: areaForm.openTime || undefined,
      closeTime: areaForm.closeTime || undefined,
      maxDaysAdvance: areaForm.maxDaysAdvance
        ? parseInt(areaForm.maxDaysAdvance)
        : undefined,
      requiresApproval: areaForm.requiresApproval,
      isAvailable: areaForm.isAvailable,
    };
    if (editArea) {
      updateAreaMutation.mutate(payload);
    } else {
      createAreaMutation.mutate(payload);
    }
  };

  const isSaving = createAreaMutation.isPending || updateAreaMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Áreas Comuns</h1>
          <p className="text-muted-foreground">
            Reserva e gestão de áreas comuns
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={openCreateArea}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nova Área
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      ) : (
        <>
          {((areas || []) as any[]).length === 0 ? (
            <div className="bg-white rounded-xl border-2 border-dashed p-12 text-center text-slate-400">
              <MapPin className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Nenhuma área cadastrada.</p>
              {isAdmin && (
                <button
                  onClick={openCreateArea}
                  className="mt-4 text-sm text-blue-600 hover:underline"
                >
                  Cadastrar primeira área
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {((areas || []) as any[]).map((area: any) => (
                <div
                  key={area.id}
                  className="bg-white rounded-xl border p-5 flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{area.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {area.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => openEditArea(area)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(area)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Remover"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <MapPin className="w-4 h-4 text-blue-500" />
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    {area.capacity && (
                      <p>Capacidade: {area.capacity} pessoas</p>
                    )}
                    {area.openTime && (
                      <p className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {area.openTime} - {area.closeTime}
                      </p>
                    )}
                    {area.rules && (
                      <p className="text-slate-400 italic line-clamp-2">
                        {area.rules}
                      </p>
                    )}
                    {area.requiresApproval && (
                      <span className="inline-block bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded text-xs">
                        Exige aprovação
                      </span>
                    )}
                    {area.isAvailable === false && (
                      <span className="inline-block bg-red-50 text-red-600 px-2 py-0.5 rounded text-xs">
                        Indisponível
                      </span>
                    )}
                  </div>
                  {area.isAvailable !== false && (
                    <button
                      onClick={() => {
                        setSelectedArea(area);
                        setShowReserveModal(true);
                      }}
                      className="mt-auto w-full bg-blue-600 text-white py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      Reservar
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              <h2 className="font-semibold text-sm">Reservas</h2>
            </div>
            {((reservations || []) as any[]).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground text-sm">
                <Calendar className="w-8 h-8" />
                <p>Nenhuma reserva</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left px-4 py-3 font-medium text-gray-600">
                        Área
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">
                        Morador
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">
                        Início
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">
                        Fim
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">
                        Status
                      </th>
                      {isAdmin && (
                        <th className="text-right px-4 py-3 font-medium text-gray-600">
                          Ações
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {((reservations || []) as any[]).map((r: any) => {
                      const st =
                        reservationStatusLabels[r.status] ||
                        reservationStatusLabels.PENDING;
                      return (
                        <tr key={r.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">
                            {r.commonArea?.name}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {r.user?.name}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {formatDateTime(r.startDate)}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {formatDateTime(r.endDate)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.className}`}
                            >
                              {st.label}
                            </span>
                          </td>
                          {isAdmin && (
                            <td className="px-4 py-3 text-right">
                              <div className="flex justify-end gap-1">
                                {r.status === "PENDING" && (
                                  <button
                                    onClick={() => approveMutation.mutate(r.id)}
                                    className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                                  >
                                    Aprovar
                                  </button>
                                )}
                                {["PENDING", "APPROVED", "CONFIRMED"].includes(
                                  r.status,
                                ) && (
                                  <button
                                    onClick={() => cancelMutation.mutate(r.id)}
                                    className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                                  >
                                    Cancelar
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal: Reservar */}
      {showReserveModal && selectedArea && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">
                Reservar: {selectedArea.name}
              </h2>
              <button
                onClick={() => {
                  setShowReserveModal(false);
                  setSelectedArea(null);
                }}
              >
                <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>
            <div className="space-y-3">
              {[
                ["Início *", "startDate", "datetime-local"],
                ["Fim *", "endDate", "datetime-local"],
              ].map(([label, key, type]) => (
                <div key={key} className="space-y-1">
                  <label className="text-sm font-medium">{label}</label>
                  <input
                    type={type}
                    value={(reserveForm as any)[key]}
                    onChange={(e) =>
                      setReserveForm({ ...reserveForm, [key]: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
              <div className="space-y-1">
                <label className="text-sm font-medium">Observações</label>
                <textarea
                  value={reserveForm.notes}
                  onChange={(e) =>
                    setReserveForm({ ...reserveForm, notes: e.target.value })
                  }
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowReserveModal(false);
                  setSelectedArea(null);
                }}
                className="flex-1 px-4 py-2 border rounded-lg text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={() => reserveMutation.mutate(reserveForm)}
                disabled={
                  !reserveForm.startDate ||
                  !reserveForm.endDate ||
                  reserveMutation.isPending
                }
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {reserveMutation.isPending ? "Salvando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Criar/Editar Área */}
      {showAreaModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">
                {editArea ? "Editar Área" : "Nova Área Comum"}
              </h2>
              <button onClick={closeAreaModal}>
                <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[70vh] space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Nome *
                </label>
                <input
                  value={areaForm.name}
                  onChange={(e) =>
                    setAreaForm({ ...areaForm, name: e.target.value })
                  }
                  placeholder="Ex: Salão de Festas"
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Descrição
                </label>
                <textarea
                  value={areaForm.description}
                  onChange={(e) =>
                    setAreaForm({ ...areaForm, description: e.target.value })
                  }
                  rows={2}
                  className="w-full px-3 py-2 border rounded-xl text-sm resize-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Capacidade (pessoas)
                  </label>
                  <input
                    type="number"
                    value={areaForm.capacity}
                    onChange={(e) =>
                      setAreaForm({ ...areaForm, capacity: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Máx. dias antecedência
                  </label>
                  <input
                    type="number"
                    value={areaForm.maxDaysAdvance}
                    onChange={(e) =>
                      setAreaForm({
                        ...areaForm,
                        maxDaysAdvance: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Horário abertura
                  </label>
                  <input
                    type="time"
                    value={areaForm.openTime}
                    onChange={(e) =>
                      setAreaForm({ ...areaForm, openTime: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Horário fechamento
                  </label>
                  <input
                    type="time"
                    value={areaForm.closeTime}
                    onChange={(e) =>
                      setAreaForm({ ...areaForm, closeTime: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Regras / Observações
                </label>
                <textarea
                  value={areaForm.rules}
                  onChange={(e) =>
                    setAreaForm({ ...areaForm, rules: e.target.value })
                  }
                  rows={3}
                  placeholder="Ex: Proibido animais, silêncio após 22h..."
                  className="w-full px-3 py-2 border rounded-xl text-sm resize-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={areaForm.requiresApproval}
                    onChange={(e) =>
                      setAreaForm({
                        ...areaForm,
                        requiresApproval: e.target.checked,
                      })
                    }
                    className="w-4 h-4 accent-blue-600"
                  />
                  Exige aprovação
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={areaForm.isAvailable}
                    onChange={(e) =>
                      setAreaForm({
                        ...areaForm,
                        isAvailable: e.target.checked,
                      })
                    }
                    className="w-4 h-4 accent-blue-600"
                  />
                  Disponível para reservas
                </label>
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t flex gap-3">
              <button
                onClick={closeAreaModal}
                disabled={isSaving}
                className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={submitAreaForm}
                disabled={!areaForm.name || isSaving}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-100 disabled:opacity-50 transition-all"
              >
                {isSaving ? "Salvando..." : editArea ? "Salvar" : "Criar Área"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Exclusão */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-800">Remover Área</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Tem certeza que deseja remover{" "}
              <span className="font-bold text-slate-900">
                {deleteTarget.name}
              </span>
              ?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2 border rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteAreaMutation.mutate(deleteTarget.id)}
                disabled={deleteAreaMutation.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-sm font-bold"
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const reservationStatusLabels: Record<
  string,
  { label: string; className: string }
> = {
  PENDING: { label: "Pendente", className: "bg-yellow-100 text-yellow-700" },
  APPROVED: { label: "Aprovada", className: "bg-green-100 text-green-700" },
  CANCELLED: { label: "Cancelada", className: "bg-gray-100 text-gray-500" },
  REJECTED: { label: "Rejeitada", className: "bg-red-100 text-red-700" },
};

export function CommonAreasPage() {
  const { selectedCondominiumId, user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedArea, setSelectedArea] = useState<any>(null);
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [form, setForm] = useState({ startDate: "", endDate: "", notes: "" });
  const isAdmin = ["CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"].includes(
    user?.role || "",
  );

  const { data: areas, isLoading } = useQuery({
    queryKey: ["common-areas", selectedCondominiumId],
    queryFn: async () => {
      const res = await api.get(
        `/common-areas/condominium/${selectedCondominiumId}`,
      );
      return res.data.data.areas;
    },
    enabled: !!selectedCondominiumId,
  });

  const { data: reservations } = useQuery({
    queryKey: ["reservations", selectedCondominiumId],
    queryFn: async () => {
      const res = await api.get(
        `/common-areas/reservations/condominium/${selectedCondominiumId}`,
      );
      return res.data.data.reservations;
    },
    enabled: !!selectedCondominiumId,
  });

  const reserveMutation = useMutation({
    mutationFn: (d: typeof form) =>
      api.post("/common-areas/reservations", {
        ...d,
        commonAreaId: selectedArea?.id,
        unitId: user?.condominiumUsers?.find(
          (cu) => cu.condominiumId === selectedCondominiumId,
        )?.unitId,
        startDate: d.startDate
          ? new Date(d.startDate).toISOString()
          : d.startDate,
        endDate: d.endDate ? new Date(d.endDate).toISOString() : d.endDate,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      setShowReserveModal(false);
      setSelectedArea(null);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) =>
      api.patch(`/common-areas/reservations/${id}/cancel`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["reservations"] }),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) =>
      api.patch(`/common-areas/reservations/${id}/approve`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["reservations"] }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Áreas Comuns</h1>
        <p className="text-muted-foreground">
          Reserva e gestão de áreas comuns
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {((areas || []) as any[]).map((area: any) => (
              <div
                key={area.id}
                className="bg-white rounded-xl border p-5 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{area.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {area.description}
                    </p>
                  </div>
                  <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  {area.capacity && <p>Capacidade: {area.capacity} pessoas</p>}
                  {area.openTime && (
                    <p className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {area.openTime} - {area.closeTime}
                    </p>
                  )}
                  {area.requiresApproval && (
                    <span className="inline-block bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded text-xs">
                      Exige aprovação
                    </span>
                  )}
                </div>
                {area.isAvailable !== false && (
                  <button
                    onClick={() => {
                      setSelectedArea(area);
                      setShowReserveModal(true);
                    }}
                    className="mt-auto w-full bg-blue-600 text-white py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700"
                  >
                    Reservar
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              <h2 className="font-semibold text-sm">Reservas</h2>
            </div>
            {((reservations || []) as any[]).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground text-sm">
                <Calendar className="w-8 h-8" />
                <p>Nenhuma reserva</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left px-4 py-3 font-medium text-gray-600">
                        Área
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">
                        Morador
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">
                        Início
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">
                        Fim
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">
                        Status
                      </th>
                      {isAdmin && (
                        <th className="text-right px-4 py-3 font-medium text-gray-600">
                          Ações
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {((reservations || []) as any[]).map((r: any) => {
                      const st =
                        reservationStatusLabels[r.status] ||
                        reservationStatusLabels.PENDING;
                      return (
                        <tr key={r.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">
                            {r.commonArea?.name}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {r.user?.name}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {formatDateTime(r.startDate)}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {formatDateTime(r.endDate)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.className}`}
                            >
                              {st.label}
                            </span>
                          </td>
                          {isAdmin && (
                            <td className="px-4 py-3 text-right">
                              <div className="flex justify-end gap-1">
                                {r.status === "PENDING" && (
                                  <button
                                    onClick={() => approveMutation.mutate(r.id)}
                                    className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                                  >
                                    Aprovar
                                  </button>
                                )}
                                {["PENDING", "APPROVED"].includes(r.status) && (
                                  <button
                                    onClick={() => cancelMutation.mutate(r.id)}
                                    className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                                  >
                                    Cancelar
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {showReserveModal && selectedArea && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold">
              Reservar: {selectedArea.name}
            </h2>
            <div className="space-y-3">
              {[
                ["Início *", "startDate", "datetime-local"],
                ["Fim *", "endDate", "datetime-local"],
              ].map(([label, key, type]) => (
                <div key={key} className="space-y-1">
                  <label className="text-sm font-medium">{label}</label>
                  <input
                    type={type}
                    value={(form as any)[key]}
                    onChange={(e) =>
                      setForm({ ...form, [key]: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
              <div className="space-y-1">
                <label className="text-sm font-medium">Observações</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowReserveModal(false);
                  setSelectedArea(null);
                }}
                className="flex-1 px-4 py-2 border rounded-lg text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={() => reserveMutation.mutate(form)}
                disabled={
                  !form.startDate || !form.endDate || reserveMutation.isPending
                }
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
