import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import { getSocket } from '../../services/socket';
import { formatDateTime } from '../../lib/utils';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Clock, Home, Loader2, MapPin, RefreshCw, ShieldAlert, Timer, User, Volume2, VolumeX, HandHelping } from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  RESIDENT: 'Morador',
  DOORMAN: 'Porteiro',
  CONDOMINIUM_ADMIN: 'Administrador',
  SYNDIC: 'Síndico',
  SUPER_ADMIN: 'Super Admin',
};

type PanicStatus = 'RESOLVED' | 'ACKNOWLEDGED' | 'ESCALATED' | 'ACTIVE';

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
  acknowledgedBy: string | null;
  acknowledgedByName: string | null;
  acknowledgedAt: string | null;
  escalatedAt: string | null;
  unitId: string | null;
  latitude: number | null;
  longitude: number | null;
  status?: PanicStatus;
  notes: string | null;
  createdAt: string;
};

const MUTE_KEY = 'panic_alarm_muted';

function statusOf(a: PanicAlert): PanicStatus {
  if (a.status) return a.status;
  if (a.resolvedAt) return 'RESOLVED';
  if (a.acknowledgedAt) return 'ACKNOWLEDGED';
  if (a.escalatedAt) return 'ESCALATED';
  return 'ACTIVE';
}

const STATUS_BADGE: Record<PanicStatus, [string, string]> = {
  RESOLVED: ['Resolvido', 'bg-green-100 text-green-700'],
  ACKNOWLEDGED: ['Em atendimento', 'bg-blue-100 text-blue-700'],
  ESCALATED: ['Escalado', 'bg-orange-100 text-orange-700'],
  ACTIVE: ['Ativo', 'bg-red-200 text-red-700'],
};

function StatusBadge({ status }: { status: PanicStatus }) {
  const [label, cls] = STATUS_BADGE[status];
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  );
}

