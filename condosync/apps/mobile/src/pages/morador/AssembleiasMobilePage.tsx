import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, CheckCircle2, Clock, Vote, ChevronRight, Users } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

type VotingOption = { id: string; label: string; votes?: number };
type VotingItem = {
  id: string;
  title: string;
  description?: string;
  options: VotingOption[];
  userVote?: string | null;
  status: 'OPEN' | 'CLOSED';
};
type Assembly = {
  id: string;
  title: string;
  description?: string;
  scheduledDate: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'VOTING' | 'COMPLETED' | 'CANCELLED';
  agenda?: string;
  votingItems?: VotingItem[];
  location?: string;
  attendeesCount?: number;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  SCHEDULED: { label: 'Agendada', color: 'text-blue-700 bg-blue-50', icon: Clock },
  IN_PROGRESS: { label: 'Em Andamento', color: 'text-yellow-700 bg-yellow-50', icon: Users },
  VOTING: { label: 'Em Votação', color: 'text-purple-700 bg-purple-50', icon: Vote },
  COMPLETED: { label: 'Concluída', color: 'text-green-700 bg-green-50', icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelada', color: 'text-gray-500 bg-gray-100', icon: Clock },
};

export default function AssembleiasMobilePage() {
  const { selectedCondominiumId } = useAuthStore();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Assembly | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['assemblies', selectedCondominiumId],
    queryFn: async () => {
      const res = await api.get(`/assemblies/condominium/${selectedCondominiumId}`);
      return (res.data.data?.assemblies ?? res.data.data ?? []) as Assembly[];
    },
    enabled: !!selectedCondominiumId,
  });

  const voteMutation = useMutation({
    mutationFn: ({ assemblyId, votingItemId, optionId }: { assemblyId: string; votingItemId: string; optionId: string }) =>
      api.post(`/assemblies/${assemblyId}/vote`, { votingItemId, optionId }),
    onSuccess: () => {
      toast.success('Voto registrado!');
      qc.invalidateQueries({ queryKey: ['assemblies'] });
    },
    onError: () => toast.error('Erro ao registrar voto'),
  });

  const assemblies = data ?? [];

  // ── Detail view ──
  if (selected) {
    const cfg = STATUS_CONFIG[selected.status] ?? STATUS_CONFIG.SCHEDULED;
    return (
      <div className="p-4 space-y-4">
        <button onClick={() => setSelected(null)} className="text-sm text-blue-400 font-medium">← Voltar</button>

        <h2 className="text-lg font-bold text-white">{selected.title}</h2>

        <div className="flex flex-wrap gap-2">
          <span className={['text-xs px-2 py-0.5 rounded-full font-medium', cfg.color].join(' ')}>
            {cfg.label}
          </span>
          <span className="text-xs text-slate-300">
            {format(new Date(selected.scheduledDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </span>
        </div>

        {selected.location && (
          <p className="text-sm text-slate-300">📍 {selected.location}</p>
        )}

        {selected.description && (
          <div className="bg-slate-700/60 rounded-xl p-4 border border-slate-600">
            <p className="text-xs text-slate-400 mb-1 font-medium">Descrição</p>
            <p className="text-sm text-slate-200 whitespace-pre-wrap">{selected.description}</p>
          </div>
        )}

        {selected.agenda && (
          <div className="bg-slate-700/60 rounded-xl p-4 border border-slate-600">
            <p className="text-xs text-slate-400 mb-1 font-medium">Pauta</p>
            <p className="text-sm text-slate-200 whitespace-pre-wrap">{selected.agenda}</p>
          </div>
        )}

        {/* Voting Items */}
        {selected.votingItems && selected.votingItems.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-200">Itens de Votação</h3>
            {selected.votingItems.map((item) => (
              <div key={item.id} className="bg-slate-700/60 rounded-xl p-4 border border-slate-600 space-y-2">
                <p className="font-medium text-white text-sm">{item.title}</p>
                {item.description && <p className="text-xs text-slate-400">{item.description}</p>}

                {item.status === 'OPEN' && !item.userVote ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {item.options.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => voteMutation.mutate({ assemblyId: selected.id, votingItemId: item.id, optionId: opt.id })}
                        disabled={voteMutation.isPending}
                        className="btn-press px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg font-medium"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                ) : item.userVote ? (
                  <p className="text-xs text-green-400 flex items-center gap-1">
                    <CheckCircle2 size={12} /> Você já votou
                  </p>
                ) : (
                  <div className="space-y-1 pt-1">
                    {item.options.map((opt) => (
                      <div key={opt.id} className="flex justify-between text-xs text-slate-300">
                        <span>{opt.label}</span>
                        <span className="font-medium">{opt.votes ?? 0} votos</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── List view ──
  return (
    <div className="p-4 space-y-4">
      {isLoading && (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && assemblies.length === 0 && (
        <div className="text-center py-10 text-slate-400">
          <CalendarDays size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhuma assembleia encontrada</p>
        </div>
      )}

      <div className="space-y-3">
        {assemblies.map((a) => {
          const cfg = STATUS_CONFIG[a.status] ?? STATUS_CONFIG.SCHEDULED;
          const Icon = cfg.icon;
          return (
            <button
              key={a.id}
              onClick={() => setSelected(a)}
              className="btn-press w-full bg-slate-700/60 rounded-2xl border border-slate-600 shadow-sm p-4 text-left"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">{a.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {format(new Date(a.scheduledDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                  {a.agenda && (
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{a.agenda}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className={['text-xs px-2 py-0.5 rounded-full flex items-center gap-1', cfg.color].join(' ')}>
                    <Icon size={11} />
                    {cfg.label}
                  </span>
                  <ChevronRight size={16} className="text-slate-500" />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
