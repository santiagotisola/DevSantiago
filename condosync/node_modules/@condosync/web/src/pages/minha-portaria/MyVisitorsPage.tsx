import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { api } from "../../services/api";
import { formatDateTime } from "../../lib/utils";
import {
  Users,
  Plus,
  X,
  Clock,
  CheckCircle,
  LogIn,
  LogOut,
  XCircle,
  Loader2,
  CalendarClock,
} from "lucide-react";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pendente", color: "bg-yellow-100 text-yellow-700" },
  AUTHORIZED: { label: "Aguardando", color: "bg-blue-100 text-blue-700" },
  DENIED: { label: "Cancelado", color: "bg-red-100 text-red-700" },
  INSIDE: { label: "Dentro", color: "bg-green-100 text-green-700" },
  LEFT: { label: "Saiu", color: "bg-gray-100 text-gray-700" },
};

const STATUS_ICONS: Record<string, React.ElementType> = {
  PENDING: Clock,
  AUTHORIZED: CheckCircle,
  DENIED: XCircle,
  INSIDE: LogIn,
  LEFT: LogOut,
};

export function MyVisitorsPage() {
  const { user, selectedCondominiumId } = useAuthStore();
  const queryClient = useQueryClient();

  if (user?.role !== "RESIDENT") {
    return <Navigate to="/" replace />;
  }

  const unitId = user?.condominiumUsers?.find(
    (cu) => cu.condominium.id === selectedCondominiumId,
  )?.unitId;

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: "",
    document: "",
    documentType: "RG",
    phone: "",
    reason: "",
    scheduledAt: "",
    notes: "",
  });

  // Histórico de visitantes da unidade
  const { data, isLoading } = useQuery({
    queryKey: ["my-visitors", unitId],
    queryFn: async () => {
      const res = await api.get(`/visitors/unit/${unitId}/history`, {
        params: { limit: 50 },
      });
      return res.data.data;
    },
    enabled: !!unitId,
  });

  // Pré-autorizar visitante
  const createMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const body: Record<string, string> = {
        unitId: unitId!,
        name: payload.name,
        documentType: payload.documentType,
        reason: payload.reason,
        notes: payload.notes,
      };
      if (payload.document) body.document = payload.document;
      if (payload.phone) body.phone = payload.phone;
      if (payload.scheduledAt)
        body.scheduledAt = new Date(payload.scheduledAt).toISOString();
      return api.post("/visitors", body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-visitors", unitId] });
      setShowModal(false);
      setForm({
        name: "",
        document: "",
        documentType: "RG",
        phone: "",
        reason: "",
        scheduledAt: "",
        notes: "",
      });
    },
  });

  // Cancelar pré-autorização
  const cancelMutation = useMutation({
    mutationFn: (id: string) =>
      api.patch(`/visitors/${id}/authorize`, { authorized: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-visitors", unitId] });
    },
  });

  const visitors = data?.visitors ?? [];

  if (!unitId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500">
        <Users className="w-12 h-12 mb-3 text-slate-300" />
        <p>Sua conta não está vinculada a uma unidade.</p>
        <p className="text-sm">Entre em contato com a administração.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Meus Visitantes</h1>
          <p className="text-slate-500 text-sm mt-1">
            Pré-autorize visitantes para agilizar a entrada no condomínio
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Pré-autorizar visitante
        </button>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Carregando...
          </div>
        ) : visitors.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400">
            <CalendarClock className="w-10 h-10 mb-2 text-slate-300" />
            <p>Nenhum visitante registrado</p>
            <p className="text-sm">
              Pré-autoize visitantes esperados para facilitar a entrada
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">
                    Visitante
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">
                    Motivo
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">
                    Visita agendada
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">
                    Cadastrado em
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">
                    Status
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visitors.map((v: any) => {
                  const status = STATUS_LABELS[v.status] ?? {
                    label: v.status,
                    color: "bg-slate-100 text-slate-600",
                  };
                  const Icon = STATUS_ICONS[v.status] ?? Clock;
                  const canCancel =
                    v.status === "AUTHORIZED" || v.status === "PENDING";
                  return (
                    <tr
                      key={v.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{v.name}</p>
                        {v.phone && (
                          <p className="text-slate-500 text-xs">{v.phone}</p>
                        )}
                        {v.document && (
                          <p className="text-slate-400 text-xs">
                            {v.documentType}: {v.document}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {v.reason || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {v.scheduledAt ? formatDateTime(v.scheduledAt) : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {formatDateTime(v.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}
                        >
                          <Icon className="w-3 h-3" />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canCancel && (
                          <button
                            onClick={() => cancelMutation.mutate(v.id)}
                            disabled={cancelMutation.isPending}
                            className="text-xs text-red-500 hover:text-red-700 hover:underline disabled:opacity-50"
                          >
                            Cancelar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal pré-autorização */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">
                Pré-autorizar visitante
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(form);
              }}
              className="p-5 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nome do visitante <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nome completo"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Documento
                  </label>
                  <select
                    value={form.documentType}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, documentType: e.target.value }))
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="RG">RG</option>
                    <option value="CPF">CPF</option>
                    <option value="CNH">CNH</option>
                    <option value="PASSPORT">Passaporte</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Número
                  </label>
                  <input
                    value={form.document}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, document: e.target.value }))
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nº do documento"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Telefone
                </label>
                <input
                  value={form.phone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Motivo da visita
                </label>
                <input
                  value={form.reason}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, reason: e.target.value }))
                  }
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Visita familiar, entrega, serviço..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <CalendarClock className="w-3.5 h-3.5 inline mr-1" />
                  Data/hora esperada (opcional)
                </label>
                <input
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, scheduledAt: e.target.value }))
                  }
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Observações
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  rows={2}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Informações adicionais..."
                />
              </div>

              {createMutation.isError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  Erro ao pré-autorizar visitante. Tente novamente.
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {createMutation.isPending && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  Pré-autorizar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
