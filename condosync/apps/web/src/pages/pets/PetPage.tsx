import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/services/api';
import { 
  Plus, Search, Loader2, Pencil, Trash2, 
  Dog, Cat, Heart, Calendar, Info, X
} from 'lucide-react';

const emptyPetForm = {
  name: '',
  type: 'Cachorro',
  breed: '',
  size: 'Médio',
  gender: 'Macho',
  color: '',
  notes: '',
  unitId: ''
};

export default function PetPage() {
  const { selectedCondominiumId: condominiumId, user } = useAuthStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [form, setForm] = useState({ ...emptyPetForm });

  const isAdmin = ['CONDOMINIUM_ADMIN', 'SYNDIC', 'SUPER_ADMIN'].includes(user?.role || '');

  const { data: pets, isLoading } = useQuery({
    queryKey: ['pets', condominiumId],
    queryFn: async () => {
      const res = await api.get(`/pets/condominium/${condominiumId}`);
      return res.data.pets;
    },
    enabled: !!condominiumId,
  });

  const { data: units } = useQuery({
    queryKey: ['units', condominiumId],
    queryFn: async () => {
      const res = await api.get(`/units/condominium/${condominiumId}`);
      return res.data.data.units;
    },
    enabled: !!condominiumId && showModal,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/pets', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pets'] });
      setShowModal(false);
      setForm({ ...emptyPetForm });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.patch(`/pets/${editTarget.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pets'] });
      setEditTarget(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/pets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pets'] });
      setDeleteTarget(null);
    },
  });

  const filteredPets = (pets || []).filter((p: any) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.unit?.identifier ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const openEdit = (pet: any) => {
    setEditTarget(pet);
    setForm({
      name: pet.name,
      type: pet.type,
      breed: pet.breed || '',
      size: pet.size || 'Médio',
      gender: pet.gender || 'Macho',
      color: pet.color || '',
      notes: pet.notes || '',
      unitId: pet.unitId
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Meus Pets</h1>
          <p className="text-sm text-slate-500">Gestão de animais de estimação do condomínio</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Registrar Pet
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          placeholder="Buscar por nome ou unidade..." 
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" 
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : filteredPets.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed p-12 text-center text-slate-400">
          <Dog className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p>Nenhum pet encontrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPets.map((pet: any) => (
            <div key={pet.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col">
              <div className="p-5 flex-1 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                      {pet.type === 'Cachorro' ? <Dog className="w-6 h-6" /> : pet.type === 'Gato' ? <Cat className="w-6 h-6" /> : <Heart className="w-6 h-6" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 leading-tight">{pet.name}</h3>
                      <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">{pet.type} {pet.breed ? `• ${pet.breed}` : ''}</p>
                    </div>
                  </div>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-lg font-bold">
                    Unid. {pet.unit?.identifier}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-2 rounded-lg">
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-tighter">Porte</p>
                    <p className="text-xs font-bold text-slate-700">{pet.size || '—'}</p>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg">
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-tighter">Gênero</p>
                    <p className="text-xs font-bold text-slate-700">{pet.gender || '—'}</p>
                  </div>
                </div>

                {pet.notes && (
                  <div className="flex gap-2">
                    <Info className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-500 italic line-clamp-2">{pet.notes}</p>
                  </div>
                )}
              </div>

              <div className="px-5 py-3 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-2">
                <button 
                  onClick={() => openEdit(pet)}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setDeleteTarget(pet)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Cadastro/Edição */}
      {(showModal || editTarget) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">
                {editTarget ? 'Editar Pet' : 'Registrar Novo Pet'}
              </h2>
              <button onClick={() => { setShowModal(false); setEditTarget(null); setForm({...emptyPetForm}); }} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[70vh] space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nome *</label>
                  <input 
                    value={form.name} 
                    onChange={(e) => setForm({ ...form, name: e.target.value })} 
                    className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo *</label>
                  <select 
                    value={form.type} 
                    onChange={(e) => setForm({ ...form, type: e.target.value })} 
                    className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Cachorro">Cachorro</option>
                    <option value="Gato">Gato</option>
                    <option value="Pássaro">Pássaro</option>
                    <option value="Peixe">Peixe</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Raça</label>
                  <input value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} className="w-full px-3 py-2 border rounded-xl text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Porte</label>
                  <select value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} className="w-full px-3 py-2 border rounded-xl text-sm">
                    <option value="Pequeno">Pequeno</option>
                    <option value="Médio">Médio</option>
                    <option value="Grande">Grande</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gênero</label>
                   <div className="flex gap-2">
                     <button 
                       onClick={() => setForm({...form, gender: 'Macho'})}
                       className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${form.gender === 'Macho' ? 'bg-blue-100 text-blue-700 border-2 border-blue-200' : 'bg-slate-50 text-slate-400 border-2 border-transparent'}`}
                     >
                       Macho
                     </button>
                     <button 
                       onClick={() => setForm({...form, gender: 'Fêmea'})}
                       className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${form.gender === 'Fêmea' ? 'bg-pink-100 text-pink-700 border-2 border-pink-200' : 'bg-slate-50 text-slate-400 border-2 border-transparent'}`}
                     >
                       Fêmea
                     </button>
                   </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cor Predominante</label>
                  <input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-full px-3 py-2 border rounded-xl text-sm" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Unidade *</label>
                <select 
                  value={form.unitId} 
                  onChange={(e) => setForm({ ...form, unitId: e.target.value })} 
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Selecione a unidade...</option>
                  {(units || []).map((u: any) => (
                    <option key={u.id} value={u.id}>{u.identifier}{u.block ? ` / ${u.block}` : ''}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Observações (Alergias, Comportamento, etc.)</label>
                <textarea 
                  value={form.notes} 
                  onChange={(e) => setForm({ ...form, notes: e.target.value })} 
                  rows={3}
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500" 
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t flex gap-3">
              <button 
                onClick={() => { setShowModal(false); setEditTarget(null); setForm({...emptyPetForm}); }}
                className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                Cancelar
              </button>
              <button 
                onClick={() => editTarget ? updateMutation.mutate({ body: form }) : createMutation.mutate({ body: form })}
                disabled={!form.name || !form.unitId || createMutation.isPending || updateMutation.isPending}
                className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 disabled:opacity-50 transition-all"
              >
                {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : 'Salvar Pet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Deleção */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-800">Remover Pet</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Tem certeza que deseja remover <span className="font-bold text-slate-900">{deleteTarget.name}</span>? 
              Ele não aparecerá mais na lista ativa.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2 border rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
              <button onClick={() => deleteMutation.mutate(deleteTarget.id)} className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-sm font-bold">Remover</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
