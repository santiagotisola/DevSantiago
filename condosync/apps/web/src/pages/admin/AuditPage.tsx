import { Fragment, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ScrollText, Search, Loader2, Filter, X } from 'lucide-react';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

interface AuditItem {
  id: string;
  userId: string | null;
  user: { id: string; name: string; email: string } | null;
  action: string;
  module: string;
  entityType: string | null;
  entityId: string | null;
  description: string;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

interface AuditListResp {
  total: number;
  page: number;
  pageSize: number;
  items: AuditItem[];
}

interface Facets {
  modules: Array<{ value: string; count: number }>;
  actions: Array<{ value: string; count: number }>;
}

const ACTION_COLORS: Record<string, string> = {
  LOGIN: 'bg-green-100 text-green-800',
  LOGIN_FAILED: 'bg-red-100 text-red-800',
  ENABLE_2FA: 'bg-blue-100 text-blue-800',
  DISABLE_2FA: 'bg-amber-100 text-amber-800',
  CREATE: 'bg-indigo-100 text-indigo-800',
  UPDATE: 'bg-blue-100 text-blue-800',
  DELETE: 'bg-red-100 text-red-800',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

export function AuditPage() {
  const { selectedCondominiumId } = useAuthStore();
  const [q, setQ] = useState('');
  const [module, setModule] = useState('');
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (selectedCondominiumId) p.set('condominiumId', selectedCondominiumId);
    if (q) p.set('q', q);
    if (module) p.set('module', module);
    if (action) p.set('action', action);
    if (from) p.set('from', new Date(from).toISOString());
    if (to) p.set('to', new Date(to).toISOString());
    p.set('page', String(page));
    p.set('pageSize', String(pageSize));
    return p.toString();
  }, [selectedCondominiumId, q, module, action, from, to, page]);

  const list = useQuery<AuditListResp>({
    queryKey: ['audit', queryString],
    queryFn: async () => (await api.get(`/audit?${queryString}`)).data.data,
    enabled: !!selectedCondominiumId,
  });

  const facets = useQuery<Facets>({
    queryKey: ['audit-facets', selectedCondominiumId],
    queryFn: async () =>
      (await api.get(`/audit/facets?condominiumId=${selectedCondominiumId}`)).data.data,
    enabled: !!selectedCondominiumId,
  });

  if (!selectedCondominiumId) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-amber-900">
        Selecione um condomínio para ver os logs.
      </div>
    );
  }

  const totalPages = list.data ? Math.ceil(list.data.total / list.data.pageSize) : 1;

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ScrollText className="w-6 h-6 text-blue-600" />
          Auditoria
        </h1>
        <p className="text-muted-foreground">
          Registros de ações sensíveis no sistema (logins, alterações financeiras, exclusões).
        </p>
      </div>

      <div className="bg-white rounded-xl border p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="relative md:col-span-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar na descrição"
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={module}
            onChange={(e) => {
              setModule(e.target.value);
              setPage(1);
            }}
            className="md:col-span-2 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos os módulos</option>
            {(facets.data?.modules ?? []).map((m) => (
              <option key={m.value} value={m.value}>
                {m.value} ({m.count})
              </option>
            ))}
          </select>
          <select
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
            className="md:col-span-2 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas as ações</option>
            {(facets.data?.actions ?? []).map((a) => (
              <option key={a.value} value={a.value}>
                {a.value} ({a.count})
              </option>
            ))}
          </select>
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
            className="md:col-span-2 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
            className="md:col-span-2 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {(q || module || action || from || to) && (
          <button
            onClick={() => {
              setQ('');
              setModule('');
              setAction('');
              setFrom('');
              setTo('');
              setPage(1);
            }}
            className="text-xs flex items-center gap-1 text-blue-600 hover:underline"
          >
            <X className="w-3 h-3" /> Limpar filtros
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        {list.isLoading ? (
          <div className="p-10 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto" />
          </div>
        ) : !list.data || list.data.items.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">
            <Filter className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            Nenhum log para esses filtros.
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs font-medium text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Data/Hora</th>
                  <th className="px-4 py-3 text-left">Usuário</th>
                  <th className="px-4 py-3 text-left">Módulo</th>
                  <th className="px-4 py-3 text-left">Ação</th>
                  <th className="px-4 py-3 text-left">Descrição</th>
                  <th className="px-4 py-3 text-left">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {list.data.items.map((it) => (
                  <Fragment key={it.id}>
                    <tr
                      onClick={() => setExpandedId(expandedId === it.id ? null : it.id)}
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-4 py-2 text-xs whitespace-nowrap">{formatDate(it.createdAt)}</td>
                      <td className="px-4 py-2">
                        {it.user ? (
                          <div>
                            <div className="font-medium text-gray-900">{it.user.name}</div>
                            <div className="text-xs text-gray-500">{it.user.email}</div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">sistema</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-xs">
                        <span className="px-2 py-0.5 bg-gray-100 rounded font-mono">{it.module}</span>
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`text-[11px] font-medium px-2 py-0.5 rounded ${
                            ACTION_COLORS[it.action] ?? 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {it.action}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm">{it.description}</td>
                      <td className="px-4 py-2 text-xs font-mono text-gray-500">{it.ipAddress ?? '—'}</td>
                    </tr>
                    {expandedId === it.id && (
                      <tr className="bg-gray-50">
                        <td colSpan={6} className="px-4 py-3 text-xs space-y-2">
                          {it.entityType && (
                            <div>
                              <strong>Entidade:</strong> {it.entityType}{' '}
                              {it.entityId && <code className="font-mono">{it.entityId}</code>}
                            </div>
                          )}
                          {it.userAgent && (
                            <div>
                              <strong>User-Agent:</strong>{' '}
                              <span className="font-mono text-[10px]">{it.userAgent}</span>
                            </div>
                          )}
                          {it.metadata && (
                            <div>
                              <strong>Metadata:</strong>
                              <pre className="bg-white border rounded p-2 mt-1 text-[10px] overflow-x-auto">
                                {JSON.stringify(it.metadata, null, 2)}
                              </pre>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3 text-xs">
                <span>
                  {list.data.total.toLocaleString('pt-BR')} registros — página {page}/{totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-40"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default AuditPage;
