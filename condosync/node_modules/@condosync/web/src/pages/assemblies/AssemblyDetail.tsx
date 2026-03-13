import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { 
  Calendar, Video, Users, ChevronLeft, 
  CheckCircle2, Clock, BarChart3, Loader2,
  Lock, ArrowRight, Save
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface VotingItem {
  id: string;
  title: string;
  description: string | null;
  options: { id: string; text: string }[];
  votes: any[];
  _count: { votes: number };
}

interface AssemblyDetail {
  id: string;
  title: string;
  description: string | null;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELED';
  scheduledAt: string;
  meetingUrl: string | null;
  votingItems: VotingItem[];
}

export default function AssemblyDetail() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedVotes, setSelectedVotes] = useState<Record<string, string>>({});

  const { data: assembly, isLoading } = useQuery<AssemblyDetail>({
    queryKey: ['assembly', id],
    queryFn: async () => {
      const res = await api.get(`/assemblies/${id}`);
      return res.data;
    },
  });

  const { data: results } = useQuery({
    queryKey: ['assembly-results', id],
    queryFn: async () => {
      const res = await api.get(`/assemblies/${id}/results`);
      return res.data;
    },
    enabled: assembly?.status === 'IN_PROGRESS' || assembly?.status === 'FINISHED',
    refetchInterval: assembly?.status === 'IN_PROGRESS' ? 10000 : false,
  });

  const attendanceMutation = useMutation({
    mutationFn: () => api.post(`/assemblies/${id}/attendance`),
  });

  const voteMutation = useMutation({
    mutationFn: ({ itemId, optionId }: { itemId: string; optionId: string }) => 
      api.post(`/assemblies/items/${itemId}/vote`, { optionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assembly-results', id] });
    },
  });

  useEffect(() => {
    if (assembly && assembly.status === 'IN_PROGRESS') {
      attendanceMutation.mutate();
    }
  }, [assembly?.status]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!assembly) return <div>Assembleia não encontrada</div>;

  const handleVote = (itemId: string, optionId: string) => {
    setSelectedVotes(prev => ({ ...prev, [itemId]: optionId }));
    voteMutation.mutate({ itemId, optionId });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Voltar */}
      <Link to="/assembleias" className="inline-flex items-center text-sm text-slate-500 hover:text-indigo-600 transition-colors">
        <ChevronLeft className="w-4 h-4 mr-1" /> Voltar para lista
      </Link>

      {/* Header Card */}
      <div className="bg-white rounded-2xl border p-6 md:p-8 shadow-sm relative overflow-hidden">
        <div className={`absolute top-0 left-0 w-full h-1.5 ${
          assembly.status === 'IN_PROGRESS' ? 'bg-indigo-500' :
          assembly.status === 'SCHEDULED' ? 'bg-slate-300' : 'bg-green-500'
        }`} />
        
        <div className="flex flex-col md:flex-row justify-between items-start gap-6">
          <div className="space-y-4 flex-1">
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${
                assembly.status === 'IN_PROGRESS' ? 'bg-indigo-100 text-indigo-700 animate-pulse' :
                assembly.status === 'SCHEDULED' ? 'bg-slate-100 text-slate-700' :
                'bg-green-100 text-green-700'
              }`}>
                {assembly.status === 'IN_PROGRESS' ? 'Ao Vivo' : 
                 assembly.status === 'SCHEDULED' ? 'Agendada' : 'Finalizada'}
              </span>
              <div className="flex items-center text-sm text-slate-500">
                <Calendar className="w-4 h-4 mr-1.5" />
                {new Date(assembly.scheduledAt).toLocaleString('pt-BR')}
              </div>
            </div>

            <h1 className="text-3xl font-extrabold text-slate-900">{assembly.title}</h1>
            <p className="text-slate-600 leading-relaxed text-lg max-w-3xl">
              {assembly.description || 'Nenhum detalhe adicional fornecido.'}
            </p>
          </div>

          <div className="w-full md:w-auto shrink-0 flex flex-col gap-3">
            {assembly.status === 'IN_PROGRESS' && assembly.meetingUrl && (
              <a 
                href={assembly.meetingUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all transform hover:-translate-y-0.5"
              >
                <Video className="w-5 h-5" /> Entrar na Videoconferência
              </a>
            )}
            
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-center">
              <div className="text-2xl font-bold text-slate-800">
                {assembly.status === 'FINISHED' ? 'Encerrada' : 'Em andamento'}
              </div>
              <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-semibold flex items-center justify-center gap-1">
                <Users className="w-3 h-3" /> Presença registrada
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pauta e Votação */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-indigo-600" />
            Itens de Votação
          </h2>

          {assembly.votingItems.map((item) => {
            const itemResults = results?.find((r: any) => r.id === item.id);
            const totalItemVotes = itemResults?.totalVotes || 0;
            const hasVoted = !!selectedVotes[item.id];

            return (
              <div key={item.id} className="bg-white rounded-2xl border p-6 space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
                  {item.description && <p className="text-sm text-slate-500 mt-1">{item.description}</p>}
                </div>

                <div className="space-y-3 pt-2">
                  {item.options.map((option) => {
                    const result = itemResults?.results?.find((r: any) => r.id === option.id);
                    const voteCount = result?.votes || 0;
                    const percentage = totalItemVotes > 0 ? Math.round((voteCount / totalItemVotes) * 100) : 0;
                    const isSelected = selectedVotes[item.id] === option.id;

                    return (
                      <div key={option.id} className="relative group">
                        <button
                          disabled={assembly.status !== 'IN_PROGRESS' || hasVoted}
                          onClick={() => handleVote(item.id, option.id)}
                          className={`w-full relative z-10 flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                            isSelected 
                              ? 'border-indigo-600 bg-indigo-50/30' 
                              : 'border-slate-100 hover:border-indigo-200 bg-white'
                          } ${hasVoted && !isSelected ? 'opacity-70 grayscale' : ''}`}
                        >
                          <span className="font-medium text-slate-700">{option.text}</span>
                          {isSelected && <CheckCircle2 className="w-5 h-5 text-indigo-600" />}
                          {!hasVoted && assembly.status === 'IN_PROGRESS' && (
                            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                          )}
                        </button>
                        
                        {/* Progress bar background for results */}
                        {(assembly.status === 'IN_PROGRESS' || assembly.status === 'FINISHED') && (
                          <div className="absolute inset-0 z-0 p-0.5 pointer-events-none">
                            <div 
                              className="h-full bg-slate-100/50 rounded-lg transition-all duration-1000" 
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        )}
                        
                        {(assembly.status === 'IN_PROGRESS' || assembly.status === 'FINISHED') && (
                          <div className="flex justify-end mt-1 px-1">
                             <span className="text-[10px] font-bold text-slate-400 uppercase">
                               {voteCount} votos ({percentage}%)
                             </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {hasVoted && assembly.status === 'IN_PROGRESS' && (
                  <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                    <Save className="w-3 h-3" /> Seu voto foi registrado com sucesso.
                  </p>
                )}
              </div>
            );
          })}

          {assembly.votingItems.length === 0 && (
            <div className="bg-slate-50 border-2 border-dashed rounded-2xl p-12 text-center text-slate-400">
              <Lock className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>Esta assembleia não possui itens para votação.</p>
            </div>
          )}
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border p-6 space-y-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              Status Geral
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Início</span>
                <span className="font-semibold">{new Date(assembly.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Status</span>
                <span className="font-semibold text-indigo-600">
                  {assembly.status === 'IN_PROGRESS' ? 'Em andamento' : 'Programada'}
                </span>
              </div>
              <hr />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 uppercase font-bold">Total de Itens</p>
                  <p className="text-2xl font-black text-indigo-600">{assembly.votingItems.length}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400 uppercase font-bold">Votos Totais</p>
                  <p className="text-2xl font-black text-slate-800">
                    {results?.reduce((acc: number, item: any) => acc + item.totalVotes, 0) || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-6 text-white shadow-lg shadow-indigo-100">
             <Clock className="w-8 h-8 mb-3 opacity-50" />
             <h4 className="font-bold text-lg mb-2">Lembrete Importante</h4>
             <p className="text-indigo-100 text-sm leading-relaxed">
               As discussões seguem a ordem da pauta. Favor manter o microfone desligado enquanto não estiver com a palavra no vídeo.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}
