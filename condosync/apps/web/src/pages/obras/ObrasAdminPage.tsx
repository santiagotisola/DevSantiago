import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Hammer,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import api from "../../services/api";
import { useAuthStore } from "../../store/authStore";

interface Provider {
  id: string;
  name: string;
  serviceType: string;
  document?: string;
  phone?: string;
  company?: string;
}

interface Renovation {
  id: string;
  description: string;
  type: string;
  startDate: string;
  endDate?: string;
  status: string;
  notes?: string;
  rejectedReason?: string;
  authorizedProviders: Provider[];
  createdAt: string;
  unit: { identifier: string; block?: string };
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Aguardando", color: "bg-yellow-100 text-yellow-800" },
  APPROVED: { label: "Aprovada", color: "bg-green-100 text-green-800" },
  IN_PROGRESS: { label: "Em andamento", color: "bg-blue-100 text-blue-800" },
  COMPLETED: { label: "Concluída", color: "bg-gray-100 text-gray-700" },
  REJECTED: { label: "Reprovada", color: "bg-red-100 text-red-800" },
};

export default function ObrasAdminPage() {
  const { user, selectedCondominiumId } = useAuthStore();
  const qc = useQueryClient();
  const condominiumId = selectedCondominiumId;

  const [expanded, setExpanded] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data, isLoading } = useQuery<Renovation[]>({
    queryKey: ["renovations-admin", condominiumId],
    queryFn: async () => {
      const res = await api.get(`/renovations/condominium/${condominiumId}`);
      return res.data.data.renovations;
    },
    enabled: !!condominiumId,
  });

  const approveMutation = useMutation({
    mutationFn: ({
      id,
      approved,
      reason,
    }: {
      id: string;
      approved: boolean;
      reason?: string;
    }) => api.patch(`/renovations/${id}/approve`, { approved, reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["renovations-admin"] });
      setRejectId(null);
      setRejectReason("");
    },
  });

  const filtered =
    data?.filter((r) => !statusFilter || r.status === statusFilter) ?? [];

  if (isLoading)
    return (
      <div className="p-8 text-center text-gray-400">Carregando obras...</div>
    );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Obras e Prestadores
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Gerencie as solicitações de obras do condomínio
        </p>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {[
          ["", "Todas"],
          ["PENDING", "Aguardando"],
          ["APPROVED", "Aprovadas"],
          ["IN_PROGRESS", "Em andamento"],
          ["COMPLETED", "Concluídas"],
          ["REJECTED", "Reprovadas"],
        ].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setStatusFilter(val)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${statusFilter === val ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}
          >
            {label}
            {val && data && (
              <span className="ml-1.5 opacity-70">
                ({data.filter((r) => r.status === val).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Reject Modal */}
      {rejectId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-3">Reprovar solicitação</h2>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Informe o motivo da reprovação..."
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setRejectId(null);
                  setRejectReason("");
                }}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() =>
                  approveMutation.mutate({
                    id: rejectId,
                    approved: false,
                    reason: rejectReason,
                  })
                }
                disabled={approveMutation.isPending}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {approveMutation.isPending ? "Reprovando..." : "Reprovar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Hammer className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nenhuma obra encontrada.</p>
          </div>
        )}

        {filtered.map((r) => {
          const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.PENDING;
          const isOpen = expanded === r.id;

          return (
            <div
              key={r.id}
              className="bg-white border rounded-xl shadow-sm overflow-hidden"
            >
              <div
                className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpanded(isOpen ? null : r.id)}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-800 text-sm">
                        {r.unit.block ? `Bloco ${r.unit.block} — ` : ""}
                        {r.unit.identifier}
                      </span>
                      <span className="text-gray-400 text-sm capitalize">
                        • {r.type}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}
                      >
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 truncate max-w-md">
                      {r.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {r.status === "PENDING" && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          approveMutation.mutate({ id: r.id, approved: true });
                        }}
                        className="flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-100"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Aprovar
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRejectId(r.id);
                        }}
                        className="flex items-center gap-1 text-xs bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reprovar
                      </button>
                    </>
                  )}
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </div>

              {isOpen && (
                <div className="border-t px-5 py-4 bg-gray-50 space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Início:</span>{" "}
                      <span className="font-medium">
                        {new Date(r.startDate).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    {r.endDate && (
                      <div>
                        <span className="text-gray-500">Fim:</span>{" "}
                        <span className="font-medium">
                          {new Date(r.endDate).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    )}
                    <div className="col-span-2">
                      <span className="text-gray-500">Descrição:</span>{" "}
                      <span className="font-medium">{r.description}</span>
                    </div>
                    {r.notes && (
                      <div className="col-span-2">
                        <span className="text-gray-500">Obs:</span>{" "}
                        <span>{r.notes}</span>
                      </div>
                    )}
                    {r.rejectedReason && (
                      <div className="col-span-2 text-red-600">
                        <span className="font-medium">Motivo reprovação:</span>{" "}
                        {r.rejectedReason}
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Prestadores autorizados
                    </h4>
                    {r.authorizedProviders.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">
                        Nenhum prestador cadastrado pelo morador
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {r.authorizedProviders.map((p) => (
                          <div
                            key={p.id}
                            className="bg-white rounded-lg border px-3 py-2 text-sm"
                          >
                            <span className="font-medium">{p.name}</span>
                            <span className="text-gray-500 ml-2">
                              {p.serviceType}
                            </span>
                            {p.company && (
                              <span className="text-gray-400 ml-2">
                                — {p.company}
                              </span>
                            )}
                            {p.document && (
                              <span className="text-gray-400 ml-2">
                                • {p.document}
                              </span>
                            )}
                            {p.phone && (
                              <span className="text-gray-400 ml-2">
                                • {p.phone}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
