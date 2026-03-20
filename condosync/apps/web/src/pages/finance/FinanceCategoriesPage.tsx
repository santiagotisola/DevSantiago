import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Pencil, Tag, ArrowUpCircle, ArrowDownCircle, Loader2 } from "lucide-react";
import { api } from "../../services/api";
import { useAuthStore } from "../../store/authStore";

interface FinancialCategory {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  description?: string;
  isActive: boolean;
}

const empty = { name: "", type: "EXPENSE" as "INCOME" | "EXPENSE", description: "" };

export function FinanceCategoriesPage() {
  const { selectedCondominiumId } = useAuthStore();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<FinancialCategory | null>(null);
  const [form, setForm] = useState(empty);

  const { data: categories = [], isLoading } = useQuery<FinancialCategory[]>({
    queryKey: ["finance-categories", selectedCondominiumId],
    queryFn: async () =>
      (await api.get(`/finance-categories/${selectedCondominiumId}`)).data.data,
    enabled: !!selectedCondominiumId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api.post("/finance-categories", { ...form, condominiumId: selectedCondominiumId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance-categories"] });
      setShowModal(false);
      setForm(empty);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (id: string) => api.put(`/finance-categories/${id}`, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance-categories"] });
      setEditing(null);
      setShowModal(false);
      setForm(empty);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/finance-categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance-categories"] }),
  });

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setShowModal(true);
  }

  function openEdit(cat: FinancialCategory) {
    setEditing(cat);
    setForm({ name: cat.name, type: cat.type, description: cat.description ?? "" });
    setShowModal(true);
  }

  function handleSubmit() {
    if (editing) updateMutation.mutate(editing.id);
    else createMutation.mutate();
  }

  const income = categories.filter((c) => c.type === "INCOME");
  const expense = categories.filter((c) => c.type === "EXPENSE");
  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categorias Financeiras</h1>
          <p className="text-sm text-gray-500 mt-1">
            Organize receitas e despesas por categoria
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova categoria
        </button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      )}

      {/* Receitas */}
      {!isLoading && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <ArrowUpCircle className="w-5 h-5 text-emerald-600" />
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Receitas ({income.length})
            </h2>
          </div>
          {income.length === 0 ? (
            <p className="text-sm text-gray-400 pl-7">Nenhuma categoria de receita cadastrada.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {income.map((cat) => (
                <CategoryCard
                  key={cat.id}
                  cat={cat}
                  onEdit={() => openEdit(cat)}
                  onDelete={() => deleteMutation.mutate(cat.id)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Despesas */}
      {!isLoading && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <ArrowDownCircle className="w-5 h-5 text-rose-600" />
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Despesas ({expense.length})
            </h2>
          </div>
          {expense.length === 0 ? (
            <p className="text-sm text-gray-400 pl-7">Nenhuma categoria de despesa cadastrada.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {expense.map((cat) => (
                <CategoryCard
                  key={cat.id}
                  cat={cat}
                  onEdit={() => openEdit(cat)}
                  onDelete={() => deleteMutation.mutate(cat.id)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">
              {editing ? "Editar categoria" : "Nova categoria"}
            </h2>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Nome *</label>
                <input
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Taxa condominial"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600">Tipo *</label>
                <select
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as "INCOME" | "EXPENSE" })}
                >
                  <option value="INCOME">Receita</option>
                  <option value="EXPENSE">Despesa</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600">Descrição</label>
                <textarea
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Descrição opcional"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => { setShowModal(false); setEditing(null); }}
                className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={!form.name.trim() || isPending}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {editing ? "Salvar" : "Criar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryCard({
  cat,
  onEdit,
  onDelete,
}: {
  cat: FinancialCategory;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <Tag
          className={`w-4 h-4 ${cat.type === "INCOME" ? "text-emerald-500" : "text-rose-500"}`}
        />
        <div>
          <p className="text-sm font-medium text-gray-800">{cat.name}</p>
          {cat.description && (
            <p className="text-xs text-gray-400 truncate max-w-[160px]">{cat.description}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={onEdit}
          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
