import { useState, useEffect } from "react";
import { api } from "../../services/api";
import { useAuthStore } from "../../store/authStore";
import { FileSignature, Plus, AlertCircle, CheckCircle, Clock, XCircle, Trash2 } from "lucide-react";

interface CondominiumContract {
  id: string;
  title: string;
  vendor: string;
  contractType: string;
  startDate: string;
  endDate: string;
  value: number;
  adjustmentIndex?: string;
  status: string;
  alertDaysBefore: number;
  notes?: string;
}

const TYPE_LABELS: Record<string, string> = {
  ELEVATOR: "Elevador",
  INSURANCE: "Seguro",
  CLEANING: "Limpeza",
  SECURITY: "Segurança",
  MAINTENANCE: "Manutenção",
  OTHER: "Outro",
};

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  ACTIVE:   { label: "Ativo",    icon: CheckCircle, color: "text-green-600 bg-green-50" },
  EXPIRED:  { label: "Vencido",  icon: AlertCircle, color: "text-red-600 bg-red-50" },
  CANCELED: { label: "Cancelado", icon: XCircle,    color: "text-gray-500 bg-gray-50" },
};

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function ContractsPage() {
  const { selectedCondominiumId } = useAuthStore();
  const [contracts, setContracts] = useState<CondominiumContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState("ACTIVE");

  const [form, setForm] = useState({
    title: "",
    vendor: "",
    contractType: "ELEVATOR",
    startDate: "",
    endDate: "",
    value: "",
    adjustmentIndex: "",
    alertDaysBefore: 60,
    autoRenew: false,
    notes: "",
  });

  useEffect(() => {
    if (selectedCondominiumId) loadContracts();
  }, [selectedCondominiumId, filterStatus]);

  async function loadContracts() {
    setLoading(true);
    try {
      const res = await api.get(`/condominium-contracts/${selectedCondominiumId}?status=${filterStatus}`);
      setContracts(res.data.data.contracts);
    } finally {
      setLoading(false);
    }
  }

  async function createContract() {
    await api.post("/condominium-contracts", {
      ...form,
      condominiumId: selectedCondominiumId,
      value: parseFloat(form.value),
      startDate: new Date(form.startDate).toISOString(),
      endDate: new Date(form.endDate).toISOString(),
      adjustmentIndex: form.adjustmentIndex || undefined,
    });
    setShowForm(false);
    setForm({ title: "", vendor: "", contractType: "ELEVATOR", startDate: "", endDate: "", value: "", adjustmentIndex: "", alertDaysBefore: 60, autoRenew: false, notes: "" });
    loadContracts();
  }

  async function cancel(id: string) {
    if (!confirm("Cancelar este contrato?")) return;
    await api.delete(`/condominium-contracts/${id}`);
    loadContracts();
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileSignature className="h-6 w-6 text-blue-600" />
            Contratos Condominiais
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gerencie contratos com alertas automáticos de vencimento
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Novo Contrato
        </button>
      </div>

      {/* Filtro de status */}
      <div className="flex gap-2">
        {["ACTIVE", "EXPIRED", "CANCELED"].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === s
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {STATUS_CONFIG[s]?.label}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">Novo Contrato</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.title}
                placeholder="Ex: Manutenção Elevador 2026" onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Empresa / Prestador</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.vendor}
                onChange={(e) => setForm({ ...form, vendor: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Contrato</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.contractType}
                onChange={(e) => setForm({ ...form, contractType: e.target.value })}>
                {Object.entries(TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor mensal/anual (R$)</label>
              <input type="number" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Início</label>
              <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vencimento</label>
              <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Índice de reajuste</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.adjustmentIndex}
                onChange={(e) => setForm({ ...form, adjustmentIndex: e.target.value })}>
                <option value="">Nenhum</option>
                <option value="INPC">INPC</option>
                <option value="IGPM">IGPM</option>
                <option value="IPCA">IPCA</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alertar quantos dias antes?</label>
              <input type="number" min={7} max={180} className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.alertDaysBefore} onChange={(e) => setForm({ ...form, alertDaysBefore: Number(e.target.value) })} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2}
                value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={createContract} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
              Salvar
            </button>
            <button onClick={() => setShowForm(false)} className="bg-gray-100 px-4 py-2 rounded-lg text-sm">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : contracts.length === 0 ? (
        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-12 text-center">
          <FileSignature className="h-10 w-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Nenhum contrato encontrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contracts.map((c) => {
            const days = daysUntil(c.endDate);
            const cfg = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.ACTIVE;
            const Icon = cfg.icon;
            const isUrgent = days <= 30 && c.status === "ACTIVE";
            const isWarning = days > 30 && days <= 60 && c.status === "ACTIVE";
            return (
              <div
                key={c.id}
                className={`bg-white border rounded-xl p-4 flex items-start gap-4 ${
                  isUrgent ? "border-red-200" : isWarning ? "border-yellow-200" : "border-gray-200"
                }`}
              >
                <div className={`p-2 rounded-lg ${cfg.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{c.title}</span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      {TYPE_LABELS[c.contractType] ?? c.contractType}
                    </span>
                    {c.adjustmentIndex && (
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                        {c.adjustmentIndex}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5">{c.vendor}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span>Valor: <strong>R$ {Number(c.value).toFixed(2).replace(".", ",")}</strong></span>
                    <span>Início: {new Date(c.startDate).toLocaleDateString("pt-BR")}</span>
                    <span>
                      Vencimento: <strong>{new Date(c.endDate).toLocaleDateString("pt-BR")}</strong>
                    </span>
                    {c.status === "ACTIVE" && (
                      <span
                        className={`font-medium ${
                          days <= 15 ? "text-red-600" : days <= 30 ? "text-orange-600" : days <= 60 ? "text-yellow-700" : "text-green-600"
                        }`}
                      >
                        {days > 0 ? `Vence em ${days} dias` : "VENCIDO"}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => cancel(c.id)} className="text-gray-400 hover:text-red-500 p-1">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
