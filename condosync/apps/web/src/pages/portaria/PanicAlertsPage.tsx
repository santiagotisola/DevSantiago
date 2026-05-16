import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import { formatDateTime } from '../../lib/utils';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Clock, Home, Loader2, RefreshCw, ShieldAlert, Timer, User } from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  RESIDENT: 'Morador',
  DOORMAN: 'Porteiro',
  CONDOMINIUM_ADMIN: 'Administrador',
  SYNDIC: 'Síndico',
  SUPER_ADMIN: 'Super Admin',
};

type PanicAlert = {
  id: string;
  condominiumId: string;
  triggeredBy: string;
  triggeredByName: string;
  triggeredByRole: string | null;
  triggeredByUnit: { identifier: string; block?: string | null } | null;
  resolvedBy: string | null;
  resolvedByName: string | null;
  resolvedAt: string | null;
  notes: string | null;
  createdAt: string;
};

function AlertCard({
  alert: a,
  expanded,
  onToggle,
  canResolve,
  onResolve,
  isPending,
}: {
  alert: PanicAlert;
  expanded: boolean;
  onToggle: () => void;
  canResolve: boolean;
  onResolve: () => void;
  isPending: boolean;
}) {
  const elapsed = useElapsed(a.createdAt);
  return (
    <div className="bg-red-50 border-2 border-red-400 rounded-xl overflow-hidden">
      {/* Linha principal — clicável para expandir */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left p-5 flex items-start gap-4 hover:bg-red-100/50 transition-colors"
      >
        <div className="bg-red-100 p-3 rounded-xl shrink-0">
          <AlertTriangle className="w-6 h-6 text-red-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <User className="w-4 h-4 text-red-500 shrink-0" />
            <span className="font-bold text-red-800">{a.triggeredByName}</span>
            {a.triggeredByRole && (
              <span className="text-[10px] font-bold bg-red-200 text-red-700 px-2 py-0.5 rounded-full uppercase tracking-wide">
                {ROLE_LABELS[a.triggeredByRole] ?? a.triggeredByRole}
              </span>
            )}
          </div>
          {a.triggeredByUnit && (
            <div className="flex items-center gap-1.5 text-xs text-red-700 font-semibold mb-1">
              <Home className="w-3.5 h-3.5" />
              Unidade {a.triggeredByUnit.identifier}
              {a.triggeredByUnit.block ? ` — Bloco ${a.triggeredByUnit.block}` : ''}
            </div>
          )}
          <div className="flex items-center gap-3 text-xs text-red-600 flex-wrap">
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{formatDateTime(a.createdAt)}</span>
            <span className="flex items-center gap-1 font-semibold"><Timer className="w-3.5 h-3.5" />há {elapsed}</span>
          </div>
        </div>
        {expanded
          ? <ChevronUp className="w-5 h-5 text-red-400 shrink-0 mt-1" />
          : <ChevronDown className="w-5 h-5 text-red-400 shrink-0 mt-1" />
        }
      </button>

      {/* Painel expandido */}
      {expanded && (
        <div className="border-t border-red-200 px-5 py-4 bg-white space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">ID do alerta</p>
              <p className="font-mono text-xs text-gray-600 break-all">{a.id}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Acionado em</p>
              <p className="text-gray-700">{formatDateTime(a.createdAt)}</p>
            </div>
            {a.triggeredByUnit && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Unidade</p>
                <p className="text-gray-700">
                  {a.triggeredByUnit.identifier}
                  {a.triggeredByUnit.block ? ` — Bloco ${a.triggeredByUnit.block}` : ''}
                </p>
              </div>
            )}
            {a.triggeredByRole && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Papel</p>
                <p className="text-gray-700">{ROLE_LABELS[a.triggeredByRole] ?? a.triggeredByRole}</p>
              </div>
            )}
          </div>
          {a.notes && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Observações</p>
              <p className="text-sm text-gray-700 italic bg-gray-50 rounded-lg px-3 py-2">"{a.notes}"</p>
            </div>
          )}
          {canResolve && (
            <div className="flex justify-end pt-1">
              <button
                onClick={(e) => { e.stopPropagation(); onResolve(); }}
                disabled={isPending}
                className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Marcar como resolvido
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function useElapsed(createdAt: string) {
  const [elapsed, setElapsed] = useState('');
  useEffect(() => {
    const calc = () => {
      const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
      if (diff < 60) setElapsed(`${diff}s`);
      else if (diff < 3600) setElapsed(`${Math.floor(diff / 60)}min ${diff % 60}s`);
      else setElapsed(`${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}min`);
    };
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, [createdAt]);
  return elapsed;
}

export function PanicAlertsPage() {
  const { selectedCondominiumId, user } = useAuthStore();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const canResolve = ['DOORMAN', 'CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'].includes(user?.role || '');

  const { data: alerts, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ['panic-alerts', selectedCondominiumId],
    queryFn: async () => {
      const res = await api.get(`/panic/${selectedCondominiumId}`);
      return res.data.data as PanicAlert[];
    },
    enabled: !!selectedCondominiumId,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/panic/${id}/resolve`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['panic-alerts'] }),
  });

  const active = (alerts ?? []).filter((a) => !a.resolvedAt);
  const resolved = (alerts ?? []).filter((a) => !!a.resolvedAt);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-red-600" />
            Alertas de Pânico
          </h1>
          <p className="text-muted-foreground">Registros de acionamento do botão de emergência</p>
        </div>
        <div className="flex items-center gap-3">
          {active.length > 0 && (
            <span className="flex items-center gap-1.5 bg-red-100 text-red-700 font-bold px-4 py-2 rounded-xl text-sm animate-pulse">
              <AlertTriangle className="w-4 h-4" />
              {active.length} alerta{active.length > 1 ? 's' : ''} ativo{active.length > 1 ? 's' : ''}
            </span>
          )}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            title="Atualizar agora"
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {isLoading && !isError ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-red-500" />
        </div>
      ) : isError && !alerts ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <AlertTriangle className="w-8 h-8" />
          <p className="font-medium">Não foi possível carregar os alertas</p>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 text-sm font-medium bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            <RefreshCw className="w-4 h-4" /> Tentar novamente
          </button>
        </div>
      ) : (
        <>
          {/* Alertas ativos */}
          {active.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-36 gap-2 bg-green-50 border border-green-200 rounded-xl text-green-700">
              <CheckCircle2 className="w-8 h-8" />
              <p className="font-medium">Nenhum alerta ativo</p>
            </div>
          ) : (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-red-600 uppercase tracking-wider">
                Alertas ativos
              </h2>
              {active.map((a) => (
                <AlertCard
                  key={a.id}
                  alert={a}
                  expanded={expanded.has(a.id)}
                  onToggle={() => setExpanded(prev => {
                    const n = new Set(prev);
                    n.has(a.id) ? n.delete(a.id) : n.add(a.id);
                    return n;
                  })}
                  canResolve={canResolve}
                  onResolve={() => {
                    if (confirm(`Confirmar resolução do alerta de ${a.triggeredByName}?`)) {
                      resolveMutation.mutate(a.id);
                    }
                  }}
                  isPending={resolveMutation.isPending}
                />
              ))}
            </div>
          )}

          {/* Histórico resolvidos */}
          {resolved.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                Histórico — {resolved.length} resolvido{resolved.length > 1 ? 's' : ''}
              </h2>
              <div className="bg-white rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Acionado por</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Data/Hora</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Resolvido por</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Resolvido em</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {resolved.map((a) => (
                      <tr key={a.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{a.triggeredByName}</td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDateTime(a.createdAt)}</td>
                        <td className="px-4 py-3 text-green-700 font-medium">{a.resolvedByName ?? '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {a.resolvedAt ? formatDateTime(a.resolvedAt) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
