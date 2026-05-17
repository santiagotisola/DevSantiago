import { useState } from "react";
import { ClipboardList, Search, User, Calendar, Filter } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { api } from "../../services/api";
import { useQuery } from "@tanstack/react-query";

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  userId: string;
  userName: string;
  userEmail: string;
  details: Record<string, unknown>;
  createdAt: string;
  ipAddress?: string;
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-green-100 text-green-700",
  UPDATE: "bg-blue-100 text-blue-700",
  DELETE: "bg-red-100 text-red-700",
  LOGIN: "bg-purple-100 text-purple-700",
  LOGOUT: "bg-gray-100 text-gray-600",
};

const ACTION_LABELS: Record<string, string> = {
  CREATE: "Criação",
  UPDATE: "Edição",
  DELETE: "Exclusão",
  LOGIN: "Login",
  LOGOUT: "Logout",
};

export function AuditPage() {
  const { selectedCondominiumId } = useAuthStore();
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", selectedCondominiumId],
    queryFn: async () => {
      const res = await api.get(`/condominiums/${selectedCondominiumId}/audit`);
      return (res.data?.data?.logs ?? []) as AuditLog[];
    },
    enabled: !!selectedCondominiumId,
  });

  const logs = (data ?? []).filter((log) => {
    const matchSearch =
      !search ||
      log.userName?.toLowerCase().includes(search.toLowerCase()) ||
      log.userEmail?.toLowerCase().includes(search.toLowerCase()) ||
      log.entity?.toLowerCase().includes(search.toLowerCase()) ||
      log.action?.toLowerCase().includes(search.toLowerCase());
    const matchAction = actionFilter === "ALL" || log.action === actionFilter;
    return matchSearch && matchAction;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-blue-600" />
            Auditoria
          </h1>
          <p className="text-sm text-gray-500">Histórico completo de ações realizadas no sistema</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por usuário, entidade ou ação..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            aria-label="Filtrar por ação"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Todas as ações</option>
            {Object.entries(ACTION_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
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
                  <th className="text-left px-6 py-3">IP</th>
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
                          {log.userName?.charAt(0) ?? log.userEmail?.charAt(0) ?? "?"}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{log.userName ?? "—"}</p>
                          <p className="text-xs text-gray-400">{log.userEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_COLORS[log.action] ?? "bg-gray-100 text-gray-600"}`}>
                        {ACTION_LABELS[log.action] ?? log.action}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-600">{log.entity}</td>
                    <td className="px-6 py-3 text-gray-400 font-mono text-xs">{log.ipAddress ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