function AlertCard({
  alert: a,
  expanded,
  onToggle,
  canOperate,
  onResolve,
  onAcknowledge,
  isResolving,
  isAcknowledging,
}: {
  alert: PanicAlert;
  expanded: boolean;
  onToggle: () => void;
  canOperate: boolean;
  onResolve: () => void;
  onAcknowledge: () => void;
  isResolving: boolean;
  isAcknowledging: boolean;
}) {
  const elapsed = useElapsed(a.createdAt);
  const status = statusOf(a);
  const borderCls = status === 'ACKNOWLEDGED' ? 'border-blue-400 bg-blue-50' : 'border-red-400 bg-red-50';
  return (
    <div className={`border-2 rounded-xl overflow-hidden ${borderCls}`}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left p-5 flex items-start gap-4 hover:bg-black/5 transition-colors"
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
            <StatusBadge status={status} />
          </div>
          {a.triggeredByUnit && (
            <div className="flex items-center gap-1.5 text-xs text-red-700 font-semibold mb-1">
              <Home className="w-3.5 h-3.5" />
              Unidade {a.triggeredByUnit.identifier}
              {a.triggeredByUnit.block ? ` — Bloco ${a.triggeredByUnit.block}` : ''}
            </div>
          )}
          {status === 'ACKNOWLEDGED' && a.acknowledgedByName && (
            <div className="flex items-center gap-1.5 text-xs text-blue-700 font-semibold mb-1">
              <HandHelping className="w-3.5 h-3.5" />
              Em atendimento por {a.acknowledgedByName}
            </div>
          )}
          <div className="flex items-center gap-3 text-xs text-red-600 flex-wrap">
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{formatDateTime(a.createdAt)}</span>
            <span className="flex items-center gap-1 font-semibold"><Timer className="w-3.5 h-3.5" />há {elapsed}</span>
            {a.latitude != null && a.longitude != null && (
              <a
                href={`https://www.google.com/maps?q=${a.latitude},${a.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-blue-600 underline hover:text-blue-800"
              >
                <MapPin className="w-3.5 h-3.5" />Ver no mapa
              </a>
            )}
          </div>
        </div>
        {expanded
          ? <ChevronUp className="w-5 h-5 text-red-400 shrink-0 mt-1" />
          : <ChevronDown className="w-5 h-5 text-red-400 shrink-0 mt-1" />
        }
      </button>

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
            {a.acknowledgedByName && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Atendido por</p>
                <p className="text-blue-700">{a.acknowledgedByName}{a.acknowledgedAt ? ` — ${formatDateTime(a.acknowledgedAt)}` : ''}</p>
              </div>
            )}
            {a.escalatedAt && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Escalado em</p>
                <p className="text-orange-700">{formatDateTime(a.escalatedAt)}</p>
              </div>
            )}
          </div>
          {a.notes && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Observações</p>
              <p className="text-sm text-gray-700 italic bg-gray-50 rounded-lg px-3 py-2">"{a.notes}"</p>
            </div>
          )}
          {canOperate && (
            <div className="flex justify-end gap-2 pt-1">
              {!a.acknowledgedAt && (
                <button
                  onClick={(e) => { e.stopPropagation(); onAcknowledge(); }}
                  disabled={isAcknowledging}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
                >
                  {isAcknowledging ? <Loader2 className="w-4 h-4 animate-spin" /> : <HandHelping className="w-4 h-4" />}
                  Assumir atendimento
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onResolve(); }}
                disabled={isResolving}
                className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
              >
                {isResolving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
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
  const canOperate = ['DOORMAN', 'CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'].includes(user?.role || '');

  const audioRef = useRef<HTMLAudioElement>(null);
  const [armed, setArmed] = useState(false);
  const [muted, setMuted] = useState(() => {
    try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; }
  });

  const { data: alerts, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ['panic-alerts', selectedCondominiumId],
    queryFn: async () => {
      const res = await api.get(`/panic/${selectedCondominiumId}`);
      return res.data.data as PanicAlert[];
    },
    enabled: !!selectedCondominiumId,
    // Polling de fallback: 5s quando há alerta ativo, 30s quando não há.
    // O realtime via socket é o caminho primário (invalida na hora).
    refetchInterval: (query) => {
      const data = query.state.data as PanicAlert[] | undefined;
      return (data ?? []).some((a) => !a.resolvedAt) ? 5000 : 30000;
    },
    refetchOnWindowFocus: true,
  });

  // Realtime — assina eventos e invalida a query. Cleanup obrigatório
  // para não duplicar listeners (invalidações/áudio duplicados).
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return; // polling fallback cobre enquanto o socket não está pronto
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['panic-alerts'] });
    socket.on('panic:alert', invalidate);
    socket.on('panic:update', invalidate);
    return () => {
      socket.off('panic:alert', invalidate);
      socket.off('panic:update', invalidate);
    };
  }, [queryClient]);

  const resolveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/panic/${id}/resolve`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['panic-alerts'] }),
  });
  const acknowledgeMutation = useMutation({
    mutationFn: (id: string) => api.post(`/panic/${id}/acknowledge`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['panic-alerts'] }),
  });

  const active = (alerts ?? []).filter((a) => !a.resolvedAt);
  const resolved = (alerts ?? []).filter((a) => !!a.resolvedAt);
  // Alarme toca enquanto houver alerta NÃO resolvido e NÃO reconhecido.
  const unacked = active.filter((a) => !a.acknowledgedAt);
  const shouldAlarm = unacked.length > 0;

  // Liga/desliga o alarme conforme estado (respeita mute + arming).
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (shouldAlarm && armed && !muted) {
      el.play().catch(() => { /* bloqueado: banner pede para armar */ });
    } else {
      el.pause();
      el.currentTime = 0;
    }
  }, [shouldAlarm, armed, muted]);

  const armAudio = () => {
    const el = audioRef.current;
    if (!el) return;
    // Desbloqueia o áudio dentro do gesto do usuário (autoplay policy).
    el.play().then(() => {
      if (!(shouldAlarm && !muted)) { el.pause(); el.currentTime = 0; }
      setArmed(true);
    }).catch(() => setArmed(true));
  };

  const toggleMute = () => {
    setMuted((m) => {
      const next = !m;
      try { localStorage.setItem(MUTE_KEY, next ? '1' : '0'); } catch { /* ignore */ }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <audio ref={audioRef} src="/sounds/alarm.mp3" loop preload="auto" />

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
            onClick={toggleMute}
            title={muted ? 'Ativar som do alarme' : 'Silenciar alarme'}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
          >
            {muted ? <VolumeX className="w-4 h-4 text-gray-500" /> : <Volume2 className="w-4 h-4 text-gray-500" />}
          </button>
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

      {/* Banner de arming do áudio — só quando há alarme para tocar e não está armado/mudo */}
      {shouldAlarm && !armed && !muted && (
        <button
          onClick={armAudio}
          className="w-full flex items-center justify-center gap-2 bg-amber-100 border border-amber-300 text-amber-800 font-medium px-4 py-3 rounded-xl hover:bg-amber-200 transition-colors"
        >
          <Volume2 className="w-4 h-4" />
          Clique para ativar o alerta sonoro
        </button>
      )}

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
                    if (n.has(a.id)) n.delete(a.id); else n.add(a.id);
                    return n;
                  })}
                  canOperate={canOperate}
                  onAcknowledge={() => acknowledgeMutation.mutate(a.id)}
                  onResolve={() => {
                    if (confirm(`Confirmar resolução do alerta de ${a.triggeredByName}?`)) {
                      resolveMutation.mutate(a.id);
                    }
                  }}
                  isAcknowledging={acknowledgeMutation.isPending}
                  isResolving={resolveMutation.isPending}
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
