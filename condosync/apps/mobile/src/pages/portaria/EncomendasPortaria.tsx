import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, CheckCircle, Search, QrCode } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

type Parcel = {
  id: string;
  trackingCode?: string;
  carrier?: string;
  receivedAt: string;
  deliveredAt?: string;
  unit?: { identifier: string; block?: string };
  resident?: { name: string };
};

export default function EncomendasPortaria() {
  const { selectedCondominiumId } = useAuthStore();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showDelivered, setShowDelivered] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['parcels-portaria', selectedCondominiumId, showDelivered],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '100' });
      const res = await api.get(`/parcels/condominium/${selectedCondominiumId}?${params}`);
      const all = res.data.data as Parcel[];
      return showDelivered ? all : all.filter((p) => !p.deliveredAt);
    },
    enabled: !!selectedCondominiumId,
    refetchInterval: 60000,
  });

  const deliverMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/parcels/${id}/pickup`),
    onSuccess: () => {
      toast.success('Entrega registrada!');
      qc.invalidateQueries({ queryKey: ['parcels-portaria'] });
    },
    onError: () => toast.error('Erro ao registrar entrega'),
  });

  const parcels = (data ?? []).filter(
    (p) =>
      !search ||
      p.unit?.identifier.toLowerCase().includes(search.toLowerCase()) ||
      p.resident?.name.toLowerCase().includes(search.toLowerCase()) ||
      p.trackingCode?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 space-y-4">
      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Unidade, morador ou código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <button
          onClick={() => setShowDelivered((v) => !v)}
          className={[
            'px-3 py-2.5 rounded-xl text-sm font-medium border transition-colors',
            showDelivered
              ? 'bg-primary-600 text-white border-primary-600'
              : 'bg-white text-gray-600 border-gray-200',
          ].join(' ')}
        >
          Entregues
        </button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && parcels.length === 0 && (
        <div className="text-center py-10 text-gray-400">
          <Package size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhuma encomenda pendente</p>
        </div>
      )}

      <div className="space-y-3">
        {parcels.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                <Package size={20} className="text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">
                  Unid. {p.unit?.identifier ?? '—'}
                  {p.unit?.block ? ` • Bloco ${p.unit.block}` : ''}
                </p>
                {p.resident?.name && (
                  <p className="text-xs text-gray-500">{p.resident.name}</p>
                )}
                {p.carrier && (
                  <p className="text-xs text-gray-500">{p.carrier}</p>
                )}
                {p.trackingCode && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <QrCode size={11} className="text-gray-400" />
                    <span className="text-xs text-gray-400 font-mono">{p.trackingCode}</span>
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  Recebido em {format(new Date(p.receivedAt), "dd/MM 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
              {p.deliveredAt && (
                <CheckCircle size={20} className="text-green-500 flex-shrink-0 mt-0.5" />
              )}
            </div>

            {!p.deliveredAt && (
              <button
                onClick={() => deliverMutation.mutate(p.id)}
                disabled={deliverMutation.isPending}
                className="btn-press mt-3 w-full bg-amber-500 text-white rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5"
              >
                <CheckCircle size={16} />
                Entregar ao morador
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
