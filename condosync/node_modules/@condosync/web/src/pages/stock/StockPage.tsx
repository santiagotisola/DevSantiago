import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Trash2,
  ArrowDownCircle,
  ArrowUpCircle,
  SlidersHorizontal,
  AlertTriangle,
  Package,
} from "lucide-react";
import api from "../../services/api";
import { useAuthStore } from "../../store/authStore";

const CATEGORIES = [
  "limpeza",
  "manutenção",
  "segurança",
  "escritório",
  "outro",
] as const;

interface Movement {
  id: string;
  type: "IN" | "OUT" | "ADJUSTMENT";
  quantity: number;
  reason?: string;
  createdAt: string;
}

interface StockItem {
  id: string;
  name: string;
  description?: string;
  category: string;
  unit: string;
  quantity: number;
  minQuantity: number;
  location?: string;
  movements: Movement[];
}

const CATEGORY_COLOR: Record<string, string> = {
  limpeza: "bg-blue-100 text-blue-800",
  manutenção: "bg-orange-100 text-orange-800",
  segurança: "bg-red-100 text-red-800",
  escritório: "bg-purple-100 text-purple-800",
  outro: "bg-gray-100 text-gray-700",
};

const MOVE_TYPES = [
  {
    value: "IN",
    label: "Entrada",
    icon: <ArrowDownCircle className="w-4 h-4 text-green-600" />,
  },
  {
    value: "OUT",
    label: "Saída",
    icon: <ArrowUpCircle className="w-4 h-4 text-red-600" />,
  },
  {
    value: "ADJUSTMENT",
    label: "Ajuste de inventário",
    icon: <SlidersHorizontal className="w-4 h-4 text-blue-600" />,
  },
];

const emptyForm = {
  name: "",
  description: "",
  category: CATEGORIES[0] as string,
  unit: "un",
  quantity: 0,
  minQuantity: 0,
  location: "",
};

