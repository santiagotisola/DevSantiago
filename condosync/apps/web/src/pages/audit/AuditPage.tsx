import { useState } from "react";
import {
  ClipboardList,
  Search,
  Calendar,
  Filter,
  Download,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { api } from "../../services/api";
import { useQuery } from "@tanstack/react-query";

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  userId: string | null;
  condominiumId: string | null;
  changes: { before?: Record<string, unknown>; after?: Record<string, unknown> } | null;
  metadata: { ip?: string; userAgent?: string } | null;
  createdAt: string;
  user?: { id: string; name: string; email: string; avatarUrl?: string | null } | null;
}

interface AuditResponse {
  logs: AuditLog[];
  total: number;
  pages: number;
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-green-100 text-green-700",
  UPDATE: "bg-blue-100 text-blue-700",
  DELETE: "bg-red-100 text-red-700",
  LOGIN: "bg-purple-100 text-purple-700",
  LOGOUT: "bg-gray-100 text-gray-600",
  ACCESS: "bg-amber-100 text-amber-700",
};

const ACTION_LABELS: Record<string, string> = {
  CREATE: "Criação",
  UPDATE: "Edição",
  DELETE: "Exclusão",
  LOGIN: "Login",
  LOGOUT: "Logout",
  ACCESS: "Acesso",
};

const ENTITIES = [
  "Visitor",
  "Parcel",
  "Unit",
  "Resident",
  "Vehicle",
  "Employee",
  "Finance",
  "Maintenance",
  "CommonArea",
  "Assembly",
  "Auth",
  "Document",
  "Condominium",
  "User",
];

export function AuditPage() {
  const { selectedCondominiumId } = useAuthStore();
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", selectedCondominiumId, page, actionFilter, entityFilter, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "30");
      if (actionFilter) params.set("action", actionFilter);
      if (entityFilter) params.set("entity", entityFilter);
      if (startDate) params.set("startDate", new Date(startDate).toISOString());
      if (endDate) params.set("endDate", new Date(endDate + "T23:59:59").toISOString());

      const res = await api.get(`/audit/condominium/${selectedCondominiumId}?${params.toString()}`);
      return res.data?.data as AuditResponse;
    },
    enabled: !!selectedCondominiumId,
  });

  const logs = data?.logs ?? [];
  const totalPages = data?.pages ?? 1;
  const total = data?.total ?? 0;

  function exportCSV() {
    if (!logs.length) return;
    const header = "Data/Hora,Usuário,Email,Ação,Entidade,ID Entidade,IP\n";
    const rows = logs.map((log) =>
      [
        new Date(log.createdAt).toLocaleString("pt-BR"),
        log.user?.name ?? "—",
        log.user?.email ?? "—",
        log.action,
        log.entity,
        log.entityId ?? "—",
        log.metadata?.ip ?? "—",
      ].join(",")
    );
    const blob = new Blob([header + rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-blue-600" />
            Auditoria
          </h1>
          <p className="text-sm text-gray-500">
            Histórico completo de ações realizadas no sistema ({total} registros)
          </p>
        </div>
        <button
          onClick={exportCSV}
          disabled={!logs.length}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap gap-3">
          {/* Ação - chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-gray-400" />
            <button
              onClick={() => { setActionFilter(""); setPage(1); }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${!actionFilter ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              Todas
            </button>
            {Object.entries(ACTION_LABELS).map(([val, label]) => (
              <button
                key={val}
                onClick={() => { setActionFilter(val); setPage(1); }}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${actionFilter === val ? ACTION_COLORS[val] + " ring-2 ring-offset-1 ring-current" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            aria-label="Filtrar por entidade"
            value={entityFilter}
            onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas as entidades</option>
            {ENTITIES.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input
              type="date"
              aria-label="Data início"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-400 text-sm">até</span>
            <input
              type="date"
              aria-label="Data fim"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Tabela de logs */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
            Carregando registros de auditoria...
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-400 gap-2">
            <ClipboardList className="w-10 h-10 opacity-30" />
            <p className="text-sm">Nenhum registro encontrado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <th className="text-left px-6 py-3">Data/Hora</th>
                  <th className="text-left px-6 py-3">Usuário</th>
                  <th className="text-left px-6 py-3">Ação</th>
                  <th className="text-left px-6 py-3">Entidade</th>
                  <th className="text-left px-6 py-3">ID</th>
                  <th className="text-left px-6 py-3">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-gray-500 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(log.createdAt).toLocaleString("pt-BR")}
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                          {log.user?.name?.charAt(0) ?? "?"}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{log.user?.name ?? "Sistema"}</p>
                          <p className="text-xs text-gray-400">{log.user?.email ?? "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_COLORS[log.action] ?? "bg-gray-100 text-gray-600"}`}>
                        {ACTION_LABELS[log.action] ?? log.action}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-600">{log.entity}</td>
                    <td className="px-6 py-3 text-gray-400 font-mono text-xs">
                      {log.entityId ? log.entityId.slice(0, 8) + "..." : "—"}
                    </td>
                    <td className="px-6 py-3">
                      {log.changes ? (
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Ver
                        </button>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">
              Página {page} de {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                aria-label="Página anterior"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                aria-label="Próxima página"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Detalhes */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSelectedLog(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Detalhes da Alteração</h2>
              <button aria-label="Fechar" onClick={() => setSelectedLog(null)} className="p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Ação:</span>{" "}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_COLORS[selectedLog.action]}`}>
                    {ACTION_LABELS[selectedLog.action] ?? selectedLog.action}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Entidade:</span>{" "}
                  <span className="font-medium">{selectedLog.entity}</span>
                </div>
                <div>
                  <span className="text-gray-500">Usuário:</span>{" "}
                  <span className="font-medium">{selectedLog.user?.name ?? "Sistema"}</span>
                </div>
                <div>
                  <span className="text-gray-500">IP:</span>{" "}
                  <span className="font-mono text-xs">{selectedLog.metadata?.ip ?? "—"}</span>
                </div>
              </div>

              {selectedLog.changes?.before && (
                <div>
                  <h3 className="text-sm font-semibold text-red-600 mb-2">Antes</h3>
                  <pre className="bg-red-50 border border-red-100 rounded-lg p-3 text-xs overflow-x-auto text-red-800">
                    {JSON.stringify(selectedLog.changes.before, null, 2)}
                  </pre>
                </div>
              )}
              {selectedLog.changes?.after && (
                <div>
                  <h3 className="text-sm font-semibold text-green-600 mb-2">Depois</h3>
                  <pre className="bg-green-50 border border-green-100 rounded-lg p-3 text-xs overflow-x-auto text-green-800">
                    {JSON.stringify(selectedLog.changes.after, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
