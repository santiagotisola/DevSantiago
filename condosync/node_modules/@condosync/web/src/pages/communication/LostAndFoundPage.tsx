import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/services/api';
import { 
  Plus, Search, Loader2, Package, Clock, 
  CheckCircle2, AlertCircle, MapPin, Tag, 
  Trash2, Filter, X
} from 'lucide-react';

const emptyItemForm = {
  title: '',
  description: '',
  category: 'Geral',
  place: '',
  status: 'FOUND' as 'LOST' | 'FOUND',
};

export default function LostAndFoundPage() {
  const { selectedCondominiumId: condominiumId, user } = useAuthStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [form, setForm] = useState({ ...emptyItemForm });

  const isAdmin = ['CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'].includes(user?.role || '');

  const { data, isLoading } = useQuery({
    queryKey: ['lost-and-found', condominiumId],
    queryFn: async () => {
      const res = await api.get(`/lost-and-found/condominium/${condominiumId}`);
      return res.data;
    },
    enabled: !!condominiumId,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post(`/lost-and-found/condominium/${condominiumId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lost-and-found'] });
      setShowModal(false);
      setForm({ ...emptyItemForm });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, returnedTo }: any) => 
      api.patch(`/lost-and-found/${id}`, { status, returnedTo, returnedAt: new Date().toISOString() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lost-and-found'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/lost-and-found/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lost-and-found'] });
    },
  });

  const items = data?.items || [];
  const filteredItems = items.filter((item: any) => {
    const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = statusFilter === 'ALL' || item.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  const handleReturn = (id: string) => {
    const person = prompt('Nome da pessoa que está retirando o item:');
    if (person) {
      updateStatusMutation.mutate({ id, status: 'RETURNED', returnedTo: person });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Achados e Perdidos</h1>
          <p className="text-sm text-slate-500">Gestão de objetos perdidos nas dependências do condomínio</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-100"
        >
          <Plus className="w-4 h-4" />
          Novo Registro
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            placeholder="Buscar por item..." 
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 bg-white" 
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border-slate-200 rounded-xl text-sm py-2 px-3 focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="ALL">Todos os status</option>
            <option value="LOST">Perdidos</option>
            <option value="FOUND">Achados</option>
            <option value="RETURNED">Devolvidos</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed p-12 text-center text-slate-400">
          <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p>Nenhum item registrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item: any) => (
            <div key={item.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col group">
              <div className="p-5 flex-1 space-y-4">
                <div className="flex justify-between items-start">
                  <span className={`px-2 py-1 text-[10px] font-black uppercase tracking-widest rounded-md ${
                    item.status === 'FOUND' ? 'bg-green-100 text-green-700' :
                    item.status === 'LOST' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {item.status === 'FOUND' ? 'Achado' : item.status === 'LOST' ? 'Perdido' : 'Devolvido'}
                  </span>
                  <div className="flex items-center text-[11px] text-slate-400 font-medium">
                    <Clock className="w-3 h-3 mr-1" />
                    {new Date(item.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{item.title}</h3>
                  <p className="text-sm text-slate-500 line-clamp-2 mt-1 italic">
                    {item.description || 'Sem descrição.'}
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="flex items-center text-xs text-slate-600 gap-2">
                    <Tag className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-medium">{item.category}</span>
                  </div>
                  <div className="flex items-center text-xs text-slate-600 gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-medium text-slate-700">{item.place || 'Local não informado'}</span>
                  </div>
                </div>

                {item.status === 'RETURNED' && (
                  <div className="p-2 bg-indigo-50/50 rounded-lg border border-indigo-100/50 mt-2">
                    <p className="text-[10px] uppercase font-black text-indigo-400 tracking-tighter">Retirado por</p>
                    <p className="text-xs font-bold text-indigo-700">{item.returnedTo}</p>
                  </div>
                )}
              </div>

              <div className="px-5 py-3 border-t flex justify-between items-center bg-slate-50/50">
                {item.status !== 'RETURNED' ? (
                  <button 
                    onClick={() => handleReturn(item.id)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Registrar Retirada
                  </button>
                ) : (
                  <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5 italic">
                    <CheckCircle2 className="w-4 h-4" /> Item Devolvido
                  </span>
                )}

                {isAdmin && (
                  <button 
                    onClick={() => window.confirm('Deletar este registro?') && deleteMutation.mutate(item.id)}
                    className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Novo Registro */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">Novo Registro</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status *</label>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setForm({...form, status: 'FOUND'})}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all ${form.status === 'FOUND' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-400 border-transparent'}`}
                    >
                      Achado
                    </button>
                    <button 
                      onClick={() => setForm({...form, status: 'LOST'})}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all ${form.status === 'LOST' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-400 border-transparent'}`}
                    >
                      Perdido
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Título *</label>
                  <input 
                    value={form.title} 
                    onChange={(e) => setForm({ ...form, title: e.target.value })} 
                    placeholder="Ex: Molho de chaves"
                    className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Categoria *</label>
                  <select 
                    value={form.category} 
                    onChange={(e) => setForm({ ...form, category: e.target.value })} 
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  >
                    <option value="Geral">Geral</option>
                    <option value="Eletrônico">Eletrônico</option>
                    <option value="Chaves">Chaves</option>
                    <option value="Documentos">Documentos</option>
                    <option value="Vestuário">Vestuário</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Onde?</label>
                  <input 
                    value={form.place} 
                    onChange={(e) => setForm({ ...form, place: e.target.value })} 
                    placeholder="Ex: Estacionamento, Bloco A"
                    className="w-full px-3 py-2 border rounded-xl text-sm" 
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Descrição Detalhada</label>
                <textarea 
                  value={form.description} 
                  onChange={(e) => setForm({ ...form, description: e.target.value })} 
                  rows={4}
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500" 
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t flex gap-3">
              <button 
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100"
                disabled={createMutation.isPending}
              >
                Cancelar
              </button>
              <button 
                onClick={() => createMutation.mutate({ body: form })}
                disabled={!form.title || createMutation.isPending}
                className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 disabled:opacity-50"
              >
                {createMutation.isPending ? 'Salvando...' : 'Salvar Registro'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
