import { useState, useEffect } from "react";
import { api } from "../../services/api";
import { useAuthStore } from "../../store/authStore";
import { AlertTriangle, Plus, Check, X, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";

interface Fine {
  id: string;
  unitId: string;
  description: string;
  regulation: string;
  amount: number;
  status: string;
  appealDeadline: string;
  appealText?: string;
  appealStatus?: string;
  appealResponse?: string;
  createdAt: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING:   { label: "Pendente",   color: "bg-yellow-100 text-yellow-800" },
  APPEAL:    { label: "Em Recurso", color: "bg-blue-100 text-blue-800" },
  CONFIRMED: { label: "Confirmada", color: "bg-red-100 text-red-800" },
  CANCELED:  { label: "Cancelada",  color: "bg-gray-100 text-gray-600" },
  CONVERTED: { label: "Cobrada",    color: "bg-purple-100 text-purple-800" },
};

export default function FinesPage() {
  const { selectedCondominiumId, user } = useAuthStore();
  const [fines, setFines] = useState<Fine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [appealResponse, setAppealResponse] = useState("");

  const isManagement = ["CONDOMINIUM_ADMIN", "SYNDIC", "SUPER_ADMIN"].includes(user?.role ?? "");

  const [form, setForm] = useState({
    unitId: "",
    description: "",
    regulation: "",
    amount: "",
    appealDeadlineDays: 15,
  });

  useEffect(() => {
    if (selectedCondominiumId) loadFines();
  }, [selectedCondominiumId]);

  async function loadFines() {
    setLoading(true);
    try {
      const res = await api.get(`/fines/${selectedCondominiumId}`);
      setFines(res.data.data.fines);
    } finally {
      setLoading(false);
    }
  }

  async function createFine() {
    await api.post("/fines", {
      ...form,
      condominiumId: selectedCondominiumId,
      amount: parseFloat(form.amount),
    });
    setShowForm(false);
    setForm({ unitId: "", description: "", regulation: "", amount: "", appealDeadlineDays: 15 });
    loadFines();
  }

  async function confirm(id: string) {
    await api.patch(`/fines/${id}/confirm`);
    loadFines();
  }

  async function resolveAppeal(id: string, appealStatus: "ACCEPTED" | "REJECTED") {
    if (!appealResponse.trim()) return alert("Digite a resposta ao recurso");
    await api.patch(`/fines/${id}/resolve-appeal`, { appealStatus, appealResponse });
    setExpanded(null);
    setAppealResponse("");
    loadFines();
  }

  const fmt = (v: number) =>
    `R$ ${Number(v).toFixed(2).replace(".", ",")}`;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            Multas Condominiais
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Autos de infração com prazo de recurso digital
          </p>
        </div>
        {isManagement && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            <Plus className="h-4 w-4" />
            Novo Auto
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">Registrar Auto de Infração</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">ID da Unidade</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="UUID da unidade"
                value={form.unitId}
                onChange={(e) => setForm({ ...form, unitId: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição da Infração</label>
              <textarea
                className="w-full border rounded-lg px-3 py-2 text-sm"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Artigo do Regimento</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="Ex: Art. 15 do Regulamento Interno"
                value={form.regulation}
                onChange={(e) => setForm({ ...form, regulation: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prazo de recurso (dias)</label>
              <input
                type="number"
                min={1}
                max={30}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.appealDeadlineDays}
                onChange={(e) => setForm({ ...form, appealDeadlineDays: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={createFine} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700">
              Registrar Auto
            </button>
            <button onClick={() => setShowForm(false)} className="bg-gray-100 px-4 py-2 rounded-lg text-sm">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
        </div>
      ) : fines.length === 0 ? (
        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-12 text-center">
          <AlertTriangle className="h-10 w-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Nenhuma multa registrada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {fines.map((fine) => {
            const badge = STATUS_LABELS[fine.status] ?? { label: fine.status, color: "bg-gray-100 text-gray-600" };
            const isExpanded = expanded === fine.id;
            return (
              <div key={fine.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="p-4 flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.color}`}>
                        {badge.label}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(fine.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900">{fine.description}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{fine.regulation}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-sm font-bold text-red-600">{fmt(fine.amount)}</span>
                      <span className="text-xs text-gray-400">
                        Prazo recurso: {new Date(fine.appealDeadline).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isManagement && fine.status === "PENDING" && (
                      <button
                        onClick={() => confirm(fine.id)}
                        className="flex items-center gap-1 text-xs bg-red-50 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-100"
                      >
                        <Check className="h-3 w-3" />
                        Confirmar
                      </button>
                    )}
                    {fine.status === "APPEAL" && (
                      <button
                        onClick={() => setExpanded(isExpanded ? null : fine.id)}
                        className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-100"
                      >
                        <MessageSquare className="h-3 w-3" />
                        Recurso
                        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Painel de recurso */}
                {isExpanded && fine.status === "APPEAL" && (
                  <div className="border-t border-gray-100 bg-blue-50 p-4">
                    <p className="text-sm font-medium text-gray-700 mb-1">Recurso enviado pelo morador:</p>
                    <p className="text-sm text-gray-600 bg-white rounded-lg p-3 mb-3 border">
                      {fine.appealText}
                    </p>
                    {isManagement && (
                      <>
                        <textarea
                          className="w-full border rounded-lg px-3 py-2 text-sm mb-3"
                          rows={2}
                          placeholder="Resposta ao recurso..."
                          value={appealResponse}
                          onChange={(e) => setAppealResponse(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => resolveAppeal(fine.id, "ACCEPTED")}
                            className="flex items-center gap-1 text-xs bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                          >
                            <Check className="h-3 w-3" />
                            Aceitar Recurso
                          </button>
                          <button
                            onClick={() => resolveAppeal(fine.id, "REJECTED")}
                            className="flex items-center gap-1 text-xs bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                          >
                            <X className="h-3 w-3" />
                            Negar Recurso
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
