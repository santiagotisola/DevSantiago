import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle, Clock, Camera, Search } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

type Visitor = {
  id: string;
  name: string;
  document?: string;
  reason?: string;
  photoUrl?: string;
  entryAt?: string;
  exitAt?: string;
  preAuthorized: boolean;
  unit?: { identifier: string; block?: string };
};

function StatusBadge({ visitor }: { visitor: Visitor }) {
  if (visitor.exitAt) return <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">Saiu</span>;
  if (visitor.entryAt) return <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">No condomínio</span>;
  if (visitor.preAuthorized) return <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">Pré-autorizado</span>;
  return <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">Aguardando</span>;
}

export default function VisitantesPortaria() {
  const { selectedCondominiumId } = useAuthStore();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');

  const today = format(new Date(), 'yyyy-MM-dd');

  const { data, isLoading } = useQuery({
    queryKey: ['visitors-portaria', selectedCondominiumId, today],
    queryFn: async () => {
      const res = await api.get(`/visitors/condominium/${selectedCondominiumId}?date=${today}&limit=100`);
      return res.data.data as Visitor[];
    },
    enabled: !!selectedCondominiumId,
    refetchInterval: 30000,
  });

  const entryMutation = useMutation({
    mutationFn: (id: string) => api.post(`/visitors/${id}/entry`),
    onSuccess: () => {
      toast.success('Entrada registrada!');
      qc.invalidateQueries({ queryKey: ['visitors-portaria'] });
    },
    onError: () => toast.error('Erro ao registrar entrada'),
  });

  const exitMutation = useMutation({
    mutationFn: (id: string) => api.post(`/visitors/${id}/exit`),
    onSuccess: () => {
      toast.success('Saída registrada!');
      qc.invalidateQueries({ queryKey: ['visitors-portaria'] });
    },
    onError: () => toast.error('Erro ao registrar saída'),
  });

  const visitors = (data ?? []).filter(
    (v) =>
      !search ||
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.unit?.identifier.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 space-y-4">
      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          placeholder="Buscar visitante ou unidade..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {isLoading && (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && visitors.length === 0 && (
        <div className="text-center py-10 text-gray-400">
          <Clock size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhum visitante encontrado</p>
        </div>
      )}

      <div className="space-y-3">
        {visitors.map((v) => (
          <div key={v.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                {v.photoUrl ? (
                  <img src={v.photoUrl} alt={v.name} className="w-full h-full object-cover" />
                ) : (
                  <Camera size={20} className="text-gray-400" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-gray-900 truncate">{v.name}</p>
                  <StatusBadge visitor={v} />
                </div>
                {v.unit && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    Unid. {v.unit.identifier}{v.unit.block ? ` • Bloco ${v.unit.block}` : ''}
                  </p>
                )}
                {v.reason && <p className="text-xs text-gray-500 truncate">{v.reason}</p>}
              </div>
            </div>

            {/* Actions */}
            {!v.exitAt && (
              <div className="mt-3 flex gap-2">
                {!v.entryAt && (
                  <button
                    onClick={() => entryMutation.mutate(v.id)}
                    disabled={entryMutation.isPending}
                    className="btn-press flex-1 bg-green-600 text-white rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle size={16} />
                    Entrada
                  </button>
                )}
                {v.entryAt && (
                  <button
                    onClick={() => exitMutation.mutate(v.id)}
                    disabled={exitMutation.isPending}
                    className="btn-press flex-1 bg-gray-600 text-white rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5"
                  >
                    <XCircle size={16} />
                    Saída
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
