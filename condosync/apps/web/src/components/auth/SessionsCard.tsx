import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Smartphone, Trash2, Loader2, LogOut, MonitorSmartphone } from 'lucide-react';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

interface Session {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string;
}

function shortUA(ua: string | null): string {
  if (!ua) return 'Dispositivo desconhecido';
  // Heurística: pega Chrome/Firefox/Safari/Edge + OS
  const browser =
    ua.match(/Edg\/[\d.]+/)?.[0] ||
    ua.match(/Chrome\/[\d.]+/)?.[0] ||
    ua.match(/Firefox\/[\d.]+/)?.[0] ||
    ua.match(/Safari\/[\d.]+/)?.[0] ||
    ua.match(/curl\/[\d.]+/)?.[0] ||
    'Navegador';
  const os =
    ua.match(/Windows NT [\d.]+/)?.[0] ||
    ua.match(/Mac OS X [\d._]+/)?.[0] ||
    ua.match(/Android [\d.]+/)?.[0] ||
    ua.match(/iPhone OS [\d._]+/)?.[0] ||
    'OS desconhecido';
  return `${browser} · ${os}`;
}

function timeAgo(iso: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min} min atrás`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} h atrás`;
  const d = Math.round(hr / 24);
  return `${d} d atrás`;
}

export function SessionsCard() {
  const qc = useQueryClient();
  const { refreshToken } = useAuthStore();

  const list = useQuery<Session[]>({
    queryKey: ['sessions'],
    queryFn: async () => (await api.get('/sessions')).data.data.sessions,
  });

  const revokeOne = useMutation({
    mutationFn: (id: string) => api.delete(`/sessions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  });

  const revokeOthers = useMutation({
    mutationFn: () =>
      api.post('/sessions/revoke-others', { currentRefreshToken: refreshToken }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  });

  if (list.isLoading) {
    return (
      <div className="bg-white rounded-xl border p-5 flex items-center gap-2 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Carregando sessões...
      </div>
    );
  }

  const sessions = list.data ?? [];

  return (
    <div className="bg-white rounded-xl border p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <MonitorSmartphone className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <p className="font-medium text-gray-900">Meus dispositivos</p>
            <p className="text-xs text-muted-foreground">
              Sessões ativas. Encerre uma específica ou todas as outras se suspeitar de
              acesso indevido.
            </p>
          </div>
        </div>
        {sessions.length > 1 && (
          <button
            onClick={() => {
              if (
                confirm(
                  'Encerrar todas as outras sessões? Você continuará logado neste dispositivo.',
                )
              ) {
                revokeOthers.mutate();
              }
            }}
            disabled={revokeOthers.isPending}
            className="text-xs flex items-center gap-1.5 border border-amber-200 text-amber-700 hover:bg-amber-50 px-3 py-1.5 rounded-lg disabled:opacity-50"
          >
            <LogOut className="w-3.5 h-3.5" />
            Encerrar outras
          </button>
        )}
      </div>

      {sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhuma sessão ativa.
        </p>
      ) : (
        <ul className="space-y-2">
          {sessions.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-3 border rounded-lg px-3 py-2.5"
            >
              <div className="flex items-start gap-3 min-w-0">
                <Smartphone className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{shortUA(s.userAgent)}</p>
                  <p className="text-xs text-muted-foreground">
                    IP {s.ipAddress ?? '—'} · Último uso {timeAgo(s.lastUsedAt)} · Criada{' '}
                    {timeAgo(s.createdAt)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (confirm('Encerrar esta sessão?')) revokeOne.mutate(s.id);
                }}
                disabled={revokeOne.isPending}
                title="Encerrar"
                className="p-1.5 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default SessionsCard;
