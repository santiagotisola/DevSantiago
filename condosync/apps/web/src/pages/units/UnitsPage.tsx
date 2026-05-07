import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../store/authStore";
import { api } from "../../services/api";
import {
  Building2,
  Plus,
  Search,
  Loader2,
  Home,
  Users,
  Shield,
  AlertTriangle,
  Filter,
  MoreHorizontal,
  Pencil,
  Trash2,
  ChevronRight,
  X,
  LayoutGrid,
  TrendingUp,
  Activity,
  CheckCircle,
  Info,
  Baby,
  UserPlus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Status Design ──────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  OCCUPIED: { label: "Ocupada", color: "bg-emerald-100 text-emerald-700" },
  VACANT: { label: "Vaga", color: "bg-gray-100 text-gray-700" },
  UNDER_RENOVATION: {
    label: "Em Reforma",
    color: "bg-amber-100 text-amber-700",
  },
  BLOCKED: { label: "Bloqueada", color: "bg-rose-100 text-rose-700" },
};

// ─── Skeleton Loading Components ──────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />
  );
}

function UnitTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex gap-4 p-4 border-b">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 flex-1" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-20" />
        </div>
      ))}
    </div>
  );
}

export function UnitsPage() {
  const { selectedCondominiumId, user } = useAuthStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [blockFilter, setBlockFilter] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [selectedResidentId, setSelectedResidentId] = useState("");
  const [showDependentForm, setShowDependentForm] = useState(false);
  const [dependentForm, setDependentForm] = useState({
    name: "",
    relationship: "",
    birthDate: "",
    cpf: "",
  });

  const [form, setForm] = useState({
    identifier: "",
    block: "",
    street: "",
    floor: "",
    fraction: "",
    type: "",
  });
  const [editForm, setEditForm] = useState({
    identifier: "",
    block: "",
    street: "",
    floor: "",
    fraction: "",
    type: "",
    status: "VACANT",
  });

  const isAdmin = ["CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"].includes(
    user?.role || "",
  );

  const { data: units, isLoading } = useQuery({
    queryKey: ["units", selectedCondominiumId],
    queryFn: async () => {
      const res = await api.get(`/units/condominium/${selectedCondominiumId}`);
      return res.data.data.units;
    },
    enabled: !!selectedCondominiumId,
  });

  const { data: allResidents } = useQuery({
    queryKey: ["residents", selectedCondominiumId],
    queryFn: async () => {
      const res = await api.get(`/residents/condominium/${selectedCondominiumId}`);
      return res.data.data.residents as any[];
    },
    enabled: !!selectedCondominiumId && editModal,
  });

  // ─── Computed Data ──────────────────────────────────────────────────
  const blocks = useMemo(() => {
    if (!units) return [];
    const b = new Set<string>();
    units.forEach((u: any) => u.block && b.add(u.block));
    return Array.from(b).sort();
  }, [units]);

  const metrics = useMemo(() => {
    if (!units) return { total: 0, occupied: 0, vacant: 0, blocked: 0 };
    return units.reduce(
      (acc: any, u: any) => {
        acc.total++;
        if (u.status === "OCCUPIED") acc.occupied++;
        if (u.status === "VACANT") acc.vacant++;
        if (u.status === "BLOCKED") acc.blocked++;
        return acc;
      },
      { total: 0, occupied: 0, vacant: 0, blocked: 0 },
    );
  }, [units]);

  const filtered = useMemo(() => {
    if (!units) return [];
    return units
      .filter(
        (u: any) =>
          (!search ||
            u.identifier?.toLowerCase().includes(search.toLowerCase()) ||
            u.block?.toLowerCase().includes(search.toLowerCase()) ||
            u.residents?.some((r: any) =>
              r.user?.name?.toLowerCase().includes(search.toLowerCase()),
            ) ||
            u.dependents?.some((d: any) =>
              d.name?.toLowerCase().includes(search.toLowerCase()),
            )) &&
          (statusFilter === "ALL" || u.status === statusFilter) &&
          (!blockFilter || u.block === blockFilter),
      )
      .sort((a: any, b: any) => {
        const numA = parseInt(a.identifier.replace(/\D/g, "")) || 0;
        const numB = parseInt(b.identifier.replace(/\D/g, "")) || 0;
        return numA - numB;
      });
  }, [units, search, statusFilter, blockFilter]);

  // Unidade atual derivada do cache — atualiza automaticamente após vincular morador
  const currentUnit = useMemo(
    () => (editTarget ? (units?.find((u: any) => u.id === editTarget.id) ?? editTarget) : null),
    [units, editTarget],
  );

  // ─── Mutations ──────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (d: any) =>
      api.post("/units", {
        ...d,
        condominiumId: selectedCondominiumId,
        fraction: d.fraction ? parseFloat(d.fraction) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units"] });
      setShowModal(false);
      setForm({
        identifier: "",
        block: "",
        street: "",
        floor: "",
        fraction: "",
        type: "",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (d: any) =>
      api.put(`/units/${editTarget?.id}`, {
        ...d,
        fraction: d.fraction ? parseFloat(d.fraction) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units"] });
      setEditModal(false);
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (unit: any) =>
      api.put(`/units/${unit.id}`, {
        status: unit.status === "BLOCKED" ? "VACANT" : "BLOCKED",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["units"] }),
  });

  const assignResidentMutation = useMutation({
    mutationFn: ({ residentId, unitId }: { residentId: string; unitId: string }) =>
      api.patch(`/residents/${residentId}`, { unitId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units"] });
      queryClient.invalidateQueries({ queryKey: ["residents"] });
      setSelectedResidentId("");
    },
  });

  const unassignResidentMutation = useMutation({
    mutationFn: (residentId: string) =>
      api.patch(`/residents/${residentId}`, { unitId: null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units"] });
      queryClient.invalidateQueries({ queryKey: ["residents"] });
    },
  });

  const addDependentMutation = useMutation({
    mutationFn: (payload: any) => api.post("/residents/dependents", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units"] });
      setShowDependentForm(false);
      setDependentForm({ name: "", relationship: "", birthDate: "", cpf: "" });
    },
  });

  const removeDependentMutation = useMutation({
    mutationFn: (dependentId: string) =>
      api.delete(`/residents/dependents/${dependentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units"] });
    },
  });

  // Mantém o editTarget sincronizado com a query units enquanto o modal está aberto
  useEffect(() => {
    if (!editModal || !editTarget || !units) return;
    const fresh = units.find((u: any) => u.id === editTarget.id);
    if (fresh && fresh !== editTarget) setEditTarget(fresh);
  }, [units, editModal, editTarget]);

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestão de Unidades</h1>
          <p className="text-muted-foreground">
            Mapa de ocupação e cadastro de imóveis
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nova Unidade
          </button>
        )}
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4"
            >
              <Skeleton className="h-12 w-12 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-12" />
              </div>
            </div>
          ))
        ) : (
          <>
            <div className="bg-white p-5 rounded-2xl border border-blue-50 shadow-sm hover:shadow-md transition-all flex items-center gap-5">
              <div className="bg-blue-50 p-3.5 rounded-xl text-blue-600">
                <Home className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                  Total de Unidades
                </p>
                <p className="text-2xl font-bold text-gray-800">
                  {metrics.total}
                </p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-green-50 shadow-sm hover:shadow-md transition-all flex items-center gap-5">
              <div className="bg-green-50 p-3.5 rounded-xl text-green-600">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                  Ocupadas
                </p>
                <p className="text-2xl font-bold text-gray-800">
                  {metrics.occupied}
                </p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-amber-50 shadow-sm hover:shadow-md transition-all flex items-center gap-5">
              <div className="bg-amber-50 p-3.5 rounded-xl text-amber-600">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                  Taxa de Ocupação
                </p>
                <p className="text-2xl font-bold text-gray-800">
                  {((metrics.occupied / metrics.total || 0) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-gray-50 shadow-sm hover:shadow-md transition-all flex items-center gap-5">
              <div className="bg-gray-50 p-3.5 rounded-xl text-gray-600">
                <LayoutGrid className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                  Vagas
                </p>
                <p className="text-2xl font-bold text-gray-800">
                  {metrics.vacant}
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Busca e Filtros */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por unidade, bloco ou morador..."
              className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={blockFilter}
              onChange={(e) => setBlockFilter(e.target.value)}
              className="px-4 py-3.5 bg-white border border-gray-100 rounded-2xl text-sm font-bold text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 min-w-[160px] shadow-sm cursor-pointer"
            >
              <option value="">Todos os Blocos</option>
              {blocks.map((b) => (
                <option key={b} value={b}>
                  Bloco {b}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filtros rápidos (Chips) */}
        <div className="flex flex-wrap items-center gap-2 pb-2">
          {[
            { id: "ALL", label: "Tudo", icon: LayoutGrid },
            { id: "OCCUPIED", label: "Ocupadas", icon: Users },
            { id: "VACANT", label: "Vagas", icon: Home },
            {
              id: "BLOCKED",
              label: "Bloqueadas",
              icon: Shield,
              color: "text-red-500",
            },
            {
              id: "UNDER_RENOVATION",
              label: "Em Reforma",
              icon: Activity,
              color: "text-amber-500",
            },
          ].map((chip) => {
            const Icon = chip.icon;
            const active = statusFilter === chip.id;
            return (
              <button
                key={chip.id}
                onClick={() => setStatusFilter(chip.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border whitespace-nowrap shadow-sm hover:shadow-md active:scale-95 ${
                  active
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "bg-white border-gray-100 text-gray-500 hover:bg-gray-50"
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 ${active ? "text-white" : chip.color || "text-gray-400"}`}
                />
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Lista de Unidades */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        {isLoading ? (
          <UnitTableSkeleton />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
            <div className="bg-gray-50 p-6 rounded-3xl">
              <Building2 className="w-12 h-12 text-gray-300" />
            </div>
            <div className="text-center">
              <p className="font-bold text-gray-600">
                Nenhuma unidade encontrada
              </p>
              <p className="text-sm">Tente ajustar seus filtros ou busca.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 p-3 bg-gray-50/30">
            {filtered.map((u: any) => {
              const st = STATUS_CONFIG[u.status] || STATUS_CONFIG.VACANT;
              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  key={u.id}
                  className="group relative bg-white border border-gray-100 rounded-xl p-4 text-center hover:shadow-lg hover:border-blue-100 transition-all duration-300"
                >
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setEditForm({
                          identifier: u.identifier ?? "",
                          block: u.block ?? "",
                          street: u.street ?? "",
                          floor: u.floor ?? "",
                          fraction: u.fraction ? String(u.fraction) : "",
                          type: u.type ?? "",
                          status: u.status ?? "VACANT",
                        });
                        setSelectedResidentId("");
                        setEditTarget(u);
                        setEditModal(true);
                      }}
                      className="p-1.5 bg-white text-gray-400 hover:text-blue-600 rounded-lg border border-gray-100 transition-colors shadow-sm"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="text-xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                    {u.identifier}
                  </div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                    {u.block ? `Bloco ${u.block}` : u.type || "Unidade"}
                  </div>

                  <div
                    className={`mt-3 inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${st.color}`}
                  >
                    {st.label}
                  </div>

                  <div className="mt-4 min-h-[24px] flex flex-col items-center justify-center gap-1">
                    {(u.residents && u.residents.length > 0) ||
                    (u.dependents && u.dependents.length > 0) ? (
                      <>
                        {u.residents?.map((r: any) => (
                          <div
                            key={r.id}
                            title={`Morador: ${r.user?.name}`}
                            className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-2 py-1 rounded-lg w-full justify-center"
                          >
                            <Users className="w-3 h-3" />
                            <span className="text-[10px] font-bold truncate">
                              {r.user?.name?.split(" ")[0]}
                            </span>
                          </div>
                        ))}
                        {u.dependents?.map((d: any) => (
                          <div
                            key={d.id}
                            title={`Dependente: ${d.name} (${d.relationship})`}
                            className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg w-full justify-center"
                          >
                            <Baby className="w-3 h-3" />
                            <span className="text-[10px] font-bold truncate">
                              {d.name?.split(" ")[0]}
                            </span>
                          </div>
                        ))}
                      </>
                    ) : (
                      <span className="text-[10px] text-gray-300 font-medium italic">
                        Sem morador
                      </span>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="mt-3 pt-3 border-t border-gray-50 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => toggleStatusMutation.mutate(u)}
                        className={`w-full text-[9px] font-bold uppercase tracking-widest py-1.5 rounded-lg transition-colors ${u.status === "BLOCKED" ? "text-emerald-600 hover:bg-emerald-50" : "text-rose-600 hover:bg-rose-50"}`}
                      >
                        {u.status === "BLOCKED" ? "Liberar" : "Bloquear"}
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {/* Modal Nova Unidade */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden shadow-2xl"
            >
              {/* Cabeçalho Fixo */}
              <div className="p-4 border-b shrink-0 flex items-center justify-between bg-white">
                <div className="flex items-center gap-2 text-blue-600">
                  <Building2 className="w-5 h-5" />
                  <h2 className="text-lg font-semibold text-gray-800">
                    Cadastrar Unidade
                  </h2>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Conteúdo Rolável */}
              <div className="p-5 overflow-y-auto flex-1 space-y-5 custom-scrollbar">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase">
                    Identificador da Unidade *
                  </label>
                  <input
                    autoFocus
                    value={form.identifier}
                    onChange={(e) =>
                      setForm({ ...form, identifier: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    placeholder="Ex: Apt 101, Casa 15"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase">
                      Bloco
                    </label>
                    <input
                      value={form.block}
                      onChange={(e) =>
                        setForm({ ...form, block: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="Ex: A, B"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase">
                      Andar
                    </label>
                    <input
                      value={form.floor}
                      onChange={(e) =>
                        setForm({ ...form, floor: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="Ex: 1º, Térreo"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase">
                    Endereço / Rua
                  </label>
                  <input
                    value={form.street}
                    onChange={(e) =>
                      setForm({ ...form, street: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    placeholder="Opcional"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase">
                      Fração Ideal (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.fraction}
                      onChange={(e) =>
                        setForm({ ...form, fraction: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase">
                      Tipo
                    </label>
                    <select
                      value={form.type}
                      onChange={(e) =>
                        setForm({ ...form, type: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">Selecionar...</option>
                      <option value="Apartamento">Apartamento</option>
                      <option value="Casa">Casa</option>
                      <option value="Lote">Lote</option>
                      <option value="Sala Comercial">Sala Comercial</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Rodapé Fixo */}
              <div className="p-4 border-t shrink-0 flex gap-3 bg-gray-50 rounded-b-xl">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border bg-white rounded-lg text-sm font-medium hover:bg-gray-50 transition-all text-gray-600"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => createMutation.mutate(form)}
                  disabled={!form.identifier || createMutation.isPending}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md"
                >
                  {createMutation.isPending ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Salvando...</span>
                    </div>
                  ) : (
                    "Criar Unidade"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal Editar Unidade */}
        {editModal && editTarget && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden shadow-2xl"
            >
              <div className="p-4 border-b shrink-0 flex items-center justify-between bg-white">
                <div className="flex items-center gap-2 text-blue-600">
                  <Pencil className="w-5 h-5" />
                  <h2 className="text-lg font-semibold text-gray-800">
                    Configurações da Unidade
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setEditModal(false);
                    setShowDependentForm(false);
                    setDependentForm({ name: "", relationship: "", birthDate: "", cpf: "" });
                  }}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto flex-1 space-y-5 custom-scrollbar">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase">
                    Identificador da Unidade
                  </label>
                  <input
                    value={editForm.identifier}
                    onChange={(e) =>
                      setEditForm({ ...editForm, identifier: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase">
                      Bloco
                    </label>
                    <input
                      value={editForm.block}
                      onChange={(e) =>
                        setEditForm({ ...editForm, block: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase">
                      Andar
                    </label>
                    <input
                      value={editForm.floor}
                      onChange={(e) =>
                        setEditForm({ ...editForm, floor: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                </div>

                {/* Status */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase">
                    Status da Unidade
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="VACANT">Vaga</option>
                    <option value="OCCUPIED">Ocupada</option>
                    <option value="UNDER_RENOVATION">Em Reforma</option>
                    <option value="BLOCKED">Bloqueada</option>
                  </select>
                </div>

                {/* Moradores atuais */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase">
                    Moradores Vinculados
                  </label>
                  {currentUnit?.residents && currentUnit.residents.length > 0 ? (
                    <div className="space-y-2">
                      {currentUnit.residents.map((r: any) => (
                        <div
                          key={r.id}
                          className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg"
                        >
                          <Users className="w-4 h-4 text-blue-600 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-blue-800 truncate">
                              {r.user?.name}
                            </p>
                            {r.user?.email && (
                              <p className="text-xs text-blue-600/70 truncate">
                                {r.user.email}
                              </p>
                            )}
                          </div>
                          {isAdmin && (
                            <button
                              onClick={() => unassignResidentMutation.mutate(r.id)}
                              disabled={unassignResidentMutation.isPending}
                              title="Desvincular morador"
                              className="p-1.5 text-rose-500 hover:bg-rose-100 rounded-lg transition-colors disabled:opacity-50 shrink-0"
                            >
                              {unassignResidentMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <X className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">Nenhum morador vinculado</p>
                  )}
                </div>

                {/* Vincular morador */}
                {isAdmin && (() => {
                  const availableResidents = (allResidents ?? []).filter(
                    (r: any) => !r.unit,
                  );
                  return (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">
                        Vincular Morador a Esta Unidade
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={selectedResidentId}
                          onChange={(e) => setSelectedResidentId(e.target.value)}
                          disabled={availableResidents.length === 0}
                          className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-50 disabled:text-gray-400"
                        >
                          {availableResidents.length === 0 ? (
                            <option value="">Nenhum morador disponível</option>
                          ) : (
                            <>
                              <option value="">Selecionar morador...</option>
                              {availableResidents.map((r: any) => (
                                <option key={r.id} value={r.id}>
                                  {r.user?.name}
                                </option>
                              ))}
                            </>
                          )}
                        </select>
                        <button
                          onClick={() => {
                            if (selectedResidentId && editTarget) {
                              assignResidentMutation.mutate({
                                residentId: selectedResidentId,
                                unitId: editTarget.id,
                              });
                            }
                          }}
                          disabled={
                            !selectedResidentId ||
                            assignResidentMutation.isPending ||
                            availableResidents.length === 0
                          }
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 shrink-0 transition-colors"
                        >
                          {assignResidentMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            "Vincular"
                          )}
                        </button>
                      </div>
                      {availableResidents.length === 0 && (
                        <p className="text-xs text-gray-500">
                          Todos os moradores já estão vinculados a uma unidade. Desvincule-os primeiro para reatribuir.
                        </p>
                      )}
                      {assignResidentMutation.isSuccess && (
                        <p className="text-xs text-green-600">
                          Morador vinculado com sucesso!
                        </p>
                      )}
                    </div>
                  );
                })()}

                {/* Dependentes */}
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-500 uppercase">
                      Dependentes
                    </label>
                    {isAdmin && !showDependentForm && (
                      <button
                        onClick={() => setShowDependentForm(true)}
                        className="flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Adicionar
                      </button>
                    )}
                  </div>

                  {currentUnit?.dependents && currentUnit.dependents.length > 0 ? (
                    <div className="space-y-2">
                      {currentUnit.dependents.map((d: any) => {
                        const age = d.birthDate
                          ? Math.floor(
                              (Date.now() - new Date(d.birthDate).getTime()) /
                                (365.25 * 24 * 60 * 60 * 1000),
                            )
                          : null;
                        return (
                          <div
                            key={d.id}
                            className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-lg"
                          >
                            <Baby className="w-4 h-4 text-emerald-700 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-emerald-900 truncate">
                                {d.name}
                              </p>
                              <p className="text-xs text-emerald-700/80 truncate">
                                {d.relationship}
                                {age !== null ? ` · ${age} ano${age === 1 ? "" : "s"}` : ""}
                              </p>
                            </div>
                            {isAdmin && (
                              <button
                                onClick={() => removeDependentMutation.mutate(d.id)}
                                disabled={removeDependentMutation.isPending}
                                title="Remover dependente"
                                className="p-1.5 text-rose-500 hover:bg-rose-100 rounded-lg transition-colors disabled:opacity-50 shrink-0"
                              >
                                {removeDependentMutation.isPending ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <X className="w-4 h-4" />
                                )}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    !showDependentForm && (
                      <p className="text-sm text-gray-400 italic">
                        Nenhum dependente cadastrado
                      </p>
                    )
                  )}

                  {showDependentForm && isAdmin && (
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
                      <input
                        autoFocus
                        value={dependentForm.name}
                        onChange={(e) =>
                          setDependentForm({ ...dependentForm, name: e.target.value })
                        }
                        placeholder="Nome completo *"
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                      />
                      <input
                        value={dependentForm.relationship}
                        onChange={(e) =>
                          setDependentForm({
                            ...dependentForm,
                            relationship: e.target.value,
                          })
                        }
                        placeholder="Parentesco (filho, cônjuge, pai...) *"
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="date"
                          value={dependentForm.birthDate}
                          onChange={(e) =>
                            setDependentForm({
                              ...dependentForm,
                              birthDate: e.target.value,
                            })
                          }
                          className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                        />
                        <input
                          value={dependentForm.cpf}
                          onChange={(e) =>
                            setDependentForm({ ...dependentForm, cpf: e.target.value })
                          }
                          placeholder="CPF (opcional)"
                          className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                        />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => {
                            setShowDependentForm(false);
                            setDependentForm({
                              name: "",
                              relationship: "",
                              birthDate: "",
                              cpf: "",
                            });
                          }}
                          className="flex-1 px-3 py-1.5 border bg-white text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => {
                            if (
                              !editTarget ||
                              dependentForm.name.trim().length < 2 ||
                              dependentForm.relationship.trim().length < 2
                            )
                              return;
                            addDependentMutation.mutate({
                              unitId: editTarget.id,
                              name: dependentForm.name.trim(),
                              relationship: dependentForm.relationship.trim(),
                              ...(dependentForm.birthDate
                                ? {
                                    birthDate: new Date(
                                      dependentForm.birthDate,
                                    ).toISOString(),
                                  }
                                : {}),
                              ...(dependentForm.cpf
                                ? { cpf: dependentForm.cpf }
                                : {}),
                            });
                          }}
                          disabled={
                            addDependentMutation.isPending ||
                            dependentForm.name.trim().length < 2 ||
                            dependentForm.relationship.trim().length < 2
                          }
                          className="flex-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {addDependentMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                          ) : (
                            "Salvar"
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 border-t shrink-0 flex gap-3 bg-gray-50 rounded-b-xl">
                <button
                  onClick={() => {
                    setEditModal(false);
                    setShowDependentForm(false);
                    setDependentForm({ name: "", relationship: "", birthDate: "", cpf: "" });
                  }}
                  className="flex-1 px-4 py-2 border bg-white rounded-lg text-sm font-medium hover:bg-gray-50 transition-all text-gray-600"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => updateMutation.mutate(editForm)}
                  disabled={updateMutation.isPending}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all shadow-md"
                >
                  {updateMutation.isPending ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Salvando...</span>
                    </div>
                  ) : (
                    "Salvar Alterações"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
