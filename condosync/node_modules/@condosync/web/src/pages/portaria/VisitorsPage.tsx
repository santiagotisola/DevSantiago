import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../store/authStore";
import { api } from "../../services/api";
import { formatDateTime, maskPhone, validatePhone } from "../../lib/utils";
import {
  Users,
  Plus,
  Search,
  LogIn,
  LogOut,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Pencil,
  Wrench,
  AlertTriangle,
  Building2,
  ShieldAlert,
  UserCheck,
  MoreHorizontal,
  Bell,
} from "lucide-react";

// ─── Skeleton Loading Components ──────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />;
}

function VisitorTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4 p-4 border-b">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-6 flex-1" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-20" />
        </div>
      ))}
    </div>
  );
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pendente", color: "bg-amber-100 text-amber-700 border-amber-200" },
  AUTHORIZED: { label: "Autorizado", color: "bg-blue-100 text-blue-700 border-blue-200" },
  DENIED: { label: "Negado", color: "bg-red-100 text-red-700 border-red-200" },
  INSIDE: { label: "Dentro Agora", color: "bg-green-100 text-green-700 border-green-200" },
  LEFT: { label: "Já Saiu", color: "bg-gray-100 text-gray-600 border-gray-200" },
};

export function VisitorsPage() {
  const { selectedCondominiumId, user } = useAuthStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: "",
    document: "",
    documentType: "RG",
    phone: "",
    company: "",
    reason: "",
    unitId: "",
  });
  const [entryCheckVisitor, setEntryCheckVisitor] = useState<any | null>(null);
  const [editModal, setEditModal] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    document: "",
    documentType: "RG",
    phone: "",
    company: "",
    reason: "",
    notes: "",
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  const { data: unitsData } = useQuery({
    queryKey: ["units", selectedCondominiumId],
    queryFn: async () => {
      const res = await api.get(`/units/condominium/${selectedCondominiumId}`);
      return res.data.data.units as {
        id: string;
        identifier: string;
        block?: string;
      }[];
    },
    enabled: !!selectedCondominiumId && showModal,
  });

  type ActiveProvider = {
    id: string;
    name: string;
    serviceType: string;
    document?: string;
    phone?: string;
    company?: string;
  };
  type ActiveRenovation = {
    id: string;
    description: string;
    type: string;
    authorizedProviders: ActiveProvider[];
  };

  const { data: entryCheckRenovations, isLoading: entryCheckLoading } =
    useQuery({
      queryKey: ["active-providers", entryCheckVisitor?.unitId],
      queryFn: async () => {
        const res = await api.get(
          `/renovations/unit/${entryCheckVisitor!.unitId}/active-providers`,
        );
        return res.data.data.renovations as ActiveRenovation[];
      },
      enabled: !!entryCheckVisitor?.unitId,
    });

  const { data: formUnitRenovations } = useQuery({
    queryKey: ["active-providers", form.unitId],
    queryFn: async () => {
      const res = await api.get(
        `/renovations/unit/${form.unitId}/active-providers`,
      );
      return res.data.data.renovations as ActiveRenovation[];
    },
    enabled: !!form.unitId && showModal,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["visitors", selectedCondominiumId, statusFilter],
    queryFn: async () => {
      const status = statusFilter === "ALL" ? undefined : (statusFilter || undefined);
      const res = await api.get(
        `/visitors/condominium/${selectedCondominiumId}`,
        {
          params: { status, limit: 50 },
        },
      );
      return res.data.data;
    },
    enabled: !!selectedCondominiumId,
  });

  const entryMutation = useMutation({
    mutationFn: (id: string) => api.post(`/visitors/${id}/entry`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["visitors"] }),
  });

  const exitMutation = useMutation({
    mutationFn: (id: string) => api.post(`/visitors/${id}/exit`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["visitors"] }),
  });

  const denyMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/visitors/${id}/authorize`, { authorized: false }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["visitors"] }),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => api.post("/visitors", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
      setShowModal(false);
      setFormErrors({});
      setForm({
        name: "",
        document: "",
        documentType: "RG",
        phone: "",
        company: "",
        reason: "",
        unitId: "",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...d }: typeof editForm & { id: string }) =>
      api.patch(`/visitors/${id}`, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
      setEditErrors({});
      setEditModal(false);
      setEditTarget(null);
    },
  });

  const rawVisitors = data?.visitors || [];
  const metrics = {
    inside: rawVisitors.filter((v: any) => v.status === "INSIDE").length,
    today: rawVisitors.filter((v: any) => 
      v.entryAt && new Date(v.entryAt).toDateString() === new Date().toDateString()
    ).length,
    pending: rawVisitors.filter((v: any) => v.status === "PENDING").length,
    denied: rawVisitors.filter((v: any) => v.status === "DENIED").length,
  };

  const visitors = rawVisitors.filter((v: any) => {
    const matchesSearch = 
      (v.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (v.unit?.identifier ?? "").toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = 
      !statusFilter || statusFilter === "ALL" || v.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const canRegisterEntry = [
    "DOORMAN",
    "CONDOMINIUM_ADMIN",
    "SYNDIC",
    "SUPER_ADMIN",
  ].includes(user?.role || "");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Visitantes</h1>
          <p className="text-muted-foreground">
            Controle de entrada e saída de visitantes
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Registrar Visitante
        </button>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
              <Skeleton className="h-12 w-12" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-12" />
              </div>
            </div>
          ))
        ) : (
          <>
            <div className="bg-white p-4 rounded-xl border border-green-100 shadow-sm flex items-center gap-4">
              <div className="bg-green-100 p-2.5 rounded-lg text-green-600">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">No Condomínio</p>
                <p className="text-2xl font-bold text-gray-800">{metrics.inside}</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm flex items-center gap-4">
              <div className="bg-blue-100 p-2.5 rounded-lg text-blue-600">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Acessos Hoje</p>
                <p className="text-2xl font-bold text-gray-800">{metrics.today}</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm flex items-center gap-4">
              <div className="bg-amber-100 p-2.5 rounded-lg text-amber-600">
                <Bell className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Pendentes</p>
                <p className="text-2xl font-bold text-gray-800">{metrics.pending}</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-red-100 shadow-sm flex items-center gap-4">
              <div className="bg-red-100 p-2.5 rounded-lg text-red-600">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Negados</p>
                <p className="text-2xl font-bold text-gray-800">{metrics.denied}</p>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="space-y-4">
        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome do visitante ou unidade..."
            className="w-full pl-9 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
          />
        </div>

        {/* Filtros rápidos (Chips) */}
        <div className="flex flex-wrap items-center gap-2 pb-2">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mr-2">Status:</span>
          {[
            { id: "ALL", label: "Tudo", icon: Users },
            { id: "INSIDE", label: "No Condomínio", icon: Building2 },
            { id: "AUTHORIZED", label: "Autorizados", icon: UserCheck },
            { id: "PENDING", label: "Pendentes", icon: Clock },
            { id: "LEFT", label: "Já Saíram", icon: LogOut },
            { id: "DENIED", label: "Negados", icon: XCircle, color: "text-red-600" },
          ].map((chip) => {
            const Icon = chip.icon;
            const active = (statusFilter || "ALL") === chip.id;
            return (
              <button
                key={chip.id}
                onClick={() => setStatusFilter(chip.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                  active 
                    ? "bg-blue-600 border-blue-600 text-white shadow-md scale-105" 
                    : "bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-blue-50"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? "text-white" : chip.color || "text-gray-400"}`} />
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        {isLoading ? (
          <VisitorTableSkeleton />
        ) : visitors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-muted-foreground bg-gray-50/30">
            <div className="bg-white p-6 rounded-full shadow-sm border border-gray-100">
              <Users className="w-12 h-12 text-gray-300" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-gray-600">Nenhum visitante encontrado</p>
              <p className="text-sm">Tente ajustar seus filtros ou busca.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Visitante
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Unidade
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Entrada
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Saída
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Status
                  </th>
                  {canRegisterEntry && (
                    <th className="text-right px-4 py-3 font-medium text-gray-600">
                      Ações
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y">
                {visitors.map((v: any) => {
                  const isLongStay = v.status === "INSIDE" && 
                                    v.entryAt && 
                                    (Date.now() - new Date(v.entryAt).getTime()) > 6 * 60 * 60 * 1000;
                  
                  return (
                    <tr key={v.id} className={`hover:bg-gray-50 transition-colors ${isLongStay ? 'bg-red-50/30' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-800">{v.name}</span>
                          {v.company && (
                            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-bold uppercase tracking-wider">
                              {v.company}
                            </span>
                          )}
                        </div>
                        {isLongStay && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 uppercase">
                            <Clock className="w-3 h-3" /> Permanência Longa (+6h)
                          </span>
                        )}
                        <div className="flex items-center gap-2 text-[11px] text-gray-400">
                          {v.document && (
                            <span>{v.documentType}: {v.document}</span>
                          )}
                          {v.phone && (
                            <span> · Tel: {v.phone}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium">
                        {v.unit?.block ? `${v.unit.block} - ` : ""}
                        {v.unit?.identifier}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {v.entryAt ? formatDateTime(v.entryAt) : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {v.exitAt ? formatDateTime(v.exitAt) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_LABELS[v.status]?.color}`}
                      >
                        {STATUS_LABELS[v.status]?.label}
                      </span>
                    </td>
                    {canRegisterEntry && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center gap-1 justify-end">
                          {(v.status === "PENDING" ||
                            v.status === "AUTHORIZED") && (
                            <button
                              onClick={() => {
                                setEditTarget(v);
                                setEditForm({
                                  name: v.name,
                                  document: v.document || "",
                                  documentType: v.documentType || "RG",
                                  phone: v.phone || "",
                                  company: v.company || "",
                                  reason: v.reason || "",
                                  notes: v.notes || "",
                                });
                                setEditModal(true);
                              }}
                              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Editar visitante"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {(v.status === "AUTHORIZED" || v.status === "PENDING") && (
                            <button
                              onClick={() => setEntryCheckVisitor(v)}
                              disabled={entryMutation.isPending}
                              title="Registrar Entrada"
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            >
                              <LogIn className="w-4 h-4" />
                            </button>
                          )}
                          {(v.status === "AUTHORIZED" || v.status === "PENDING") && (
                            <button
                              onClick={() => {
                                if (confirm(`Negar entrada de ${v.name}?`)) {
                                  denyMutation.mutate(v.id);
                                }
                              }}
                              disabled={denyMutation.isPending}
                              title="Negar Entrada"
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                          {v.status === "INSIDE" && (
                            <button
                              onClick={() => {
                                if (confirm(`Confirmar saída de ${v.name}?`)) {
                                  exitMutation.mutate(v.id);
                                }
                              }}
                              disabled={exitMutation.isPending}
                              title="Registrar Saída"
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              {exitMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <LogOut className="w-4 h-4" />
                              )}
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

      {/* Modal de registro */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold">Registrar Visitante</h2>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <label className="text-sm font-medium">Nome *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.name ? 'border-red-400' : ''}`}
                  placeholder="Nome completo"
                />
                {formErrors.name && <p className="text-xs text-red-500 mt-0.5">{formErrors.name}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Documento</label>
                <input
                  value={form.document}
                  onChange={(e) =>
                    setForm({ ...form, document: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Número"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Tipo</label>
                <select
                  value={form.documentType}
                  onChange={(e) =>
                    setForm({ ...form, documentType: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="RG">RG</option>
                  <option value="CPF">CPF</option>
                  <option value="CNH">CNH</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Telefone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: maskPhone(e.target.value) })}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.phone ? 'border-red-400' : ''}`}
                  placeholder="(11) 99999-0000"
                />
                {formErrors.phone && <p className="text-xs text-red-500 mt-0.5">{formErrors.phone}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Empresa</label>
                <input
                  value={form.company}
                  onChange={(e) =>
                    setForm({ ...form, company: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Opcional"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-sm font-medium">Motivo da visita</label>
                <input
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: visita familiar, entrega, etc."
                />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-sm font-medium">Unidade *</label>
                <select
                  value={form.unitId}
                  onChange={(e) => setForm({ ...form, unitId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione a unidade...</option>
                  {(unitsData || []).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.block ? `Bloco ${u.block} — ` : ""}
                      {u.identifier}
                    </option>
                  ))}
                </select>
              </div>

              {form.unitId &&
                formUnitRenovations &&
                formUnitRenovations.length > 0 && (
                  <div className="col-span-2 p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                    <p className="text-xs font-semibold text-amber-800 flex items-center gap-1">
                      <Wrench className="w-3 h-3" />
                      {formUnitRenovations.length === 1
                        ? "Obra ativa"
                        : `${formUnitRenovations.length} obras ativas`}{" "}
                      nesta unidade
                    </p>
                    {formUnitRenovations.map((r) => (
                      <div key={r.id} className="space-y-0.5">
                        <p className="text-xs font-medium text-amber-700">
                          {r.description.length > 60
                            ? r.description.slice(0, 60) + "..."
                            : r.description}
                        </p>
                        {r.authorizedProviders.length > 0 ? (
                          r.authorizedProviders.map((p) => (
                            <p key={p.id} className="text-xs text-amber-600">
                              • {p.name} ({p.serviceType})
                              {p.company ? ` — ${p.company}` : ""}
                            </p>
                          ))
                        ) : (
                          <p className="text-xs text-amber-500 italic">
                            Sem prestadores cadastrados
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setShowModal(false); setFormErrors({}); }}
                className="flex-1 px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const errors: Record<string, string> = {};
                  if (!form.name.trim() || form.name.trim().length < 2) errors.name = 'Nome deve ter pelo menos 2 caracteres';
                  const phoneErr = validatePhone(form.phone);
                  if (phoneErr) errors.phone = phoneErr;
                  if (Object.keys(errors).length) { setFormErrors(errors); return; }
                  setFormErrors({});
                  createMutation.mutate(form);
                }}
                disabled={
                  createMutation.isPending || !form.name || !form.unitId
                }
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {createMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  "Registrar"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal de verificação de entrada */}
      {entryCheckVisitor && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold">Confirmar Entrada</h2>

            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="font-medium">{entryCheckVisitor.name}</p>
              {entryCheckVisitor.company && (
                <p className="text-sm text-muted-foreground">
                  {entryCheckVisitor.company}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                Unidade:{" "}
                {entryCheckVisitor.unit?.block
                  ? `${entryCheckVisitor.unit.block} - `
                  : ""}
                {entryCheckVisitor.unit?.identifier}
              </p>
            </div>

            {entryCheckLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              </div>
            ) : entryCheckRenovations && entryCheckRenovations.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-amber-700">
                  <AlertTriangle className="w-4 h-4" />
                  <p className="text-sm font-medium">
                    {entryCheckRenovations.length === 1
                      ? "Obra ativa"
                      : `${entryCheckRenovations.length} obras ativas`}{" "}
                    nesta unidade — verifique se o visitante é prestador
                    autorizado:
                  </p>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {entryCheckRenovations.map((r) => (
                    <div
                      key={r.id}
                      className="p-2 bg-amber-50 border border-amber-100 rounded text-xs space-y-1"
                    >
                      <p className="font-medium text-amber-800">
                        {r.description.length > 80
                          ? r.description.slice(0, 80) + "..."
                          : r.description}
                      </p>
                      {r.authorizedProviders.length > 0 ? (
                        r.authorizedProviders.map((p) => (
                          <p key={p.id} className="text-amber-700">
                            • {p.name} — {p.serviceType}
                            {p.document ? ` (${p.document})` : ""}
                            {p.company ? ` · ${p.company}` : ""}
                          </p>
                        ))
                      ) : (
                        <p className="text-amber-500 italic">
                          Sem prestadores cadastrados nesta obra
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhuma obra ativa nesta unidade.
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setEntryCheckVisitor(null)}
                className="flex-1 px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  entryMutation.mutate(entryCheckVisitor.id);
                  setEntryCheckVisitor(null);
                }}
                disabled={entryMutation.isPending}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {entryMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    Confirmar Entrada
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de edição */}
      {editModal && editTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold">Editar Visitante</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <label className="text-sm font-medium">Nome *</label>
                <input
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${editErrors.name ? 'border-red-400' : ''}`}
                  placeholder="Nome completo"
                />
                {editErrors.name && <p className="text-xs text-red-500 mt-0.5">{editErrors.name}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Documento</label>
                <input
                  value={editForm.document}
                  onChange={(e) =>
                    setEditForm({ ...editForm, document: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Número"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Tipo</label>
                <select
                  value={editForm.documentType}
                  onChange={(e) =>
                    setEditForm({ ...editForm, documentType: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="RG">RG</option>
                  <option value="CPF">CPF</option>
                  <option value="CNH">CNH</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Telefone</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm({ ...editForm, phone: maskPhone(e.target.value) })
                  }
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${editErrors.phone ? 'border-red-400' : ''}`}
                  placeholder="(11) 99999-0000"
                />
                {editErrors.phone && <p className="text-xs text-red-500 mt-0.5">{editErrors.phone}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Empresa</label>
                <input
                  value={editForm.company}
                  onChange={(e) =>
                    setEditForm({ ...editForm, company: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Opcional"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-sm font-medium">Motivo da visita</label>
                <input
                  value={editForm.reason}
                  onChange={(e) =>
                    setEditForm({ ...editForm, reason: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: visita familiar, entrega..."
                />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-sm font-medium">Observações</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) =>
                    setEditForm({ ...editForm, notes: e.target.value })
                  }
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setEditModal(false);
                  setEditTarget(null);
                  setEditErrors({});
                }}
                className="flex-1 px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const errors: Record<string, string> = {};
                  if (!editForm.name.trim() || editForm.name.trim().length < 2) errors.name = 'Nome deve ter pelo menos 2 caracteres';
                  const phoneErr = validatePhone(editForm.phone);
                  if (phoneErr) errors.phone = phoneErr;
                  if (Object.keys(errors).length) { setEditErrors(errors); return; }
                  setEditErrors({});
                  updateMutation.mutate({ ...editForm, id: editTarget.id });
                }}
                disabled={updateMutation.isPending || !editForm.name}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {updateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  "Salvar"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
