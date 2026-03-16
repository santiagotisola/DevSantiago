import { useQuery } from '@tanstack/react-query';
import { DollarSign, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

type Charge = {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  paidAt?: string;
  pixCode?: string;
  boletoUrl?: string;
};

const STATUS_CONFIG = {
  PENDING: { label: 'Pendente', color: 'text-yellow-700 bg-yellow-50', icon: Clock },
  PAID: { label: 'Pago', color: 'text-green-700 bg-green-50', icon: CheckCircle },
  OVERDUE: { label: 'Vencido', color: 'text-red-700 bg-red-50', icon: AlertCircle },
  CANCELLED: { label: 'Cancelado', color: 'text-gray-500 bg-gray-100', icon: AlertCircle },
};

function fmtBRL(val: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val / 100);
}

export default function MinhasCobrancas() {
  const { selectedCondominiumId, user } = useAuthStore();

  const unitId = user?.condominiumUsers?.find(
    (cu) => cu.condominiumId === selectedCondominiumId
  )?.unitId;

  const { data, isLoading } = useQuery({
    queryKey: ['my-charges', selectedCondominiumId, unitId],
    queryFn: async () => {
      const res = await api.get(`/finance/charges/${selectedCondominiumId}?unitId=${unitId}&limit=50`);
      return res.data.data as Charge[];
    },
    enabled: !!selectedCondominiumId && !!unitId,
  });

  const charges = data ?? [];
  const total = charges.filter((c) => c.status === 'OVERDUE').length;

  return (
    <div className="p-4 space-y-4">
      {/* Summary */}
      {total > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700 font-medium">
            {total} cobrança{total > 1 ? 's' : ''} vencida{total > 1 ? 's' : ''}
          </p>
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && charges.length === 0 && (
        <div className="text-center py-10 text-gray-400">
          <DollarSign size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhuma cobrança encontrada</p>
        </div>
      )}

      <div className="space-y-3">
        {charges.map((c) => {
          const cfg = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.PENDING;
          const Icon = cfg.icon;
          return (
            <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{c.description}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Venc.: {format(new Date(c.dueDate), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                  {c.paidAt && (
                    <p className="text-xs text-green-600 mt-0.5">
                      Pago em {format(new Date(c.paidAt), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <p className="font-bold text-gray-900">{fmtBRL(c.amount)}</p>
                  <span className={['text-xs px-2 py-0.5 rounded-full flex items-center gap-1', cfg.color].join(' ')}>
                    <Icon size={11} />
                    {cfg.label}
                  </span>
                </div>
              </div>

              {/* PIX / Boleto */}
              {(c.status === 'PENDING' || c.status === 'OVERDUE') && (c.pixCode || c.boletoUrl) && (
                <div className="mt-3 flex gap-2">
                  {c.pixCode && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(c.pixCode!);
                        alert('Código PIX copiado!');
                      }}
                      className="btn-press flex-1 bg-teal-600 text-white rounded-xl py-2.5 text-sm font-semibold"
                    >
                      Copiar PIX
                    </button>
                  )}
                  {c.boletoUrl && (
                    <a
                      href={c.boletoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-press flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-semibold text-center"
                    >
                      Ver Boleto
                    </a>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