export default function StockPage() {
  const { selectedCondominiumId } = useAuthStore();
  const condominiumId = selectedCondominiumId;
  const qc = useQueryClient();

  const [catFilter, setCatFilter] = useState("");
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<StockItem | null>(null);
  const [moveTarget, setMoveTarget] = useState<StockItem | null>(null);
  const [histTarget, setHistTarget] = useState<StockItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [moveForm, setMoveForm] = useState({
    type: "IN",
    quantity: 1,
    reason: "",
  });

  const { data: items = [], isLoading } = useQuery<StockItem[]>({
    queryKey: ["stock", condominiumId, catFilter, lowStockFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (catFilter) params.set("category", catFilter);
      if (lowStockFilter) params.set("lowStock", "true");
      const res = await api.get(`/stock/${condominiumId}?${params}`);
      return res.data.data.items;
    },
    enabled: !!condominiumId,
  });

  const { data: history = [] } = useQuery<Movement[]>({
    queryKey: ["stock-history", histTarget?.id],
    queryFn: async () => {
      const res = await api.get(`/stock/${histTarget!.id}/movements`);
      return res.data.data.movements;
    },
    enabled: !!histTarget,
  });

  const createMutation = useMutation({
    mutationFn: (body: object) => api.post("/stock", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock"] });
      setShowCreate(false);
      setForm(emptyForm);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) =>
      api.patch(`/stock/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock"] });
      setEditItem(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/stock/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stock"] }),
  });

  const moveMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) =>
      api.post(`/stock/${id}/movements`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock"] });
      qc.invalidateQueries({ queryKey: ["stock-history"] });
      setMoveTarget(null);
      setMoveForm({ type: "IN", quantity: 1, reason: "" });
    },
  });

  const handleCreate = () => {
    if (!condominiumId) return;
    createMutation.mutate({
      ...form,
      condominiumId,
      quantity: Number(form.quantity),
      minQuantity: Number(form.minQuantity),
    });
  };

  const handleUpdate = () => {
    if (!editItem) return;
    updateMutation.mutate({
      id: editItem.id,
      data: {
        ...form,
        minQuantity: Number(form.minQuantity),
      },
    });
  };

  const openEdit = (item: StockItem) => {
    setEditItem(item);
    setForm({
      name: item.name,
      description: item.description ?? "",
      category: item.category,
      unit: item.unit,
      quantity: item.quantity,
      minQuantity: item.minQuantity,
      location: item.location ?? "",
    });
  };

  const lowStockCount = items.filter(
    (i) => i.quantity <= i.minQuantity && i.minQuantity > 0,
  ).length;

  if (isLoading)
    return (
      <div className="p-8 text-center text-gray-400">Carregando estoque...</div>
    );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Controle de Estoque
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gerencie materiais de limpeza, manutenção e suprimentos
          </p>
        </div>
        <button
          onClick={() => {
            setShowCreate(true);
            setForm(emptyForm);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Novo Item
        </button>
      </div>

      {/* Alerta estoque baixo */}
      {lowStockCount > 0 && (
        <div className="mb-4 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-amber-800 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>
            <strong>
              {lowStockCount}{" "}
              {lowStockCount === 1 ? "item está" : "itens estão"}
            </strong>{" "}
            abaixo do estoque mínimo.
          </span>
          <button
            onClick={() => setLowStockFilter(true)}
            className="ml-auto text-amber-700 underline text-xs"
          >
            Ver somente estes
          </button>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-5">
        {[
          ["", "Todos"],
          ...CATEGORIES.map((c) => [c, c.charAt(0).toUpperCase() + c.slice(1)]),
        ].map(([val, label]) => (
          <button
            key={val}
            onClick={() => {
              setCatFilter(val);
              setLowStockFilter(false);
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${catFilter === val && !lowStockFilter ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}
          >
            {label}
          </button>
        ))}
        <button
          onClick={() => {
            setLowStockFilter((v) => !v);
            setCatFilter("");
          }}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors flex items-center gap-1 ${lowStockFilter ? "bg-amber-500 text-white border-amber-500" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}
        >
          <AlertTriangle className="w-3 h-3" /> Estoque baixo
        </button>
      </div>

      {/* Modal: criar / editar */}
      {(showCreate || editItem) && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-semibold mb-4">
              {editItem ? "Editar Item" : "Novo Item de Estoque"}
            </h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Nome *
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="Ex: Detergente líquido"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Categoria
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, category: e.target.value }))
                    }
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Unidade (un, kg, L…)
                  </label>
                  <input
                    value={form.unit}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, unit: e.target.value }))
                    }
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {editItem ? "Quantidade atual" : "Quantidade inicial"}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.quantity}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        quantity: Number(e.target.value),
                      }))
                    }
                    disabled={!!editItem}
                    className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Estoque mínimo (alerta)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.minQuantity}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        minQuantity: Number(e.target.value),
                      }))
                    }
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Local de armazenamento
                  </label>
                  <input
                    value={form.location}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, location: e.target.value }))
                    }
                    placeholder="Ex: Almoxarifado"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Descrição
                  </label>
                  <input
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, description: e.target.value }))
                    }
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button
                onClick={() => {
                  setShowCreate(false);
                  setEditItem(null);
                }}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={editItem ? handleUpdate : handleCreate}
                disabled={
                  createMutation.isPending ||
                  updateMutation.isPending ||
                  !form.name
                }
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Salvando..."
                  : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: movimento */}
      {moveTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-1">
              Registrar Movimentação
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              {moveTarget.name} · atual:{" "}
              <strong>
                {moveTarget.quantity} {moveTarget.unit}
              </strong>
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Tipo
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {MOVE_TYPES.map((t) => (
                    <button
                      key={t.value}
                      onClick={() =>
                        setMoveForm((f) => ({ ...f, type: t.value }))
                      }
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg border text-xs font-medium transition-colors ${moveForm.type === t.value ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 hover:bg-gray-50"}`}
                    >
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {moveForm.type === "ADJUSTMENT"
                    ? "Nova quantidade total"
                    : "Quantidade"}
                </label>
                <input
                  type="number"
                  min={moveForm.type === "ADJUSTMENT" ? 0 : 0.1}
                  step={0.1}
                  value={moveForm.quantity}
                  onChange={(e) =>
                    setMoveForm((f) => ({
                      ...f,
                      quantity: Number(e.target.value),
                    }))
                  }
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Motivo / Observação
                </label>
                <input
                  value={moveForm.reason}
                  onChange={(e) =>
                    setMoveForm((f) => ({ ...f, reason: e.target.value }))
                  }
                  placeholder="Opcional"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button
                onClick={() => setMoveTarget(null)}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() =>
                  moveMutation.mutate({ id: moveTarget.id, data: moveForm })
                }
                disabled={moveMutation.isPending || moveForm.quantity <= 0}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {moveMutation.isPending ? "Registrando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: histórico */}
      {histTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                Histórico — {histTarget.name}
              </h2>
              <button
                onClick={() => setHistTarget(null)}
                className="text-gray-400 hover:text-gray-600 text-lg"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {history.length === 0 ? (
                <p className="text-center text-gray-400 py-8 text-sm">
                  Nenhuma movimentação registrada
                </p>
              ) : (
                history.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    {m.type === "IN" ? (
                      <ArrowDownCircle className="w-5 h-5 text-green-600 shrink-0" />
                    ) : m.type === "OUT" ? (
                      <ArrowUpCircle className="w-5 h-5 text-red-600 shrink-0" />
                    ) : (
                      <SlidersHorizontal className="w-5 h-5 text-blue-600 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-semibold ${m.type === "IN" ? "text-green-700" : m.type === "OUT" ? "text-red-700" : "text-blue-700"}`}
                        >
                          {m.type === "IN" ? "+" : m.type === "OUT" ? "-" : "="}
                          {m.quantity} {histTarget.unit}
                        </span>
                        <span className="text-xs text-gray-400">
                          {m.type === "IN"
                            ? "Entrada"
                            : m.type === "OUT"
                              ? "Saída"
                              : "Ajuste"}
                        </span>
                      </div>
                      {m.reason && (
                        <p className="text-xs text-gray-500 truncate">
                          {m.reason}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">
                      {new Date(m.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lista */}
      {items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum item no estoque.</p>
          <p className="text-sm mt-1">Clique em "Novo Item" para adicionar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            const isLow =
              item.minQuantity > 0 && item.quantity <= item.minQuantity;
            return (
              <div
                key={item.id}
                className={`bg-white border rounded-xl shadow-sm p-4 flex flex-col gap-3 ${isLow ? "border-amber-300" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 text-sm truncate">
                        {item.name}
                      </span>
                      {isLow && (
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                      )}
                    </div>
                    <span
                      className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLOR[item.category] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {item.category}
                    </span>
                    {item.location && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        📍 {item.location}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className={`text-2xl font-bold ${isLow ? "text-amber-600" : "text-gray-800"}`}
                    >
                      {item.quantity}
                    </p>
                    <p className="text-xs text-gray-400">{item.unit}</p>
                  </div>
                </div>

                {item.minQuantity > 0 && (
                  <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>
                        Mínimo: {item.minQuantity} {item.unit}
                      </span>
                      <span>
                        {Math.round((item.quantity / item.minQuantity) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${isLow ? "bg-amber-500" : "bg-green-500"}`}
                        style={{
                          width: `${Math.min(100, (item.quantity / item.minQuantity) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-1 mt-auto pt-2 border-t">
                  <button
                    onClick={() => setMoveTarget(item)}
                    className="flex-1 text-xs bg-green-50 text-green-700 border border-green-200 py-1.5 rounded-lg hover:bg-green-100 font-medium"
                  >
                    Movimentar
                  </button>
                  <button
                    onClick={() => setHistTarget(item)}
                    className="flex-1 text-xs bg-gray-50 text-gray-600 border border-gray-200 py-1.5 rounded-lg hover:bg-gray-100 font-medium"
                  >
                    Histórico
                  </button>
                  <button
                    onClick={() => openEdit(item)}
                    className="px-3 text-xs bg-blue-50 text-blue-700 border border-blue-200 py-1.5 rounded-lg hover:bg-blue-100"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          "Excluir este item removera tambem o historico de movimentacoes. Continuar?",
                        )
                      ) {
                        deleteMutation.mutate(item.id);
                      }
                    }}
                    className="px-2.5 text-gray-300 hover:text-red-500 border border-gray-200 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
