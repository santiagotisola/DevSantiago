import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Bell, Check, CheckCheck, Package, Users, Wrench, CreditCard, Megaphone, MessageCircle, Calendar, AlertTriangle, BookOpen, Trash2, Filter } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  referenceId?: string;
  referenceType?: string;
  createdAt: string;
}

const TYPE_ICONS: Record<string, typeof Bell> = {
  VISITOR: Users,
  VISITOR_ARRIVAL: Users,
  PARCEL: Package,
  PARCEL_RECEIVED: Package,
  MAINTENANCE: Wrench,
  MAINTENANCE_UPDATE: Wrench,
  FINANCIAL: CreditCard,
  PAYMENT_DUE: CreditCard,
  PAYMENT_CONFIRMED: CreditCard,
  COMMUNICATION: Megaphone,
  ANNOUNCEMENT: Megaphone,
  TICKET_REPLY: MessageCircle,
  ASSEMBLY: Calendar,
  ASSEMBLY_SCHEDULED: Calendar,
  PANIC: AlertTriangle,
  PANIC_ALERT: AlertTriangle,
  RESERVATION: BookOpen,
  RESERVATION_STATUS: BookOpen,
  GENERAL: Bell,
};

const TYPE_COLORS: Record<string, string> = {
  VISITOR: 'bg-green-100 text-green-700',
  VISITOR_ARRIVAL: 'bg-green-100 text-green-700',
  PARCEL: 'bg-amber-100 text-amber-700',
  PARCEL_RECEIVED: 'bg-amber-100 text-amber-700',
  MAINTENANCE: 'bg-orange-100 text-orange-700',
  MAINTENANCE_UPDATE: 'bg-orange-100 text-orange-700',
  FINANCIAL: 'bg-purple-100 text-purple-700',
  PAYMENT_DUE: 'bg-red-100 text-red-700',
  PAYMENT_CONFIRMED: 'bg-emerald-100 text-emerald-700',
  COMMUNICATION: 'bg-blue-100 text-blue-700',
  ANNOUNCEMENT: 'bg-blue-100 text-blue-700',
  TICKET_REPLY: 'bg-indigo-100 text-indigo-700',
  ASSEMBLY: 'bg-cyan-100 text-cyan-700',
  ASSEMBLY_SCHEDULED: 'bg-cyan-100 text-cyan-700',
  PANIC: 'bg-red-100 text-red-700',
  PANIC_ALERT: 'bg-red-100 text-red-700',
  RESERVATION: 'bg-teal-100 text-teal-700',
  RESERVATION_STATUS: 'bg-teal-100 text-teal-700',
  GENERAL: 'bg-gray-100 text-gray-700',
};

const TYPE_LABELS: Record<string, string> = {
  VISITOR: 'Visitante',
  VISITOR_ARRIVAL: 'Visitante',
  PARCEL: 'Encomenda',
  PARCEL_RECEIVED: 'Encomenda',
  MAINTENANCE: 'Manutenção',
  MAINTENANCE_UPDATE: 'Manutenção',
  FINANCIAL: 'Financeiro',
  PAYMENT_DUE: 'Cobrança',
  PAYMENT_CONFIRMED: 'Pagamento',
  COMMUNICATION: 'Comunicado',
  ANNOUNCEMENT: 'Comunicado',
  TICKET_REPLY: 'Chamado',
  ASSEMBLY: 'Assembleia',
  ASSEMBLY_SCHEDULED: 'Assembleia',
  PANIC: 'Pânico',
  PANIC_ALERT: 'Pânico',
  RESERVATION: 'Reserva',
  RESERVATION_STATUS: 'Reserva',
  GENERAL: 'Geral',
};

type FilterTab = 'all' | 'unread';

export function NotificationsPage() {
  const [tab, setTab] = useState<FilterTab>('all');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', '20');
  if (tab === 'unread') params.set('isRead', 'false');
  if (typeFilter) params.set('type', typeFilter);

  const { data, isLoading } = useQuery({
    queryKey: ['notifications-page', tab, typeFilter, page],
    queryFn: () => api.get(`/notifications/inbox?${params.toString()}`).then((r) => r.data.data),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/inbox/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-page'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => api.patch('/notifications/inbox/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-page'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/notifications/inbox/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-page'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  const notifications: Notification[] = data?.notifications ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const unreadCount = data?.unreadCount ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notificações</h1>
          <p className="text-sm text-gray-500 mt-1">
            {unreadCount > 0 ? `${unreadCount} não lida${unreadCount > 1 ? 's' : ''}` : 'Tudo em dia'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            Marcar todas como lidas
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => { setTab('all'); setPage(1); }}
            className={cn(
              'px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
              tab === 'all' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            Todas
          </button>
          <button
            onClick={() => { setTab('unread'); setPage(1); }}
            className={cn(
              'px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
              tab === 'unread' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            Não lidas
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="text-sm border rounded-lg px-3 py-1.5 bg-white"
          >
            <option value="">Todos os tipos</option>
            <option value="VISITOR">Visitantes</option>
            <option value="PARCEL">Encomendas</option>
            <option value="MAINTENANCE">Manutenção</option>
            <option value="FINANCIAL">Financeiro</option>
            <option value="ANNOUNCEMENT">Comunicados</option>
            <option value="TICKET_REPLY">Chamados</option>
            <option value="ASSEMBLY">Assembleias</option>
            <option value="PANIC">Pânico</option>
            <option value="RESERVATION">Reservas</option>
          </select>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border shadow-sm divide-y">
        {isLoading ? (
          <div className="py-16 text-center text-gray-400">Carregando...</div>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nenhuma notificação encontrada</p>
          </div>
        ) : (
          notifications.map((n) => {
            const Icon = TYPE_ICONS[n.type] || Bell;
            const colorClass = TYPE_COLORS[n.type] || TYPE_COLORS.GENERAL;
            const label = TYPE_LABELS[n.type] || 'Geral';

            return (
              <div
                key={n.id}
                className={cn(
                  'flex items-start gap-4 px-5 py-4 transition-colors',
                  !n.isRead && 'bg-blue-50/40',
                )}
              >
                <div className={cn('w-10 h-10 rounded-full flex items-center justify-center shrink-0', colorClass)}>
                  <Icon className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={cn('text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded', colorClass)}>
                      {label}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(n.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className={cn('text-sm', !n.isRead ? 'font-semibold text-gray-900' : 'text-gray-700')}>
                    {n.title}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">{n.message}</p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {!n.isRead && (
                    <button
                      onClick={() => markReadMutation.mutate(n.id)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Marcar como lida"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteMutation.mutate(n.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Mostrando {notifications.length} de {total} notificações
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50 hover:bg-gray-50"
            >
              Anterior
            </button>
            <span className="px-3 py-1.5 text-sm text-gray-600">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50 hover:bg-gray-50"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
