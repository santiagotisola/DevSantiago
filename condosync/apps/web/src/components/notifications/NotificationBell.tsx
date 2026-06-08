import { useState, useRef, useEffect } from 'react';
import { Bell, Check, CheckCheck, Package, Users, Wrench, CreditCard, Megaphone, MessageCircle, Calendar, AlertTriangle, BookOpen, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { useNavigate } from 'react-router-dom';
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

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return 'agora';
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `há ${Math.floor(diff / 86400)}d`;
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: countData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: () => api.get('/notifications/inbox/unread-count').then((r) => r.data.data),
    refetchInterval: 30000,
  });

  const { data: listData } = useQuery({
    queryKey: ['notifications-inbox-preview'],
    queryFn: () => api.get('/notifications/inbox?limit=10').then((r) => r.data.data),
    enabled: open,
  });

  const markAllMutation = useMutation({
    mutationFn: () => api.patch('/notifications/inbox/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-inbox-preview'] });
    },
  });

  const markOneMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/inbox/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-inbox-preview'] });
    },
  });

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const unreadCount = countData?.count ?? 0;
  const notifications: Notification[] = listData?.notifications ?? [];

  function handleNotificationClick(n: Notification) {
    if (!n.isRead) markOneMutation.mutate(n.id);
    setOpen(false);
    navigate('/notificacoes');
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Notificações"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white border rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-900">Notificações</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllMutation.mutate()}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Marcar todas
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600" title="Fechar notificações" aria-label="Fechar notificações">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-sm">
                Nenhuma notificação
              </div>
            ) : (
              notifications.map((n) => {
                const Icon = TYPE_ICONS[n.type] || Bell;
                return (
                  <button
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={cn(
                      'w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex gap-3',
                      !n.isRead && 'bg-blue-50/50',
                    )}
                  >
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                      !n.isRead ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500',
                    )}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm leading-tight', !n.isRead && 'font-semibold')}>
                        {n.title}
                      </p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{n.message}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.isRead && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-2" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t px-4 py-2.5 bg-gray-50">
            <button
              onClick={() => { setOpen(false); navigate('/notificacoes'); }}
              className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Ver todas as notificações
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
