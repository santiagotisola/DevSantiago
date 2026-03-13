import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import {
  Receipt,
  Loader2,
  ExternalLink,
  QrCode,
  Copy,
  CheckCircle,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';

const statusConfig: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  PENDING: { label: 'Pendente', icon: Clock, className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  PAID: { label: 'Pago', icon: CheckCircle, className: 'bg-green-100 text-green-700 border-green-200' },
  OVERDUE: { label: 'Em Atraso', icon: AlertTriangle, className: 'bg-red-100 text-red-700 border-red-200' },
  CANCELED: { label: 'Cancelada', icon: Receipt, className: 'bg-gray-100 text-gray-500 border-gray-200' },
};

export default function MyChargesPage() {
  const { user, selectedCondominiumId } = useAuthStore();
  const [pixModal, setPixModal] = useState<{ qrCode: string; copyPaste: string } | null>(null);
  const [filter, setFilter] = useState<'all' | 'PENDING' | 'OVERDUE' | 'PAID'>('all');

  // Encontra a unidade do morador neste condomínio
  const unitId = user?.condominiumUsers?.find(
    (cu: any) => cu.condominium.id === selectedCondominiumId,
  )?.unitId;

  const { data, isLoading } = useQuery({
    queryKey: ['my-charges', unitId],
    queryFn: async () => {
      const res = await api.get(`/finance/charges/unit/${unitId}`);
      return res.data.data as { pending: any[]; total: number };
    },
    enabled: !!unitId,
  });

  // O endpoint /charges/unit retorna apenas pending+overdue; para histórico completo busca pelo condominium
  const { data: allCharges } = useQuery({
    queryKey: ['my-charges-all', unitId],
    queryFn: async () => {
      const res = await api.get(`/finance/charges/${selectedCondominiumId}?unitId=${unitId}`);
      return (res.data.data?.charges ?? []) as any[];
    },
    enabled: !!unitId && !!selectedCondominiumId,
  });

  const charges = (allCharges ?? []) as any[];
  const filtered = filter === 'all' ? charges : charges.filter((c) => c.status === filter);

  const pendingTotal = charges
    .filter((c) => c.status === 'PENDING' || c.status === 'OVERDUE')
    .reduce((sum: number, c: any) => sum + Number(c.amount), 0);

  const overdueCount = charges.filter((c) => c.status === 'OVERDUE').length;

  if (!unitId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
        <Receipt className="w-12 h-12 opacity-30" />
        <p>Nenhuma unidade vinculada à sua conta neste condomínio.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Minhas Cobranças</h1>
        <p className="text-muted-foreground">Boletos, taxas e histórico de pagamentos da sua unidade</p>
      </div>

      {/* Cards de resumo */}
      {!isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border p-5">
            <p className="text-sm text-muted-foreground">Total em Aberto</p>
            <p className="text-3xl font-bold mt-1 text-orange-600">{formatCurrency(pendingTotal)}</p>
          </div>
          <div className="bg-white rounded-xl border p-5">
            <p className="text-sm text-muted-foreground">Cobranças Pendentes</p>
            <p className="text-3xl font-bold mt-1">{charges.filter((c) => c.status === 'PENDING').length}</p>
          </div>
          <div
            className={`bg-white rounded-xl border p-5 ${overdueCount > 0 ? 'border-red-200 bg-red-50' : ''}`}
          >
            <p className="text-sm text-muted-foreground">Em Atraso</p>
            <p className={`text-3xl font-bold mt-1 ${overdueCount > 0 ? 'text-red-600' : ''}`}>{overdueCount}</p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'PENDING', 'OVERDUE', 'PAID'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              filter === f
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            {f === 'all' ? 'Todas' : statusConfig[f]?.label}
          </button>
        ))}
      </div>

      {/* Lista de cobranças */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground bg-white rounded-xl border">
          <CheckCircle className="w-10 h-10 opacity-20" />
          <p>Nenhuma cobrança encontrada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c: any) => {
            const st = statusConfig[c.status] ?? statusConfig.PENDING;
            const StatusIcon = st.icon;
            const hasPayment = !!(c.paymentLink || c.boletoUrl || c.pixCopyPaste);
            const isOpen = c.status === 'PENDING' || c.status === 'OVERDUE';

            return (
              <div
                key={c.id}
                className={`bg-white rounded-xl border p-5 ${c.status === 'OVERDUE' ? 'border-red-200' : ''}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${st.className}`}>
                        <StatusIcon className="w-3 h-3" />
                        {st.label}
                      </span>
                      {c.referenceMonth && (
                        <span className="text-xs text-muted-foreground">Ref: {c.referenceMonth}</span>
                      )}
                    </div>
                    <p className="font-semibold text-gray-900">{c.description}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">Vencimento: {formatDate(c.dueDate)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-xl font-bold ${c.status === 'OVERDUE' ? 'text-red-600' : ''}`}>
                      {formatCurrency(c.amount)}
                    </p>
                    {c.paidAmount && c.status === 'PAID' && (
                      <p className="text-xs text-muted-foreground">Pago: {formatCurrency(c.paidAmount)}</p>
                    )}
                  </div>
                </div>

                {/* Ações de pagamento */}
                {isOpen && (
                  <div className="mt-4 pt-4 border-t flex flex-wrap gap-2">
                    {c.paymentLink && (
                      <a
                        href={c.paymentLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Pagar Online
                      </a>
                    )}
                    {c.boletoUrl && (
                      <a
                        href={c.boletoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 border border-orange-300 text-orange-700 hover:bg-orange-50 text-sm font-medium rounded-lg"
                      >
                        <Receipt className="w-4 h-4" />
                        Ver Boleto
                      </a>
                    )}
                    {c.pixCopyPaste && (
                      <button
                        onClick={() => setPixModal({ qrCode: c.pixQrCode, copyPaste: c.pixCopyPaste })}
                        className="flex items-center gap-2 px-4 py-2 border border-green-300 text-green-700 hover:bg-green-50 text-sm font-medium rounded-lg"
                      >
                        <QrCode className="w-4 h-4" />
                        PIX
                      </button>
                    )}
                    {!hasPayment && (
                      <p className="text-sm text-muted-foreground self-center">
                        Entre em contato com a administração para obter o link de pagamento.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal PIX */}
      {pixModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-semibold">Pagar via PIX</h2>
            {pixModal.qrCode && (
              <div className="flex justify-center">
                <img
                  src={`data:image/png;base64,${pixModal.qrCode}`}
                  alt="QR Code PIX"
                  className="w-48 h-48 border rounded-lg"
                />
              </div>
            )}
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">Código PIX (copia e cola)</p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={pixModal.copyPaste}
                  className="flex-1 px-3 py-2 border rounded-lg text-xs bg-gray-50 font-mono"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(pixModal.copyPaste)}
                  className="p-2 border rounded-lg hover:bg-gray-50"
                  title="Copiar código PIX"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
            <button onClick={() => setPixModal(null)} className="w-full px-4 py-2 border rounded-lg text-sm">
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
