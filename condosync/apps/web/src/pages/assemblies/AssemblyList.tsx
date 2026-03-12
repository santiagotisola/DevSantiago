import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { Link } from 'react-router-dom';
import { Video, Calendar, Eye, Loader2 } from 'lucide-react';

interface Assembly {
  id: string;
  title: string;
  description: string | null;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELED';
  scheduledAt: string;
  meetingUrl: string | null;
}

export default function AssemblyList() {
  const { selectedCondominiumId: condominiumId, user } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['assemblies', condominiumId],
    queryFn: async () => {
      const res = await api.get(`/assemblies/condominium/${condominiumId}`);
      return res.data;
    },
    enabled: !!condominiumId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const assemblies: Assembly[] = data?.assemblies || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Assembleias Virtuais</h1>
          <p className="text-sm text-slate-500">Participe das decisões do seu condomínio</p>
        </div>
        {(user?.role === 'SUPER_ADMIN' || user?.role === 'CONDOMINIUM_ADMIN' || user?.role === 'SYNDIC') && (
          <button 
            onClick={() => alert('Abrir modal de Nova Assembleia (Em Desenvolvimento)')}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Calendar className="w-4 h-4" />
            Nova Assembleia
          </button>
        )}
      </div>

      {assemblies.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center text-slate-500">
          <Video className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p>Nenhuma assembleia agendada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assemblies.map((assembly) => (
            <div key={assembly.id} className="bg-white rounded-xl border relative overflow-hidden transition-all hover:shadow-md flex flex-col">
              <div 
                className={`absolute top-0 left-0 w-1.5 h-full ${
                  assembly.status === 'IN_PROGRESS' ? 'bg-indigo-500' :
                  assembly.status === 'SCHEDULED' ? 'bg-slate-300' : 'bg-green-500'
                }`}
              />
              <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-slate-900 leading-tight">{assembly.title}</h3>
                </div>
                <div className="flex items-center text-sm text-slate-500 mb-4">
                  <Calendar className="w-4 h-4 mr-2" />
                  {new Date(assembly.scheduledAt).toLocaleString('pt-BR')}
                </div>
                <p className="text-sm text-slate-600 line-clamp-2">
                  {assembly.description || 'Sem descrição'}
                </p>
              </div>
              
              <div className="px-5 py-4 bg-slate-50 border-t flex items-center justify-between">
                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                  assembly.status === 'IN_PROGRESS' ? 'bg-indigo-100 text-indigo-700' :
                  assembly.status === 'SCHEDULED' ? 'bg-slate-200 text-slate-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {assembly.status === 'IN_PROGRESS' ? 'Em Andamento' : 
                   assembly.status === 'SCHEDULED' ? 'Agendada' : 'Finalizada'}
                </span>
                
                <div className="flex items-center gap-2">
                  {assembly.status === 'IN_PROGRESS' && assembly.meetingUrl && (
                    <a 
                      href={assembly.meetingUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                    >
                      <Video className="w-3.5 h-3.5" /> Entrar
                    </a>
                  )}
                  <Link 
                    to={`/assembleias/${assembly.id}`}
                    className="inline-flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" /> Detalhes
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
