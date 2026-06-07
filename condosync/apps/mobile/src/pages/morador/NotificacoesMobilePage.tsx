import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, BellOff, CheckCheck, Package, DollarSign, Megaphone, AlertTriangle, Calendar, FileText, MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

type Notification = {
  id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
};

const TYPE_CONFIG: Record<string, { icon: typeof Bell; color: string; bg: string }> = {
  PARCEL: { icon: Package, color: 'text-amber-500', bg: 'bg-amber-50' },
  FINANCE: { icon: DollarSign, color: 'text-green-500', bg: 'bg-green-50' },
  ANNOUNCEMENT: { icon: Megaphone, color: 'text-purple-500', bg: 'bg-purple-50' },
  ALERT: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50' },
  RESERVATION: { icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-50' },
  DOCUMENT: { icon: FileText, color: 'text-indigo-500', bg: 'bg-indigo-50' },
  MESSAGE: { icon: MessageCircle, color: 'text-teal-500', bg: 'bg-teal-50' },
  DEFAULT: { icon: Bell, color: 'text-slate-500', bg: 'bg-slate-100' },
};

export default function NotificacoesMobilePage() {
  const { selectedCondominiumId } = useAuthStore();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications-inbox', selectedCondominiumId],
    queryFn: async () => {
      const res = await api.get('/notifications/inbox');
      return (res.data.data?.notifications ?? res.data.data ?? []) as Notification[];
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/inbox/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications-inbox'] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => api.patch('/notifications/inbox/read-all'),
    onSuccess: () => {
      toast.success('Todas marcadas como lidas');
      qc.invalidateQueries({ queryKey: ['notifications-inbox'] });
    },
    onError: () => toast.error('Erro ao marcar notificações'),
  });

  const notifications = data ?? [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  function handleOpen(n: Notification) {
    if (!n.read) {
      markReadMutation.mutate(n.id);
    }
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header with unread count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
          <span className="text-sm text-slate-300">
            {unreadCount > 0 ? `${unreadCount} não lida${unreadCount > 1 ? 's' : ''}` : 'Tudo lido'}
          </span>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            className="btn-press text-xs text-blue-400 font-medium flex items-center gap-1"
          >
            <CheckCheck size={14} /> Ler todas
          </button>
        )}
      </div>

      {isLoading && (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && notifications.length === 0 && (
        <div className="text-center py-10 text-slate-400">
          <BellOff size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhuma notificação</p>
        </div>
      )}

      <div className="space-y-2">
        {notifications.map((n) => {
          const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.DEFAULT;
          const Icon = cfg.icon;
          return (
            <button
              key={n.id}
              onClick={() => handleOpen(n)}
              className={[
                'btn-press w-full text-left rounded-2xl border shadow-sm p-4 transition-colors',
                n.read
                  ? 'bg-slate-800/40 border-slate-700'
                  : 'bg-slate-700/60 border-slate-500 ring-1 ring-blue-500/20',
              ].join(' ')}
            >
              <div className="flex items-start gap-3">
                <div className={['w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', cfg.bg].join(' ')}>
                  <Icon size={18} className={cfg.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={['text-sm font-medium truncate', n.read ? 'text-slate-300' : 'text-white'].join(' ')}>
                      {n.title}
                    </p>
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{n.body}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: ptBR })}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
