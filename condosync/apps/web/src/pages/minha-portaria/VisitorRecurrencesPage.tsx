import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { api } from "../../services/api";
import { Plus, Trash2, Clock, CalendarCheck, Loader2 } from "lucide-react";

const WEEK_DAYS = [
  { value: "MON", label: "Seg" },
  { value: "TUE", label: "Ter" },
  { value: "WED", label: "Qua" },
  { value: "THU", label: "Qui" },
  { value: "FRI", label: "Sex" },
  { value: "SAT", label: "Sáb" },
  { value: "SUN", label: "Dom" },
] as const;

interface Recurrence {
  id: string;
  visitorName: string;
  document?: string;
  company?: string;
  reason?: string;
  weekDays: string[];
  startTime: string;
  endTime: string;
  validFrom: string;
  validUntil?: string;
  isActive: boolean;
  createdAt: string;
}

const emptyForm = {
  visitorName: "",
  document: "",
  company: "",
  reason: "",
  weekDays: [] as string[],
  startTime: "08:00",
  endTime: "18:00",
  validFrom: new Date().toISOString().split("T")[0],
  validUntil: "",
};

export function VisitorRecurrencesPage() {
  const { user, selectedCondominiumId } = useAuthStore();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);

  if (user?.role !== "RESIDENT") return <Navigate to="/" replace />;

  const unitId = user?.condominiumUsers?.find(
    (cu) => cu.condominium.id === selectedCondominiumId
  )?.unitId;

  const { data: recurrences = [], isLoading } = useQuery<Recurrence[]>({
    queryKey: ["visitor-recurrences", selectedCondominiumId],
    queryFn: async () =>
      (await api.get(`/visitor-recurrences/${selectedCondominiumId}`)).data.data,
    enabled: !!selectedCondominiumId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api.post("/visitor-recurrences", {
        condominiumId: selectedCondominiumId,
        unitId,
        visitorName: form.visitorName,
        document: form.document || undefined,
        company: form.company || undefined,
        reason: form.reason || undefined,
        weekDays: form.weekDays,
        startTime: form.startTime,
        endTime: form.endTime,
        validFrom: new Date(form.validFrom).toISOString(),
        validUntil: form.validUntil ? new Date(form.validUntil).toISOString() : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["visitor-recurrences"] });
      setShowModal(false);
      setForm(emptyForm);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/visitor-recurrences/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["visitor-recurrences"] }),
  });

  function toggleDay(day: string) {
    setForm((f) => ({
      ...f,
      weekDays: f.weekDays.includes(day)
        ? f.weekDays.filter((d) => d !== day)
        : [...f.weekDays, day],
    }));
  }

  const active = recurrences.filter((r) => r.isActive);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Visitantes Recorrentes</h1>
          <p className="text-sm text-gray-500 mt-1">
            Cadastre visitantes com acesso regular — o porteiro verá a autorização automaticamente.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Adicionar
        </button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      )}

      {!isLoading && active.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <CalendarCheck className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Nenhum visitante recorrente cadastrado.</p>
          <p className="text-xs mt-1">Use o botão "Adicionar" para cadastrar o primeiro.</p>
        </div>
      )}

      {!isLoading && (
        <div className="space-y-3">
          {active.map((r) => (
            <div
              key={r.id}
              className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">{r.visitorName}</p>
                  {r.company && <p className="text-xs text-gray-500">{r.company}</p>}
                  {r.reason && <p className="text-xs text-gray-400 mt-0.5">{r.reason}</p>}

                  <div className="flex flex-wrap gap-1 mt-2">
                    {WEEK_DAYS.map((d) => (
                      <span
                        key={d.value}
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          r.weekDays.includes(d.value)
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        {d.label}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500">
                    <Clock className="w-3.5 h-3.5" />
                    {r.startTime} – {r.endTime}
                    {r.validUntil && (
                      <span className="ml-2 text-gray-400">
                        até {new Date(r.validUntil).toLocaleDateString("pt-BR")}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => deleteMutation.mutate(r.id)}
                  className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
                  title="Desativar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900">Novo visitante recorrente</h2>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Nome do visitante *</label>
                <input
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={form.visitorName}
                  onChange={(e) => setForm({ ...form, visitorName: e.target.value })}
                  placeholder="Nome completo"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">Documento</label>
                  <input
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    value={form.document}
                    onChange={(e) => setForm({ ...form, document: e.target.value })}
                    placeholder="CPF ou RG"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Empresa</label>
                  <input
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                    placeholder="Opcional"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600">Motivo</label>
                <input
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder="Ex: Diarista, professor particular..."
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 block mb-2">Dias da semana *</label>
                <div className="flex gap-1.5 flex-wrap">
                  {WEEK_DAYS.map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => toggleDay(d.value)}
                      className={`w-10 h-10 rounded-lg text-xs font-medium transition-colors ${
                        form.weekDays.includes(d.value)
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">Entrada *</label>
                  <input
                    type="time"
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Saída *</label>
                  <input
                    type="time"
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">Válido a partir de *</label>
                  <input
                    type="date"
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    value={form.validFrom}
                    onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Válido até</label>
                  <input
                    type="date"
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    value={form.validUntil}
                    onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => { setShowModal(false); setForm(emptyForm); }}
                className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={
                  !form.visitorName.trim() ||
                  form.weekDays.length === 0 ||
                  createMutation.isPending
                }
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Cadastrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
