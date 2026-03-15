import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { api } from "../../services/api";
import {
  Wrench,
  Plus,
  Search,
  Loader2,
  CalendarCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";
import { formatDate } from "../../lib/utils";

const statusLabels: Record<
  string,
  { label: string; className: string; next?: string }
> = {
  OPEN: {
    label: "Aberto",
    className: "bg-yellow-100 text-yellow-700",
    next: "IN_PROGRESS",
  },
  IN_PROGRESS: {
    label: "Em Andamento",
    className: "bg-blue-100 text-blue-700",
    next: "COMPLETED",
  },
  COMPLETED: { label: "Concluído", className: "bg-green-100 text-green-700" },
  CANCELED: { label: "Cancelado", className: "bg-gray-100 text-gray-500" },
};

const priorityLabels: Record<string, { label: string; className: string }> = {
  LOW: { label: "Baixa", className: "bg-gray-100 text-gray-600" },
  MEDIUM: { label: "Média", className: "bg-blue-100 text-blue-700" },
  HIGH: { label: "Alta", className: "bg-orange-100 text-orange-700" },
  URGENT: { label: "Urgente", className: "bg-red-100 text-red-700" },
};

const FREQUENCIES = [
  "diário",
  "semanal",
  "quinzenal",
  "mensal",
  "trimestral",
  "semestral",
  "anual",
] as const;

function scheduleStatus(nextDueDate: string): {
  label: string;
  className: string;
  Icon: any;
} {
  const today = new Date();
  const due = new Date(nextDueDate);
  const diffDays = Math.ceil(
    (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays < 0)
    return {
      label: "Vencido",
      className: "bg-red-100 text-red-700",
      Icon: AlertCircle,
    };
  if (diffDays <= 7)
    return {
      label: `Vence em ${diffDays}d`,
      className: "bg-yellow-100 text-yellow-700",
      Icon: Clock,
    };
  return {
    label: "Em dia",
    className: "bg-green-100 text-green-700",
    Icon: CheckCircle2,
  };
}

const emptyScheduleForm = {
  title: "",
  description: "",
  category: "",
  location: "",
  frequency: "mensal" as string,
  nextDueDate: "",
  estimatedCost: "",
};

export function MaintenancePage() {
  const { selectedCondominiumId, user } = useAuthStore();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"os" | "preventiva">("os");

  // â”€â”€ OS State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
    category: "",
  });
  const [editModal, setEditModal] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
    category: "",
  });

  // â”€â”€ Schedule State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [scheduleModal, setScheduleModal] = useState(false);
  const [scheduleForm, setScheduleForm] = useState(emptyScheduleForm);
  const [editScheduleModal, setEditScheduleModal] = useState(false);
  const [editScheduleTarget, setEditScheduleTarget] = useState<any | null>(
    null,
  );
  const [editScheduleForm, setEditScheduleForm] = useState(emptyScheduleForm);

  const isAdmin = ["CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"].includes(
    user?.role || "",
  );

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  // â”€â”€ OS Queries â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const { data: orders, isLoading } = useQuery({
    queryKey: ["maintenance", selectedCondominiumId, statusFilter],
    queryFn: async () => {
      const url = `/maintenance/condominium/${selectedCondominiumId}${statusFilter ? `?status=${statusFilter}` : ""}`;
      const res = await api.get(url);
      return res.data.data.orders;
    },
    enabled: !!selectedCondominiumId,
  });

  const createMutation = useMutation({
    mutationFn: (d: typeof form) =>
      api.post("/maintenance", { ...d, condominiumId: selectedCondominiumId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      setShowModal(false);
      setForm({ title: "", description: "", priority: "MEDIUM", category: "" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/maintenance/${id}/status`, { status }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["maintenance"] }),
  });

  const updateOrderMutation = useMutation({
    mutationFn: (d: typeof editForm & { id: string }) =>
      api.patch(`/maintenance/${d.id}`, {
        title: d.title,
        description: d.description,
        priority: d.priority,
        category: d.category,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      setEditModal(false);
      setEditTarget(null);
    },
  });

  const filtered = ((orders || []) as any[]).filter(
    (o: any) =>
      (o.title ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (o.category ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  // â”€â”€ Schedule Queries â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const { data: schedules, isLoading: schedulesLoading } = useQuery({
    queryKey: ["maintenance-schedules", selectedCondominiumId],
    queryFn: async () => {
      const res = await api.get(
        `/maintenance/schedules/${selectedCondominiumId}`,
      );
      return res.data.data.schedules;
    },
    enabled: !!selectedCondominiumId,
  });

  const createScheduleMutation = useMutation({
    mutationFn: (d: typeof scheduleForm) =>
      api.post("/maintenance/schedules", {
        condominiumId: selectedCondominiumId,
        title: d.title,
        description: d.description || undefined,
        category: d.category,
        location: d.location,
        frequency: d.frequency,
        nextDueDate: new Date(d.nextDueDate).toISOString(),
        estimatedCost: d.estimatedCost ? Number(d.estimatedCost) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-schedules"] });
      setScheduleModal(false);
      setScheduleForm(emptyScheduleForm);
    },
  });

  const updateScheduleMutation = useMutation({
    mutationFn: (d: typeof editScheduleForm & { id: string }) =>
      api.patch(`/maintenance/schedules/${d.id}`, {
        title: d.title,
        description: d.description || undefined,
        category: d.category,
        location: d.location,
        frequency: d.frequency,
        nextDueDate: new Date(d.nextDueDate).toISOString(),
        estimatedCost: d.estimatedCost ? Number(d.estimatedCost) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-schedules"] });
      setEditScheduleModal(false);
      setEditScheduleTarget(null);
    },
  });

  const markDoneMutation = useMutation({
    mutationFn: (id: string) =>
      api.patch(`/maintenance/schedules/${id}/done`, {}),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["maintenance-schedules"] }),
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/maintenance/schedules/${id}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["maintenance-schedules"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manutenção</h1>
          <p className="text-muted-foreground">
            Ordens de serviço e manutenções preventivas
          </p>
        </div>
        {tab === "os" && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Nova O.S.
          </button>
        )}
        {tab === "preventiva" && isAdmin && (
          <button
            onClick={() => setScheduleModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Nova Preventiva
          </button>
        )}
      </div>

      {/* â”€â”€ Tabs â”€â”€ */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setTab("os")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${tab === "os" ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
        >
          <Wrench className="w-4 h-4" /> Ordens de Serviço
        </button>
        <button
          onClick={() => setTab("preventiva")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${tab === "preventiva" ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
        >
          <CalendarCheck className="w-4 h-4" /> Preventiva
        </button>
      </div>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {/* TAB: Ordens de Serviço */}
      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {tab === "os" && (
        <>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar ordens..."
                className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              {Object.entries(statusLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground bg-white rounded-xl border">
              <Wrench className="w-10 h-10" />
              <p>Nenhuma ordem encontrada</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filtered.map((o: any) => {
                const st = statusLabels[o.status] || statusLabels.OPEN;
                const pr = priorityLabels[o.priority] || priorityLabels.MEDIUM;
                return (
                  <div key={o.id} className="bg-white rounded-xl border p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-medium text-sm">{o.title}</h3>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${pr.className}`}
                          >
                            {pr.label}
                          </span>
                        </div>
                        {o.description && (
                          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                            {o.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {o.category && <span>Categoria: {o.category}</span>}
                          {o.dueDate && (
                            <span>Prazo: {formatDate(o.dueDate)}</span>
                          )}
                          {(o.assignedTo || o.serviceProvider?.name) && (
                            <span>
                              Responsável:{" "}
                              {o.serviceProvider?.name || o.assignedTo}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium ${st.className}`}
                        >
                          {st.label}
                        </span>
                        {isAdmin && (
                          <div className="flex flex-col gap-1 items-end">
                            {st.next && (
                              <button
                                onClick={() =>
                                  updateStatusMutation.mutate({
                                    id: o.id,
                                    status: st.next!,
                                  })
                                }
                                className="text-xs px-2 py-1 border rounded hover:bg-gray-50"
                              >
                                Avançar Status
                              </button>
                            )}
                            {o.status !== "CANCELED" &&
                              o.status !== "COMPLETED" && (
                                <button
                                  onClick={() => {
                                    setEditForm({
                                      title: o.title ?? "",
                                      description: o.description ?? "",
                                      priority: o.priority ?? "MEDIUM",
                                      category: o.category ?? "",
                                    });
                                    setEditTarget(o);
                                    setEditModal(true);
                                  }}
                                  className="text-xs px-2 py-1 border rounded hover:bg-gray-50"
                                >
                                  Editar
                                </button>
                              )}
                            {o.status !== "CANCELED" && (
                              <button
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      "Cancelar esta ordem de serviço?",
                                    )
                                  )
                                    updateStatusMutation.mutate({
                                      id: o.id,
                                      status: "CANCELED",
                                    });
                                }}
                                className="text-xs px-2 py-1 border border-red-200 text-red-600 rounded hover:bg-red-50"
                              >
                                Cancelar
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {/* TAB: Preventiva */}
      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {tab === "preventiva" && (
        <>
          {schedulesLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : !schedules || schedules.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground bg-white rounded-xl border">
              <CalendarCheck className="w-10 h-10" />
              <p>Nenhuma manutenção preventiva cadastrada</p>
              {isAdmin && (
                <button
                  onClick={() => setScheduleModal(true)}
                  className="mt-2 text-sm text-blue-600 hover:underline"
                >
                  Cadastrar a primeira
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-3">
              {(schedules as any[]).map((s: any) => {
                const st = scheduleStatus(s.nextDueDate);
                const Icon = st.Icon;
                return (
                  <div key={s.id} className="bg-white rounded-xl border p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Icon
                            className={`w-4 h-4 ${st.className.split(" ")[1]}`}
                          />
                          <h3 className="font-medium text-sm">{s.title}</h3>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.className}`}
                          >
                            {st.label}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium capitalize">
                            {s.frequency}
                          </span>
                        </div>
                        {s.description && (
                          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                            {s.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          {s.category && <span>Categoria: {s.category}</span>}
                          {s.location && <span>Local: {s.location}</span>}
                          <span>Próxima: {formatDate(s.nextDueDate)}</span>
                          {s.lastDoneDate && (
                            <span>Última: {formatDate(s.lastDoneDate)}</span>
                          )}
                          {s.estimatedCost && (
                            <span>
                              Custo est.: R${" "}
                              {Number(s.estimatedCost).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <button
                            onClick={() => {
                              if (
                                window.confirm(
                                  "Marcar esta manutenção como realizada? A próxima data será recalculada automaticamente.",
                                )
                              )
                                markDoneMutation.mutate(s.id);
                            }}
                            disabled={markDoneMutation.isPending}
                            className="flex items-center gap-1 text-xs px-2 py-1 bg-green-50 border border-green-200 text-green-700 rounded hover:bg-green-100"
                          >
                            <CheckCircle2 className="w-3 h-3" /> Feita
                          </button>
                          <button
                            onClick={() => {
                              const due = new Date(s.nextDueDate);
                              const localISO = new Date(
                                due.getTime() - due.getTimezoneOffset() * 60000,
                              )
                                .toISOString()
                                .slice(0, 16);
                              setEditScheduleForm({
                                title: s.title ?? "",
                                description: s.description ?? "",
                                category: s.category ?? "",
                                location: s.location ?? "",
                                frequency: s.frequency ?? "mensal",
                                nextDueDate: localISO,
                                estimatedCost: s.estimatedCost
                                  ? String(s.estimatedCost)
                                  : "",
                              });
                              setEditScheduleTarget(s);
                              setEditScheduleModal(true);
                            }}
                            className="text-xs px-2 py-1 border rounded hover:bg-gray-50"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => {
                              if (
                                window.confirm(
                                  "Remover esta manutenção preventiva?",
                                )
                              )
                                deleteScheduleMutation.mutate(s.id);
                            }}
                            className="text-xs px-2 py-1 border border-red-200 text-red-600 rounded hover:bg-red-50"
                          >
                            Remover
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* â”€â”€ Modal: Nova O.S. â”€â”€ */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold">Nova Ordem de Serviço</h2>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Título *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Descrição</label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Prioridade</label>
                  <select
                    value={form.priority}
                    onChange={(e) =>
                      setForm({ ...form, priority: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.entries(priorityLabels).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Categoria</label>
                  <input
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Elétrico"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border rounded-lg text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={() => createMutation.mutate(form)}
                disabled={!form.title || createMutation.isPending}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€ Modal: Editar O.S. â”€â”€ */}
      {editModal && editTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold">Editar Ordem de Serviço</h2>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Título *</label>
                <input
                  value={editForm.title}
                  onChange={(e) =>
                    setEditForm({ ...editForm, title: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Descrição</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm({ ...editForm, description: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Prioridade</label>
                  <select
                    value={editForm.priority}
                    onChange={(e) =>
                      setEditForm({ ...editForm, priority: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.entries(priorityLabels).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Categoria</label>
                  <input
                    value={editForm.category}
                    onChange={(e) =>
                      setEditForm({ ...editForm, category: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Elétrico"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setEditModal(false);
                  setEditTarget(null);
                }}
                className="flex-1 px-4 py-2 border rounded-lg text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={() =>
                  updateOrderMutation.mutate({ ...editForm, id: editTarget.id })
                }
                disabled={updateOrderMutation.isPending || !editForm.title}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {updateOrderMutation.isPending ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€ Modal: Nova Preventiva â”€â”€ */}
      {scheduleModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold">
              Nova Manutenção Preventiva
            </h2>
            <ScheduleForm form={scheduleForm} setForm={setScheduleForm} />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setScheduleModal(false);
                  setScheduleForm(emptyScheduleForm);
                }}
                className="flex-1 px-4 py-2 border rounded-lg text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={() => createScheduleMutation.mutate(scheduleForm)}
                disabled={
                  !scheduleForm.title ||
                  !scheduleForm.category ||
                  !scheduleForm.location ||
                  !scheduleForm.nextDueDate ||
                  createScheduleMutation.isPending
                }
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {createScheduleMutation.isPending ? "Criando..." : "Criar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€ Modal: Editar Preventiva â”€â”€ */}
      {editScheduleModal && editScheduleTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold">
              Editar Manutenção Preventiva
            </h2>
            <ScheduleForm
              form={editScheduleForm}
              setForm={setEditScheduleForm}
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setEditScheduleModal(false);
                  setEditScheduleTarget(null);
                }}
                className="flex-1 px-4 py-2 border rounded-lg text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={() =>
                  updateScheduleMutation.mutate({
                    ...editScheduleForm,
                    id: editScheduleTarget.id,
                  })
                }
                disabled={
                  !editScheduleForm.title ||
                  !editScheduleForm.category ||
                  !editScheduleForm.location ||
                  !editScheduleForm.nextDueDate ||
                  updateScheduleMutation.isPending
                }
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {updateScheduleMutation.isPending ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// â”€â”€ Shared form component for schedule create/edit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ScheduleForm({
  form,
  setForm,
}: {
  form: any;
  setForm: (f: any) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="text-sm font-medium">Título *</label>
        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Ex: Revisão bomba d'água"
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Descrição</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={2}
          className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">Categoria *</label>
          <input
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: Hidráulica"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Local *</label>
          <input
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: Casa de máquinas"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">Frequência *</label>
          <select
            value={form.frequency}
            onChange={(e) => setForm({ ...form, frequency: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 capitalize"
          >
            {FREQUENCIES.map((f) => (
              <option key={f} value={f} className="capitalize">
                {f}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Próxima data *</label>
          <input
            type="datetime-local"
            value={form.nextDueDate}
            onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Custo estimado (R$)</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={form.estimatedCost}
          onChange={(e) => setForm({ ...form, estimatedCost: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="0,00"
        />
      </div>
    </div>
  );
}
